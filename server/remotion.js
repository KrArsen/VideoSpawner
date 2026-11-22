// Remotion projects in VideoSpawner: a live preview with no render, exact frame pictures for notes, a final render.
//
// How: the project is bundled with its OWN @remotion/bundler (remotion-runner.cjs) into <project>/.vs-remotion/bundle.
// That bundle is the page Remotion's renderer drives; for each composition VideoSpawner writes a copy of its
// index.html (vs-<id>.html) with two small scripts around bundle.js that do what the renderer does
// (setBundleMode → calculateComposition → setFrame) and expose VideoSpawner's contract: window.renderOut(t) shows
// the frame at t, window.READY. The live preview, frame stepping and notes then work as for any VideoSpawner film.
// When the project's code changes, the bundle is rebuilt (webpack cache: seconds) and the open preview reloads.
// The public folder is linked, not copied (a project's public folder can hold gigabytes of media).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { HUB_DIR, TEMP, readJson, writeJson, TOOLS } from './util.js';
import { findBrowser } from './platform.js';
import { readMeta } from './legacy.js';
import { vhDir } from './notes.js';

const RUNNER = path.join(HUB_DIR, 'server', 'remotion-runner.cjs');
const BUNDLE = p => path.join(p.path, '.vs-remotion', 'bundle');
const metaFile = p => path.join(vhDir(p), 'project.json');
const bad = (msg, code = 400) => Object.assign(new Error(msg), { code });

export function isRemotion(dir) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).includes('remotion');
  } catch { return false; }
}
// the entry file: the one the project's scripts pass to "remotion studio/render", else the usual places
export function entryOf(dir) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    for (const s of Object.values(pkg.scripts || {})) { const m = /remotion\s+(?:studio|render|preview|still)\s+([^\s]+\.(?:tsx?|jsx?))/.exec(s); if (m && fs.existsSync(path.join(dir, m[1]))) return m[1]; }
  } catch { }
  for (const f of ['src/index.ts', 'src/index.tsx', 'src/index.js', 'src/index.jsx', 'remotion/index.ts', 'remotion/index.tsx']) if (fs.existsSync(path.join(dir, f))) return f;
  return null;
}

// ---------- the page around the bundle
const pre = `<script>/* VideoSpawner: behave like Remotion's renderer page (no Studio UI) */
window.remotion_puppeteerTimeout = 60000; window.remotion_isMainTab = true; window.remotion_inputProps = '{}'; window.remotion_envVariables = '{}';
window.remotion_initialFrame = 0; window.remotion_attempt = 1; window.remotion_logLevel = 'warn'; window.remotion_mediaCacheSizeInBytes = 1e9; window.remotion_initialMemoryAvailable = 4e9;
document.documentElement.style.background = '#000'; document.documentElement.style.overflow = 'hidden';</script>`;
const post = id => `<script>/* VideoSpawner: window.renderOut(t) for the live preview */
(function () {
  var COMP = ${JSON.stringify(id)}, fps = 30, last = -1, attempt = 1, total = 1;
  function until(test) { return new Promise(function (ok) { (function check() { if (test()) ok(); else setTimeout(check, 30); })(); }); }
  (async function () {
    await until(function () { return window.remotion_setBundleMode; });
    window.remotion_setBundleMode({ type: 'evaluation' });
    await until(function () { return window.remotion_calculateComposition && window.remotion_renderReady === true; }).catch(function () {});
    var c = await window.remotion_calculateComposition(COMP);
    fps = c.fps; total = c.durationInFrames;
    window.remotion_setBundleMode({ type: 'composition', compositionName: COMP, serializedResolvedPropsWithSchema: c.serializedResolvedPropsWithCustomSchema,
      compositionDurationInFrames: c.durationInFrames, compositionFps: c.fps, compositionHeight: c.height, compositionWidth: c.width,
      compositionDefaultCodec: c.defaultCodec, compositionDefaultOutName: c.defaultOutName, compositionDefaultVideoImageFormat: c.defaultVideoImageFormat,
      compositionDefaultPixelFormat: c.defaultPixelFormat, compositionDefaultProResProfile: c.defaultProResProfile, compositionDefaultSampleRate: c.defaultSampleRate });
    window.VS_REMOTION = { composition: COMP, fps: c.fps, frames: c.durationInFrames, width: c.width, height: c.height };
    window.__config = { width: c.width, height: c.height, fps: c.fps, duration: c.durationInFrames / c.fps };   // the player trusts this before any canvas on the page
    window.renderOut = function (t) {
      var f = Math.max(0, Math.min(total - 1, Math.round(t * fps)));
      if (f === last) return; last = f; window.remotion_setFrame(f, COMP, attempt++);
    };
    window.renderOut(0);
    await until(function () { return window.remotion_renderReady === true; });
    window.READY = true;
  })().catch(function (e) { window.VS_REMOTION_ERROR = String(e && e.message || e); console.error('VideoSpawner/Remotion:', e); });
})();</script>`;

