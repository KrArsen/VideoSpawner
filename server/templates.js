// Films from templates: the catalog, the engine and preview page for the editor, and making a film folder from a
// template (the Templates page and the hub_template tool). A template film is index.html + engine.js + film.data.js +
// render.js + audio/mix.wav: a normal VideoSpawner film (live preview, notes, chunked and partial renders).
import fs from 'node:fs';
import path from 'node:path';
import { HUB_DIR, autoWorkers, idOf, isInside, norm } from './util.js';
import { config, saveConfig, defaultFilmsDir } from './config.js';
import { catalog, TEMPLATES, THEMES, FORMATS, SCENE_TYPES, LANGUAGES, MUSIC, sampleScenes } from './template-catalog.js';


const ENGINE = path.join(HUB_DIR, 'templates', 'engine');
const RENDER_SRC = path.join(HUB_DIR, 'templates', 'new-film', 'render.js');
const bad = msg => Object.assign(new Error(msg), { code: 400 });

// ---------- a film's data from the editor or the agent, checked and filled in
const str = (v, max = 400) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
export function normalizeFilm(input = {}) {
  const tpl = TEMPLATES.find(t => t.id === input.template) || null;
  if (input.template && !tpl) throw bad(`Unknown template "${input.template}". Templates: ${TEMPLATES.map(t => t.id).join(', ')}.`);
  const lang = LANGUAGES[input.lang] ? input.lang : 'en';
  const format = FORMATS[input.format] ? input.format : tpl?.format || '16:9';
  const themeKey = THEMES[input.theme] ? input.theme : tpl?.theme || 'spawn';
  const theme = { ...THEMES[themeKey], ...(input.themeOverride && typeof input.themeOverride === 'object' ? input.themeOverride : {}) };
  delete theme.name;
  const music = MUSIC[input.music] ? input.music : tpl?.music || 'pad';
  const raw = Array.isArray(input.scenes) && input.scenes.length ? input.scenes : tpl ? sampleScenes(tpl, lang) : null;
  if (!raw) throw bad('Give a template or scenes.');
  const scenes = raw.slice(0, 40).map((s, i) => {
    const type = SCENE_TYPES[s?.type] ? s.type : null;
    if (!type) throw bad(`Scene ${i + 1}: unknown type "${s?.type}". Types: ${Object.keys(SCENE_TYPES).join(', ')}.`);
    const out = { type, dur: Math.round(Math.max(1, Math.min(60, +s.dur || SCENE_TYPES[type].dur)) * 10) / 10 };
    for (const [k, kind] of Object.entries(SCENE_TYPES[type].fields)) {
      if (kind === 'lines') out[k] = (Array.isArray(s[k]) ? s[k] : String(s[k] || '').split('\n')).map(x => str(x, 120)).filter(Boolean).slice(0, 10);
      else if (kind === 'number') out[k] = Number.isFinite(+s[k]) ? +s[k] : 0;
      else out[k] = str(s[k], kind === 'long' ? 600 : kind === 'short' ? 40 : 200);
    }
    return out;
  });
  const { w, h } = FORMATS[format];
  return { template: tpl?.id || 'custom', title: str(input.name, 80) || str(scenes[0].title || scenes[0].text, 80) || 'New film', lang, format, w, h, fps: 30, themeName: themeKey, theme, music, scenes };
}
export const durationOf = film => Math.round(film.scenes.reduce((s, x) => s + x.dur, 0) * 100) / 100;

// ---------- music: a soft generated bed (or silence), written as 16-bit stereo WAV
function wav(film, file) {
  const rate = 44100, dur = durationOf(film) + 0.05, n = Math.ceil(dur * rate);
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  if (film.music !== 'none') {
    // A minor – F – C – G, two seconds per chord (pad) or one (pulse); fades in and out
    const chords = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];
    const pulse = film.music === 'pulse', per = pulse ? 1 : 2, TAU = Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const t = i / rate, ci = Math.floor(t / per) % 4, ph = (t % per) / per;
      const env = pulse ? Math.exp(-ph * 3.2) * 0.9 + 0.1 : Math.min(1, ph * 4) * Math.min(1, (1 - ph) * 4) * 0.6 + 0.4;
      let l = 0, r = 0;
      for (let k = 0; k < 3; k++) { const f = chords[ci][k]; const v = Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * f * 2 * t + k); l += v * (k === 1 ? 0.8 : 1); r += v * (k === 1 ? 1 : 0.8); }
      const bass = Math.sin(TAU * chords[ci][0] / 2 * t) * (pulse ? Math.exp(-ph * 6) : 0.6);
      const fade = Math.min(1, t / 1.2, (dur - t) / 1.5), g = 0.075 * env * fade;
      const L = Math.max(-1, Math.min(1, l * g + bass * 0.09 * fade)), R = Math.max(-1, Math.min(1, r * g + bass * 0.09 * fade));
      buf.writeInt16LE(Math.round(L * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R * 32767), 46 + i * 4);
    }
  }
  fs.writeFileSync(file, buf);
}

