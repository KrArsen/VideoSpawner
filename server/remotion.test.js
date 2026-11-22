import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { isRemotion, entryOf } from './remotion.js';

const tmp = () => fs.mkdtempSync(path.join(process.env.VIDEOSPAWNER_TEST_TMP || os.tmpdir(), 'rem-'));
const put = (dir, rel, text = '') => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };

test('a Remotion project is recognised by its package.json, its entry by its studio script', () => {
  const d = tmp();
  put(d, 'package.json', JSON.stringify({ dependencies: { remotion: '4.0.0' }, scripts: { studio: 'remotion studio app/main.tsx' } }));
  put(d, 'app/main.tsx'); put(d, 'src/index.ts');
  assert.equal(isRemotion(d), true);
  assert.equal(entryOf(d), 'app/main.tsx');
  const e = tmp(); put(e, 'package.json', JSON.stringify({ devDependencies: { remotion: '4' } })); put(e, 'src/index.tsx');
  assert.equal(entryOf(e), 'src/index.tsx');
  const n = tmp(); put(n, 'package.json', JSON.stringify({ dependencies: { react: '19' } }));
  assert.equal(isRemotion(n), false);
});
