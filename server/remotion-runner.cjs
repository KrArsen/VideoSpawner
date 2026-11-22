// Builds a Remotion project for VideoSpawner's live preview, with the project's OWN Remotion packages (so the
// version always matches): node remotion-runner.cjs <projectDir> <entry> <outDir> <emptyPublicDir> [browser]
// 1. bundle() the entry into outDir (public files are not copied: VideoSpawner links outDir/public to the project's
//    public folder, which can be gigabytes), with webpack caching so later builds take seconds;
// 2. getCompositions() from the bundle (in the given Chrome/Edge: nothing is downloaded) → outDir/compositions.json.
// Prints one JSON line at the end: {ok, ms, compositions} or {ok:false, error}.
'use strict';
const path = require('path'), fs = require('fs'), { createRequire } = require('module');
const [dir, entry, outDir, emptyPublic, browser] = process.argv.slice(2);
const req = createRequire(path.join(dir, 'package.json'));
const done = o => { process.stdout.write('\n' + JSON.stringify(o) + '\n'); process.exit(o.ok ? 0 : 1); };
(async () => {
  const t0 = Date.now();
  let bundler, renderer;
  try { bundler = req('@remotion/bundler'); renderer = req('@remotion/renderer'); }
  catch (e) { return done({ ok: false, error: 'This project has no @remotion/bundler / @remotion/renderer installed: run "npm install" in it. (' + e.message + ')' }); }
  fs.mkdirSync(emptyPublic, { recursive: true });
  await bundler.bundle({ entryPoint: path.resolve(dir, entry), outDir, enableCaching: true, publicDir: emptyPublic,
    onProgress: p => { if (p % 20 === 0) process.stdout.write(`bundle ${p}%\n`); } });
  const comps = await renderer.getCompositions(outDir, { logLevel: 'error', ...(browser ? { browserExecutable: browser } : {}), chromiumOptions: { gl: 'angle' } });
  const list = comps.map(c => ({ id: c.id, width: c.width, height: c.height, fps: c.fps, durationInFrames: c.durationInFrames, still: c.durationInFrames === 1 }));
  fs.writeFileSync(path.join(outDir, 'compositions.json'), JSON.stringify(list, null, 1));
  done({ ok: true, ms: Date.now() - t0, compositions: list });
})().catch(e => done({ ok: false, error: String(e && e.message || e).split('\n').slice(0, 6).join('\n') }));
