// Templates (#/templates): make a video without writing code and without the agent. Pick a template, choose the
// language, format, look and music, type your text; the preview on the right is the same engine the film and its
// render use, so what plays here is what you get. "Create video" makes a normal film folder and opens it.
import { h, api, toast } from './app.js';
import { icon, ic } from './icons.js';

let engineLoad = null;
const loadEngine = () => engineLoad || (engineLoad = new Promise((ok, fail) => {
  if (window.VSEngine) return ok(window.VSEngine);
  const s = document.createElement('script'); s.src = '/tpl/engine.js';
  s.onload = () => ok(window.VSEngine); s.onerror = () => { engineLoad = null; fail(new Error('The template engine did not load.')); };
  document.head.append(s);
}));

const LS = 'vs-template-lang';
const savedLang = () => { try { return localStorage.getItem(LS) || ''; } catch { return ''; } };
const saveLang = v => { try { localStorage.setItem(LS, v); } catch { } };
const fmtSec = s => (Math.round(s * 10) / 10).toString().replace(/\.0$/, '') + ' s';

export async function templatesPage(page) {
  const E = await loadEngine();
  let lang = savedLang() || (navigator.language || 'en').slice(0, 2);
  let cat = await api('/api/templates?lang=' + encodeURIComponent(lang));
  if (!cat.languages[lang]) lang = 'en';

  // ---------- the film being edited
  const st = { tpl: cat.templates[0], format: '', theme: '', music: '', name: '', scenes: [], dirty: false };
  const reset = (tpl) => { st.tpl = tpl; st.format = tpl.format; st.theme = tpl.theme; st.music = tpl.music; st.name = ''; st.scenes = structuredClone(tpl.scenes); st.dirty = false; };
  reset(st.tpl);
  const film = () => {
    const F = cat.formats[st.format], th = { ...cat.themes[st.theme] }; delete th.name;
    return { template: st.tpl.id, lang, format: st.format, w: F.w, h: F.h, fps: 30, music: st.music, theme: th, scenes: st.scenes.map(s => ({ ...s })) };
  };
  const total = () => st.scenes.reduce((a, s) => a + (+s.dur || 0), 0);

  // ---------- preview: one canvas, looping, with play/pause and a scrubber
  const cv = h('canvas', { class: 'tpl-canvas' });
  const stage = h('div', { class: 'tpl-stage' }, cv);
  const playBtn = h('button', { class: 'icon-btn', title: 'Play / pause (click the picture too)' }, icon('pause'));
  const scrub = h('input', { type: 'range', min: '0', max: '1000', value: '0', class: 'tpl-scrub', 'aria-label': 'Position in the film' });
  const clock = h('span', { class: 'mono dim tpl-clock' }, '0:00');
  let mounted = null, t0 = performance.now(), paused = false, pausedT = 0, raf = 0, gone = false;
  const now = () => paused ? pausedT : (performance.now() - t0) / 1000;
  function mountPreview() {
    const f = film(), box = stage.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    const k = Math.min((box.width || 600) / f.w, (box.height || 400) / f.h);
    cv.style.width = Math.round(f.w * k) + 'px'; cv.style.height = Math.round(f.h * k) + 'px';
    cv.width = Math.max(1, Math.round(f.w * k * dpr)); cv.height = Math.max(1, Math.round(f.h * k * dpr));
    mounted = E.mount(cv, f, k * dpr);
  }
  const setPaused = p => { if (p === paused) return; if (p) pausedT = now(); else t0 = performance.now() - pausedT * 1000; paused = p; playBtn.replaceChildren(icon(p ? 'play' : 'pause')); };
  playBtn.onclick = () => setPaused(!paused); cv.onclick = () => setPaused(!paused);
  scrub.oninput = () => { const d = mounted?.model.dur || 1; pausedT = +scrub.value / 1000 * d; if (!paused) t0 = performance.now() - pausedT * 1000; else mounted?.draw(pausedT); };
  (function loop() {
    if (gone) return;
    if (mounted) {
      const d = mounted.model.dur; let t = now();
      if (!paused && t > d + 0.5) { t0 = performance.now(); t = 0; }
      const tt = Math.min(t, d - 0.001); mounted.draw(tt);
      if (document.activeElement !== scrub) scrub.value = String(Math.round(tt / d * 1000));
      clock.textContent = `${Math.floor(tt / 60)}:${String(Math.floor(tt % 60)).padStart(2, '0')} / ${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, '0')}`;
    }
    raf = requestAnimationFrame(loop);
  })();
  let previewTimer = 0;
  const changed = (structural = false) => { st.dirty = true; clearTimeout(previewTimer); previewTimer = setTimeout(() => { mountPreview(); if (structural) drawScenes(); totalEl.textContent = fmtSec(total()); }, 120); };
  const ro = new ResizeObserver(() => mountPreview()); ro.observe(stage);

  // ---------- template cards, each with a poster drawn by the engine
  const cards = h('div', { class: 'tpl-cards', role: 'radiogroup', 'aria-label': 'Template' });
  function drawCards() {
    cards.replaceChildren(...cat.templates.map(t => {
      const poster = h('canvas', { class: 'tpl-poster' });
      const F = cat.formats[t.format], th = { ...cat.themes[t.theme] };
      const box = 168, k = Math.min(box * 1.6 / F.w, box / F.h);
      poster.width = Math.round(F.w * k * 1.5); poster.height = Math.round(F.h * k * 1.5);
      const sample = { w: F.w, h: F.h, lang, theme: th, scenes: t.scenes };
      const m = E.mount(poster, sample, k * 1.5); m.draw(Math.min(2.4, t.scenes[0].dur - 0.2));
      const on = t.id === st.tpl.id;
      return h('button', { class: 'tpl-card' + (on ? ' on' : ''), role: 'radio', 'aria-checked': String(on), onclick: () => pickTemplate(t) },
        h('div', { class: 'tpl-poster-box' }, poster),
        h('div', { class: 'tpl-card-text' }, h('b', {}, t.name), h('span', { class: 'tpl-fmt' }, t.format)),
        h('div', { class: 'tpl-card-desc' }, t.desc));
    }));
  }
  async function pickTemplate(t) {
    if (t.id === st.tpl.id) return;
    if (st.dirty && !confirm('Switch template? Your text in this one will be replaced.')) return;
    reset(t); drawAll();
  }

  // ---------- language, format, look, music, name
  const sel = (opts, cur, on) => { const s = h('select', {}, Object.entries(opts).map(([v, l]) => h('option', { value: v, selected: v === cur }, typeof l === 'string' ? l : l.label))); s.onchange = () => on(s.value); return s; };
  const settings = h('div', { class: 'tpl-settings' });
  const nameIn = h('input', { type: 'text', placeholder: 'Film name (optional)', maxlength: '80' });
  nameIn.oninput = () => { st.name = nameIn.value; st.dirty = true; };
  function drawSettings() {
    const langSel = sel(cat.languages, lang, async v => {
      if (st.dirty && !confirm('Load the sample text in this language? Your text will be replaced.')) { langSel.value = lang; return; }
      lang = v; saveLang(v); cat = await api('/api/templates?lang=' + v);
      reset(cat.templates.find(t => t.id === st.tpl.id) || cat.templates[0]); drawAll();
    });
    const fmt = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Format' }, Object.entries(cat.formats).map(([v, f]) =>
      h('button', { class: v === st.format ? 'on' : '', role: 'radio', 'aria-checked': String(v === st.format), title: f.label, onclick: () => { st.format = v; drawSettings(); changed(); } }, v)));
    const looks = h('div', { class: 'tpl-themes', role: 'radiogroup', 'aria-label': 'Look' }, Object.entries(cat.themes).map(([v, th]) =>
      h('button', { class: 'tpl-theme' + (v === st.theme ? ' on' : ''), role: 'radio', 'aria-checked': String(v === st.theme), title: th.name, onclick: () => { st.theme = v; drawSettings(); changed(); } },
        h('span', { class: 'sw', style: { background: `linear-gradient(135deg, ${th.bg[0]}, ${th.bg[1]})` } }, h('i', { style: { background: th.accent } }), h('i', { style: { background: th.accent2 } })),
        h('span', {}, th.name))));
    const music = sel(cat.music, st.music, v => { st.music = v; st.dirty = true; });
    nameIn.value = st.name;
    settings.replaceChildren(
      field('Language of the video', langSel), field('Format', fmt), field('Look', looks), field('Music', music), field('Name', nameIn));
  }
  const field = (label, ctl) => h('label', { class: 'tpl-field' }, h('span', { class: 'tpl-label' }, label), ctl);

  // ---------- scenes
  const scenesEl = h('div', { class: 'tpl-scenes' });
  const totalEl = h('span', { class: 'mono' }, '');
  function sceneInput(s, key, kind) {
    const lab = { title: 'Heading', sub: 'Second line', text: 'Text', items: 'Items, one per line', value: 'Number', suffix: 'After the number', label: 'Caption', author: 'Author', handle: 'Handle or link' }[key] || key;
    let el;
    if (kind === 'long' || kind === 'lines') {
      el = h('textarea', { rows: kind === 'lines' ? String(Math.max(3, (s[key] || []).length)) : '3', value: kind === 'lines' ? (s[key] || []).join('\n') : (s[key] || '') });
      el.oninput = () => { s[key] = kind === 'lines' ? el.value.split('\n') : el.value; if (kind === 'lines') s.dur = Math.max(s.dur, 2 + s[key].filter(Boolean).length * 1.1); changed(); };
    } else {
      el = h('input', { type: kind === 'number' ? 'number' : 'text', value: s[key] ?? '', maxlength: kind === 'short' ? '40' : '200' });
      el.oninput = () => { s[key] = kind === 'number' ? +el.value : el.value; changed(); };
    }
    return h('label', { class: 'tpl-field' + (kind === 'short' || kind === 'number' ? ' half' : '') }, h('span', { class: 'tpl-label' }, lab), el);
  }
  function drawScenes() {
    const T = cat.sceneTypes;
    scenesEl.replaceChildren(...st.scenes.map((s, i) => {
      const dur = h('input', { type: 'number', min: '1', max: '60', step: '0.5', value: String(s.dur), class: 'tpl-dur', 'aria-label': 'Seconds' });
      dur.oninput = () => { s.dur = Math.max(1, Math.min(60, +dur.value || 1)); changed(); };
      const move = d => { const j = i + d; if (j < 0 || j >= st.scenes.length) return; [st.scenes[i], st.scenes[j]] = [st.scenes[j], st.scenes[i]]; changed(true); };
      return h('section', { class: 'tpl-scene' },
        h('header', {}, h('span', { class: 'tpl-n' }, String(i + 1)), h('b', {}, T[s.type]?.label || s.type),
          h('span', { class: 'spacer' }), dur, h('span', { class: 'dim' }, 's'),
          h('button', { class: 'icon-btn', title: 'Move up', disabled: i === 0, onclick: () => move(-1) }, icon('chevup')),
          h('button', { class: 'icon-btn', title: 'Move down', disabled: i === st.scenes.length - 1, onclick: () => move(1) }, icon('chev')),
          h('button', { class: 'icon-btn danger', title: 'Remove this scene', disabled: st.scenes.length < 2, onclick: () => { st.scenes.splice(i, 1); changed(true); } }, icon('x'))),
        h('div', { class: 'tpl-scene-fields' }, Object.entries(T[s.type]?.fields || {}).map(([k, kind]) => sceneInput(s, k, kind))));
    }));
    totalEl.textContent = fmtSec(total());
  }
  const addSel = h('select', { 'aria-label': 'Scene type to add' }, Object.entries(cat.sceneTypes).map(([v, t]) => h('option', { value: v }, t.label)));
  const addBtn = h('button', { onclick: () => {
    const type = addSel.value, T = cat.sceneTypes[type], s = { type, dur: T.dur };
    for (const [k, kind] of Object.entries(T.fields)) s[k] = kind === 'lines' ? ['', '', ''] : kind === 'number' ? 100 : '';
    st.scenes.push(s); changed(true);
  } }, ic('plus', 'Add scene'));

  // ---------- create
  const createBtn = h('button', { class: 'primary tpl-create', onclick: async () => {
    createBtn.disabled = true; const old = [...createBtn.childNodes]; createBtn.replaceChildren(...[].concat(ic('hourglass', 'Creating…')));
    try {
      const f = film();
      const r = await api('/api/templates/create', { method: 'POST', body: { template: f.template, lang, format: st.format, theme: st.theme, music: st.music, name: st.name, scenes: f.scenes } });
      st.dirty = false;
      toast(`Created "${r.title}" (${fmtSec(r.seconds)}). Opening it…`);
      location.hash = `#/review/${r.id}/~live`;
    } catch (err) { toast('Could not create the video: ' + err.message, true); createBtn.disabled = false; createBtn.replaceChildren(...old); }
  } }, ic('spark', 'Create video'));

  function drawAll() { drawCards(); drawSettings(); drawScenes(); mountPreview(); }

  page.classList.add('tpl-page');
  page.append(
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'New video from a template'),
      h('p', { class: 'sub' }, 'Pick a template, type your text, press Create. No code and no tokens: the preview is the finished video.'))),
    cards,
    h('div', { class: 'tpl-work' },
      h('div', { class: 'tpl-form' },
        settings,
        h('h2', {}, 'Scenes'),
        scenesEl,
        h('div', { class: 'row tpl-add' }, addSel, addBtn)),
      h('aside', { class: 'tpl-side' },
        stage,
        h('div', { class: 'row tpl-transport' }, playBtn, scrub, clock),
        h('div', { class: 'tpl-go' }, h('div', {}, h('div', { class: 'dim' }, 'Length'), h('b', {}, totalEl)), createBtn),
        h('p', { class: 'dim tpl-hint' }, 'After it opens, leave notes on any frame and send them to ', h('b', {}, 'Claude'), ': it changes only this film\'s text file, which costs a few hundred tokens.'))));
  drawAll();
  return () => { gone = true; cancelAnimationFrame(raf); ro.disconnect(); clearTimeout(previewTimer); };
}