function writePages(p, comps) {
  const dir = BUNDLE(p), html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const at = html.indexOf('<script src="./bundle.js"></script>');
  if (at < 0) throw new Error('This Remotion version writes an index.html VideoSpawner does not know (no ./bundle.js script).');
  for (const c of comps) if (!c.still) fs.writeFileSync(path.join(dir, `vs-${c.id}.html`), html.slice(0, at) + pre + html.slice(at).replace('<script src="./bundle.js"></script>', '<script src="./bundle.js"></script>' + post(c.id)));
}
// <bundle>/public → <project>/public: a directory junction on Windows (no admin rights needed), a symlink elsewhere
function linkPublic(p) {
  const link = path.join(BUNDLE(p), 'public'), target = path.join(p.path, 'public');
  try { fs.rmSync(link, { recursive: false, force: true }); } catch { }
  try { const st = fs.lstatSync(link); if (st.isDirectory() && !st.isSymbolicLink()) fs.rmSync(link, { recursive: true, force: true }); } catch { }
  if (fs.existsSync(target)) fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
}

// ---------- build (one at a time per project), status
const state = new Map();   // project id → { building, error, builtAt, ms }
export function status(p) {
  const s = state.get(p.id) || {}, meta = readMeta(metaFile(p), {});
  const comps = readJson(path.join(BUNDLE(p), 'compositions.json'), null);
  return { remotion: isRemotion(p.path), entry: entryOf(p.path), built: !!comps, compositions: comps || [], composition: meta.remotion?.composition || null,
    building: !!s.building, error: s.error || null, builtAt: s.builtAt || null, ms: s.ms || null };
}
export function build(p) {
  const s = state.get(p.id) || {}; state.set(p.id, s);
  if (s.building) { s.again = true; return s.building; }
  const entry = entryOf(p.path); if (!entry) throw bad('No Remotion entry file found (src/index.ts or the file in "remotion studio <file>").');
  s.error = null;
  s.building = new Promise(resolve => {
    const empty = path.join(TEMP, 'videospawner-empty-public');
    const child = spawn(TOOLS.node || process.execPath, [RUNNER, p.path, entry, BUNDLE(p), empty, findBrowser()?.path || ''], { cwd: p.path, windowsHide: true });
    let out = ''; child.stdout.on('data', d => { out += d; }); child.stderr.on('data', d => { out += d; });
    child.on('close', () => {
      const line = out.trim().split('\n').pop(); let r = null; try { r = JSON.parse(line); } catch { }
      if (r?.ok) { try { writePages(p, r.compositions); linkPublic(p); s.builtAt = Date.now(); s.ms = r.ms; } catch (e) { s.error = e.message; } }
      else s.error = r?.error || out.slice(-600) || 'The build failed.';
      s.building = null; resolve(status(p));
      if (s.again) { s.again = false; build(p); }
    });
  });
  return s.building;
}
// rebuild when the code changes (src/, the entry's folder, remotion.config): the open preview then reloads by itself,
// because the new bundle files land in a folder the live preview watches
const watchers = new Map();
export function watchCode(p) {
  if (watchers.has(p.id)) return;
  let timer = null;
  try {
    const w = fs.watch(p.path, { recursive: true }, (ev, name) => {
      if (!name || /(^|[\\/])(node_modules|\.vs-remotion|\.videospawner|out|build|\.git|render)([\\/]|$)/i.test(name)) return;
      if (!/\.(tsx?|jsx?|mjs|css|json)$/i.test(name)) return;
      clearTimeout(timer); timer = setTimeout(() => build(p).catch(() => { }), 700);
    });
    w.on('error', () => watchers.delete(p.id)); watchers.set(p.id, w);
  } catch { }
}

