import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { classifyFolder } from './importer.js';

const tmp = () => fs.mkdtempSync(path.join(process.env.VIDEOSPAWNER_TEST_TMP || os.tmpdir(), 'import-'));
const put = (dir, rel, text = '') => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };

test('a film folder with code or a render script is one project', () => {
  const d = tmp(); put(d, 'index.html'); put(d, 'film.js');
  assert.deepEqual(classifyFolder(d), { type: 'project', kind: 'code', films: 1, videos: 0 });
});

test('a Remotion project is one project and says so', () => {
  const d = tmp(); put(d, 'package.json', JSON.stringify({ dependencies: { remotion: '4.0.0', '@remotion/cli': '4.0.0' } })); put(d, 'out/video.mp4');
  assert.equal(classifyFolder(d).type, 'project');
  assert.equal(classifyFolder(d).kind, 'remotion');
});

test('a folder of film folders is a container; loose videos are a media folder', () => {
  const c = tmp(); put(c, 'a/render.js'); put(c, 'b/final.mp4'); put(c, 'node_modules/x/index.html');
  assert.deepEqual(classifyFolder(c), { type: 'container', kind: 'films', films: 2, videos: 0 });
  const m = tmp(); put(m, 'one.mp4'); put(m, 'two.mov');
  assert.deepEqual(classifyFolder(m), { type: 'media', kind: 'videos', films: 0, videos: 2 });
});

test('Claude Code projects: each working folder once, newest first, with its kind', async () => {
  const { claudeProjects } = await import('./importer.js');
  // outside the temp folder: claudeProjects skips folders in TEMP (chats opened there are not projects)
  const out = () => fs.mkdtempSync(path.join(process.cwd(), '.test-tmp', 'cproj-'));
  const home = tmp(), a = out(), b = out();
  put(a, 'index.html'); put(b, 'package.json', JSON.stringify({ dependencies: { remotion: '4' } }));
  const session = (folder, file, cwd, age) => { put(home, `.claude/projects/${folder}/${file}`, JSON.stringify({ type: 'user', cwd, message: { content: 'secret prompt' } }) + '\n'); const f = path.join(home, '.claude', 'projects', folder, file); const t = new Date(Date.now() - age); fs.utimesSync(f, t, t); };
  session('A', 's1.jsonl', a, 60e3); session('A', 's2.jsonl', a, 120e3);
  session('B', 's1.jsonl', b, 10e3);
  session('Gone', 's1.jsonl', path.join(a, 'deleted-folder'), 1e3);
  const list = claudeProjects({ home, skip: [] });
  assert.deepEqual(list.map(p => p.path), [b, a]);
  assert.equal(list[0].kind, 'remotion');
  assert.equal(list[1].sessions, 2);
  assert.ok(!JSON.stringify(list).includes('secret prompt'), 'no prompt text');
});
