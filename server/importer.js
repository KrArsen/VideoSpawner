// "Import project" on the Films page: add a folder the user already has as a watched folder, with the right type.
// A film folder (code, a render script, a Remotion project or videos of one film) becomes a single project; a folder
// whose sub-folders are films becomes a container; a folder of finished videos becomes a media folder.
import fs from 'node:fs';
import path from 'node:path';
import { config, saveConfig } from './config.js';
import { isInside, norm, HOME, TEMP, HUB_DIR } from './util.js';

const VIDEO = /\.(mp4|mov|webm|mkv)$/i;
const FILM_FILES = /^(render\.(m?js|py)|index\.html|film\.js|film\.data\.js|videospawner-project\.json|make\.mjs)$/i;
const SKIP = new Set(['node_modules', '.git', '.videospawner', '.videospawner-trash']);

const readJsonSafe = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
function remotionOf(dir) {
  const pkg = readJsonSafe(path.join(dir, 'package.json'));
  const deps = pkg ? { ...pkg.dependencies, ...pkg.devDependencies } : {};
  return Object.keys(deps).some(k => k === 'remotion' || k.startsWith('@remotion/'));
}
const looksLikeFilm = (dir, names) => names.some(n => FILM_FILES.test(n)) || names.includes('.videospawner') || remotionOf(dir);

// what a folder is: { type: 'project' | 'container' | 'media', kind, films, videos }
export function classifyFolder(dir) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { throw Object.assign(new Error('Cannot open this folder: ' + e.message), { code: 400 }); }
  const names = ents.map(e => e.name);
  const videos = ents.filter(e => e.isFile() && VIDEO.test(e.name)).length;
  const remotion = remotionOf(dir);
  if (looksLikeFilm(dir, names)) return { type: 'project', kind: remotion ? 'remotion' : 'code', films: 1, videos };
  // sub-folders that are films themselves
  let films = 0;
  for (const e of ents) {
    if (!e.isDirectory() || SKIP.has(e.name) || e.name.startsWith('.')) continue;
    const sub = path.join(dir, e.name);
    let inner = []; try { inner = fs.readdirSync(sub); } catch { continue; }
    if (looksLikeFilm(sub, inner) || inner.some(n => VIDEO.test(n))) films++;
  }
  if (films) return { type: 'container', kind: 'films', films, videos };
  if (videos) return { type: 'media', kind: 'videos', films: 0, videos };
  return { type: 'container', kind: 'empty', films: 0, videos: 0 };
}

const MESSAGE = {
  remotion: 'Remotion project added. Its rendered videos show up here for notes; the live preview needs a page with window.renderOut(t).',
  code: 'Film project added.',
  films: n => `Folder with ${n} film${n === 1 ? '' : 's'} added.`,
  videos: n => `Video folder added (${n} video${n === 1 ? '' : 's'}).`,
  empty: 'Folder added. Films you put in it will show up here.',
};

export function importFolder(folder) {
  const dir = path.resolve(String(folder || '').trim());
  if (!folder || !path.isAbsolute(String(folder).trim())) throw Object.assign(new Error('Choose a folder (an absolute path).'), { code: 400 });
  let st; try { st = fs.statSync(dir); } catch { throw Object.assign(new Error('This folder does not exist.'), { code: 400 }); }
  if (!st.isDirectory()) throw Object.assign(new Error('This is a file, not a folder.'), { code: 400 });
  if (path.parse(dir).root === dir) throw Object.assign(new Error('A whole drive cannot be imported: choose the project folder.'), { code: 400 });
  const roots = config().roots || [];
  const same = roots.find(r => norm(r.path) === norm(dir));
  if (same) {
    if (same.enabled === false) { saveConfig({ roots: roots.map(r => r === same ? { ...r, enabled: true } : r) }); return { added: true, type: same.type, path: dir, message: 'Folder switched back on.' }; }
    return { added: false, type: same.type, path: dir, message: 'This folder is already in VideoSpawner.' };
  }
  // already visible through a watched folder: a film directly inside a container root
  const parent = roots.find(r => r.enabled !== false && r.type === 'container' && norm(path.dirname(dir)) === norm(r.path));
  if (parent) return { added: false, type: 'project', path: dir, message: 'This film is already listed (it is inside a watched folder).' };
  if (roots.some(r => r.enabled !== false && isInside(r.path, dir))) throw Object.assign(new Error('This folder contains a folder VideoSpawner already watches: import the film folder itself.'), { code: 400 });
  const c = classifyFolder(dir);
  saveConfig({ roots: [...roots, { path: dir, type: c.type, enabled: true }] });
  const m = MESSAGE[c.kind];
  return { added: true, type: c.type, kind: c.kind, path: dir, message: typeof m === 'function' ? m(c.kind === 'videos' ? c.videos : c.films) : m };
}

