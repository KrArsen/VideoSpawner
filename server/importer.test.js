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