// pick the composition the live preview plays: its page, length, fps and size go to the project's live settings
export function select(p, id) {
  const comp = status(p).compositions.find(c => c.id === id);
  if (!comp) throw bad(`No composition "${id}" in this project (build it first).`);
  if (comp.still) throw bad(`"${id}" is a still, not a video.`);
  const meta = readMeta(metaFile(p), {});
  meta.remotion = { composition: comp.id, entry: entryOf(p.path) };
  meta.live = { ...(meta.live || {}), audio: false, page: `.vs-remotion/bundle/vs-${comp.id}.html`, fps: comp.fps, dur: +(comp.durationInFrames / comp.fps).toFixed(3), w: comp.width, h: comp.height };
  meta.render = { ...(meta.render || {}), env: { ...(meta.render?.env || {}), DUR: String(meta.live.dur) } };
  fs.mkdirSync(vhDir(p), { recursive: true }); writeJson(metaFile(p), meta);
  watchCode(p);
  return status(p);
}

// ---------- exact frame pictures for notes: the same page in headless Chrome/Edge, at the note's frame
let browserP = null;
async function browser() {
  if (browserP) { const b = await browserP.catch(() => null); if (b?.connected) return b; }
  const { default: puppeteer } = await import('puppeteer-core');
  browserP = puppeteer.launch({ executablePath: findBrowser()?.path, headless: true, args: ['--hide-scrollbars', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] });
  const b = await browserP; setTimeout(() => { b.close().catch(() => { }); browserP = null; }, 10 * 60e3).unref?.();   // a warm browser for 10 minutes of notes
  return b;
}
export async function still(p, t, file, port) {
  const meta = readMeta(metaFile(p), {}); if (!meta.remotion?.composition || !meta.live?.page) return null;
  const b = await browser(), page = await b.newPage();
  try {
    await page.setViewport({ width: meta.live.w || 1920, height: meta.live.h || 1080 });
    await page.goto(`http://127.0.0.1:${port}/live/${p.id}/${meta.live.page}`, { waitUntil: 'load', timeout: 60e3 });
    await page.waitForFunction('window.READY === true || window.VS_REMOTION_ERROR', { timeout: 60e3 });
    await page.evaluate(tt => { window.remotion_renderReady = false; window.renderOut(tt); }, t);
    await page.waitForFunction('window.remotion_renderReady === true', { timeout: 60e3 });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file, type: 'jpeg', quality: 90, clip: { x: 0, y: 0, width: meta.live.w || 1920, height: meta.live.h || 1080 } });
    return file;
  } finally { page.close().catch(() => { }); }
}

// ---------- the final render: Remotion's own renderer through VideoSpawner's queue (one at a time, protected)
export function renderCommand(p) {
  const meta = readMeta(metaFile(p), {}), comp = meta.remotion?.composition; if (!comp) throw bad('Choose a composition first.');
  const entry = meta.remotion.entry || entryOf(p.path), stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const out = `out/${comp}-${stamp}.mp4`;
  return { cmd: `npx remotion render "${entry}" ${comp} "${out}"`, output: out };
}

export function routes(route, readBody, { project, createJob, approveJob }) {
  const need = id => { const p = project(id); if (!p) throw bad('Project not found', 404); if (!isRemotion(p.path)) throw bad('This is not a Remotion project.'); return p; };
  route('GET', '/api/project/:id/remotion', (req, url, { id }) => { const p = project(id); return p ? status(p) : { remotion: false }; });
  route('POST', '/api/project/:id/remotion/build', async (req, url, { id }) => { const p = need(id); const r = await build(p); if (r.composition) watchCode(p); return r; });
  route('POST', '/api/project/:id/remotion/select', async (req, url, { id }) => { const b = await readBody(req); return select(need(id), String(b.composition || '')); });
  // the user pressed "Render final" for this composition: the command is VideoSpawner's own, so it needs no second approval
  route('POST', '/api/project/:id/remotion/render', async (req, url, { id }) => {
    const p = need(id), c = renderCommand(p);
    const job = await createJob({ project: p.id, mode: 'command', cmd: c.cmd, output: c.output });
    if (job.needsApproval) approveJob(job.id);
    return { ...job, needsApproval: false, cmd: c.cmd, output: c.output };
  });
}
