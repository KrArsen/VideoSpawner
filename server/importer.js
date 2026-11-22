// "Import project" on the Films page: add a folder the user already has as a watched folder, with the right type.
// A film folder (code, a render script, a Remotion project or videos of one film) becomes a single project; a folder
// whose sub-folders are films becomes a container; a folder of finished videos becomes a media folder.
import fs from 'node:fs';
import path from 'node:path';
import { config, saveConfig } from './config.js';
import { isInside, norm } from './util.js';

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

export function routes(route, readBody, rescan) {
  route('POST', '/api/import', async (req) => {
    const body = await readBody(req);
    const r = importFolder(body?.path);
    if (r.added) rescan().catch(() => { });
    return r;
  });
}