// ---------- the film folder
const TRANSLIT = { а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya', ё: 'yo', ы: 'y', э: 'e', ъ: '', ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };
export const slug = s => String(s || '').toLowerCase().split('').map(c => TRANSLIT[c] ?? c).join('').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 48).replace(/^-|-$/g, '') || 'film';
function filmsDir() {
  const r = (config().roots || []).find(x => x.enabled !== false && x.type === 'container' && fs.existsSync(x.path));
  return r ? r.path : defaultFilmsDir();
}
export const dataFile = film => '// This film, as data: VideoSpawner\'s template engine (engine.js) draws it. Change texts, scene lengths (dur, seconds)\n'
  + '// and theme colours here; the live preview reloads by itself. Scene types: ' + Object.keys(SCENE_TYPES).join(', ') + '.\n'
  + 'window.FILM = ' + JSON.stringify({ template: film.template, lang: film.lang, format: film.format, w: film.w, h: film.h, fps: film.fps, music: film.music, theme: film.theme, scenes: film.scenes }, null, 1) + ';\n';

export function createFilm(input) {
  const film = normalizeFilm(input), dur = durationOf(film);
  const base = filmsDir(); fs.mkdirSync(base, { recursive: true });
  let dir = path.join(base, slug(input.folder || film.title));
  for (let n = 2; fs.existsSync(dir); n++) dir = path.join(base, slug(input.folder || film.title) + '-' + n);
  fs.mkdirSync(path.join(dir, 'audio'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.videospawner'), { recursive: true });
  fs.copyFileSync(path.join(ENGINE, 'index.html'), path.join(dir, 'index.html'));
  fs.copyFileSync(path.join(ENGINE, 'engine.js'), path.join(dir, 'engine.js'));
  fs.writeFileSync(path.join(dir, 'film.data.js'), dataFile(film));
  // the template render script, sized for this format; DUR comes from the project recipe
  const src = fs.readFileSync(RENDER_SRC, 'utf8');
  if (!src.includes('VW = 1920, VH = 1080')) throw new Error('templates/new-film/render.js changed: its VW/VH line was not found.');
  fs.writeFileSync(path.join(dir, 'render.js'), src.replace('VW = 1920, VH = 1080', `VW = ${film.w}, VH = ${film.h}`).replace('process.env.DUR || 10', `process.env.DUR || ${dur}`));
  wav(film, path.join(dir, 'audio', 'mix.wav'));
  // its own package.json: render.js is CommonJS, and a parent folder's "type": "module" would otherwise break it
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: slug(film.title), private: true, type: 'commonjs', scripts: { render: 'node render.js' } }, null, 1) + '\n');
  fs.writeFileSync(path.join(dir, '.videospawner', 'project.json'), JSON.stringify({ title: film.title, status: 'in-progress', template: film.template, render: { workers: autoWorkers(), env: { DUR: String(dur) } } }, null, 1));
  // make sure the films folder is watched
  const roots = config().roots || [];
  if (!roots.some(r => r.enabled !== false && isInside(dir, r.path))) saveConfig({ roots: [{ path: base, type: 'container', enabled: true }, ...roots.filter(r => norm(r.path) !== norm(base))] });
  return { ok: true, id: idOf(dir), path: dir, title: film.title, seconds: dur, scenes: film.scenes.length, format: film.format };
}

// the music of an existing template film again (after its scene lengths changed)
export function remakeAudio(dir) {
  const txt = fs.readFileSync(path.join(dir, 'film.data.js'), 'utf8'), m = /window\.FILM\s*=\s*([\s\S]*?);\s*$/.exec(txt);
  if (!m) throw bad('film.data.js has no window.FILM.');
  const film = normalizeFilm(JSON.parse(m[1])); wav(film, path.join(dir, 'audio', 'mix.wav')); return durationOf(film);
}

const sendFile = (res, file, type) => { res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); fs.createReadStream(file).on('error', () => res.destroy()).pipe(res); };
export function routes(route, readBody, rescan) {
  route('GET', '/api/templates', (req, url) => catalog(LANGUAGES[url.searchParams.get('lang')] ? url.searchParams.get('lang') : 'en'));
  route('GET', '/tpl/engine.js', (req, url, g, res) => { sendFile(res, path.join(ENGINE, 'engine.js'), 'text/javascript; charset=utf-8'); });
  route('POST', '/api/templates/preview', async (req) => normalizeFilm(await readBody(req)));
  route('POST', '/api/templates/create', async (req) => { const r = createFilm(await readBody(req)); await rescan(); return r; });
}
