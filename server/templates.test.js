import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeFilm, createFilm, durationOf, slug, dataFile } from './templates.js';
import { TEMPLATES, LANGUAGES, SCENE_TYPES, catalog } from './template-catalog.js';

test('every template has its text in every language and only known scene types', () => {
  for (const t of TEMPLATES) for (const lang of Object.keys(LANGUAGES)) {
    const f = normalizeFilm({ template: t.id, lang });
    assert.ok(f.scenes.length >= 2, t.id);
    for (const s of f.scenes) {
      assert.ok(SCENE_TYPES[s.type], `${t.id}: ${s.type}`);
      for (const [k, kind] of Object.entries(SCENE_TYPES[s.type].fields)) if (kind === 'text' && k === 'title') assert.ok(s[k], `${t.id}/${lang}: ${s.type}.${k} is empty`);
    }
  }
  assert.equal(catalog('uk').templates.find(t => t.id === 'top5').name, 'Топ-5');
});

test('the editor\'s data is checked: unknown types refused, lengths clamped, text trimmed', () => {
  assert.throws(() => normalizeFilm({ scenes: [{ type: 'explode' }] }), /unknown type/);
  assert.throws(() => normalizeFilm({ template: 'nope' }), /Unknown template/);
  const f = normalizeFilm({ format: '9:16', scenes: [{ type: 'title', title: '  Hi\n there ', dur: 999 }, { type: 'list', title: 'L', items: 'a\n\nb' }] });
  assert.deepEqual([f.w, f.h], [1080, 1920]);
  assert.equal(f.scenes[0].title, 'Hi there');
  assert.equal(f.scenes[0].dur, 60);
  assert.deepEqual(f.scenes[1].items, ['a', 'b']);
  assert.equal(durationOf(f), 60 + SCENE_TYPES.list.dur);
});

test('folder names are readable in Latin letters', () => {
  assert.equal(slug('Як працює сон'), 'yak-pratsyuye-son');
  assert.equal(slug('5 habits: of people!'), '5-habits-of-people');
  assert.equal(slug('***'), 'film');
});

test('a template film is a complete VideoSpawner film folder', () => {
  const r = createFilm({ template: 'top5', lang: 'uk', name: 'Тест шаблону' });
  try {
    for (const f of ['index.html', 'engine.js', 'film.data.js', 'render.js', 'package.json', 'audio/mix.wav', '.videospawner/project.json']) assert.ok(fs.existsSync(path.join(r.path, f)), f);
    const render = fs.readFileSync(path.join(r.path, 'render.js'), 'utf8');
    assert.match(render, /VW = 1080, VH = 1920/);
    const meta = JSON.parse(fs.readFileSync(path.join(r.path, '.videospawner', 'project.json'), 'utf8'));
    assert.equal(meta.render.env.DUR, String(r.seconds));
    assert.ok(meta.render.workers >= 2);
    const wavBytes = fs.statSync(path.join(r.path, 'audio', 'mix.wav')).size;
    assert.ok(Math.abs(wavBytes - 44 - Math.ceil((r.seconds + 0.05) * 44100) * 4) <= 4, 'the music lasts as long as the film');
    assert.match(fs.readFileSync(path.join(r.path, 'film.data.js'), 'utf8'), /^window\.FILM = /m);
  } finally { fs.rmSync(r.path, { recursive: true, force: true }); }
});

test('film.data.js is plain JSON after window.FILM =', () => {
  const f = normalizeFilm({ template: 'quote', lang: 'en' });
  const txt = dataFile(f), json = /window\.FILM = ([\s\S]*);\n$/.exec(txt)[1];
  assert.equal(JSON.parse(json).scenes[0].type, 'quote');
});