// The folders the user worked in with Claude Code (~/.claude/projects/<folder>/<session>.jsonl): for each project its
// working folder (the "cwd" of its newest session), when it was last used, how many sessions it has, what kind of
// folder it is and whether VideoSpawner already lists it. Only the first 64 KB of one session file per project is read,
// for the cwd; prompts and answers are not read.
export function claudeProjects({ home = HOME, limit = 120, skip = [TEMP, HUB_DIR] } = {}) {
  const base = path.join(home, '.claude', 'projects');
  let dirs = []; try { dirs = fs.readdirSync(base, { withFileTypes: true }).filter(e => e.isDirectory()); } catch { return []; }
  const roots = (config().roots || []).filter(r => r.enabled !== false);
  const seen = new Map();
  for (const d of dirs) {
    const dir = path.join(base, d.name);
    let files = []; try { files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).map(f => { const p = path.join(dir, f); try { return { p, m: fs.statSync(p).mtimeMs }; } catch { return null; } }).filter(Boolean); } catch { continue; }
    if (!files.length) continue;
    files.sort((a, b) => b.m - a.m);
    let cwd = null;
    for (const f of files.slice(0, 3)) {
      try {
        const fd = fs.openSync(f.p, 'r'), buf = Buffer.alloc(64 << 10), n = fs.readSync(fd, buf, 0, buf.length, 0); fs.closeSync(fd);
        const m = /"cwd":("(?:[^"\\]|\\.)*")/.exec(buf.subarray(0, n).toString('utf8'));
        if (m) { cwd = JSON.parse(m[1]); break; }
      } catch { }
    }
    if (!cwd || !path.isAbsolute(cwd) || !fs.existsSync(cwd) || path.parse(cwd).root === path.resolve(cwd)) continue;
    if (skip.some(d => isInside(cwd, d)) || isInside(HUB_DIR, cwd) || norm(cwd) === norm(home)) continue;   // temp, VideoSpawner itself, the home folder
    if (process.env.SystemRoot && isInside(cwd, process.env.SystemRoot)) continue;   // a chat opened in the Windows folder
    const key = norm(cwd), prev = seen.get(key);
    if (prev) { prev.sessions += files.length; prev.lastActive = Math.max(prev.lastActive, files[0].m); continue; }
    let info; try { info = classifyFolder(cwd); } catch { continue; }
    const listed = roots.some(r => norm(r.path) === key || (r.type === 'container' && norm(path.dirname(cwd)) === norm(r.path)) || isInside(cwd, r.path));
    seen.set(key, { path: cwd, name: path.basename(cwd), lastActive: files[0].m, sessions: files.length, type: info.type, kind: info.kind, films: info.films, videos: info.videos, listed });
  }
  return [...seen.values()].sort((a, b) => b.lastActive - a.lastActive).slice(0, limit);
}

// The Claude Code chats that worked in a project's folder (or below it), newest first: id, title (the chat's own
// name, from its custom-title record), working folder, last use. Read: the first 64 KB of each chat file (cwd) and its
// last 256 KB (the newest title). Prompt and answer text is never put in the result.
const slugOf = p => path.resolve(p).replace(/[^a-zA-Z0-9]/g, '-');
const readAt = (f, from, len) => { const fd = fs.openSync(f, 'r'); try { const b = Buffer.alloc(len), n = fs.readSync(fd, b, 0, len, from); return b.subarray(0, n).toString('utf8'); } finally { fs.closeSync(fd); } };
const CWD = /"cwd":("(?:[^"\\]|\\.)*")/, TITLE = /"customTitle":("(?:[^"\\]|\\.)*")/g;
export function projectChats(projectDir, { home = HOME, limit = 30 } = {}) {
  const base = path.join(home, '.claude', 'projects'), want = slugOf(projectDir).toLowerCase(), out = [];
  let dirs = []; try { dirs = fs.readdirSync(base, { withFileTypes: true }).filter(e => e.isDirectory() && (e.name.toLowerCase() === want || e.name.toLowerCase().startsWith(want + '-'))); } catch { return []; }
  for (const d of dirs) {
    let files = []; try { files = fs.readdirSync(path.join(base, d.name)).filter(f => f.endsWith('.jsonl')); } catch { continue; }
    for (const name of files) {
      const f = path.join(base, d.name, name); let st; try { st = fs.statSync(f); } catch { continue; }
      if (st.size < 200) continue;
      let cwd = null, title = null;
      try { const m = CWD.exec(readAt(f, 0, 64 << 10)); if (m) cwd = JSON.parse(m[1]); } catch { }
      if (!cwd || !(norm(cwd) === norm(projectDir) || isInside(cwd, projectDir))) continue;
      try { const all = [...readAt(f, Math.max(0, st.size - (256 << 10)), 256 << 10).matchAll(TITLE)]; if (all.length) title = JSON.parse(all[all.length - 1][1]).slice(0, 120); } catch { }
      out.push({ id: name.replace(/\.jsonl$/, ''), title, cwd, lastActive: st.mtimeMs, sizeKB: Math.round(st.size / 1024) });
    }
  }
  return out.sort((a, b) => b.lastActive - a.lastActive).slice(0, limit);
}

export function routes(route, readBody, rescan, project = () => null) {
  route('GET', '/api/project/:id/chats', (req, url, { id }) => { const p = project(id); if (!p) throw Object.assign(new Error('Project not found'), { code: 404 }); return { chats: projectChats(p.path) }; });
  route('GET', '/api/claude-projects', () => ({ projects: claudeProjects() }));
  route('POST', '/api/import', async (req) => {
    const body = await readBody(req);
    const r = importFolder(body?.path);
    if (r.added) rescan().catch(() => { });
    return r;
  });
}
