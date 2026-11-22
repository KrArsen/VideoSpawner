// VideoSpawner template engine: draws a film described as data (window.FILM, from film.data.js) on one canvas.
// Every frame is a pure function of t (no clock, no unseeded random), so the live preview, frame stepping, chunked
// renders and partial re-renders all work, and the render takes the fast raw-canvas path.
// To change a template film, edit film.data.js (texts, scene lengths, theme colours), not this file.
(function () {
  'use strict';

  // ---------- small helpers
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
  const easeInOut = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const back = x => { x = clamp(x); const c = 1.5; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const seeded = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const rgba = (hex, a) => { const h = String(hex).replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };

  // ---------- the film as a timeline
  function build(film) {
    const W = +film.w || 1920, H = +film.h || 1080;
    let t0 = 0;
    const scenes = (film.scenes || []).map((s, i) => { const d = Math.max(1, +s.dur || 3); const sc = { ...s, i, t0, t1: t0 + d }; t0 += d; return sc; });
    return { W, H, scenes, dur: Math.max(1, t0), u: Math.min(W, H) / 1080, tall: H > W * 1.2 };
  }

  // ---------- text: wrap, fit, and a word-by-word reveal
  const fontOf = (weight, size, family) => `${weight} ${Math.round(size)}px ${family}`;
  function wrap(g, text, maxW) {
    const words = String(text || '').split(/\s+/).filter(Boolean), lines = [];
    let line = '';
    for (const w of words) {
      const next = line ? line + ' ' + w : w;
      if (g.measureText(next).width <= maxW || !line) line = next; else { lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    return lines;
  }
  function fit(g, text, { weight = 700, family, size, min = 24, maxW, maxLines = 3 }) {
    for (let s = size; s >= min; s *= 0.92) { g.font = fontOf(weight, s, family); const lines = wrap(g, text, maxW); if (lines.length <= maxLines && lines.every(l => g.measureText(l).width <= maxW)) return { size: s, lines }; }
    g.font = fontOf(weight, min, family); return { size: min, lines: wrap(g, text, maxW) };
  }
  // draws lines word by word: each word rises and fades in `stagger` seconds after the previous one
  function reveal(g, lines, { x, y, size, lh = 1.12, align = 'center', weight = 700, family, color, A = 1, s = 0, delay = 0, stagger = 0.07 }) {
    g.font = fontOf(weight, size, family); g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.fillStyle = color;
    let i = 0;
    lines.forEach((line, li) => {
      const words = line.split(' '), space = g.measureText(' ').width, lw = g.measureText(line).width;
      let cx = align === 'center' ? x - lw / 2 : align === 'right' ? x - lw : x;
      const cy = y + li * size * lh;
      for (const w of words) {
        const k = easeOut((s - delay - i * stagger) / 0.45);
        if (k > 0) { g.globalAlpha = A * k; g.fillText(w, cx, cy + (1 - k) * size * 0.45); }
        cx += g.measureText(w).width + space; i++;
      }
    });
    g.globalAlpha = A;
    return { words: i, height: lines.length * size * lh };
  }
  function text(g, str, { x, y, size, weight = 500, family, color, align = 'center', A = 1, k = 1 }) {
    if (k <= 0 || !str) return;
    g.font = fontOf(weight, size, family); g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillStyle = color;
    g.globalAlpha = A * easeOut(k); g.fillText(str, x, y + (1 - easeOut(k)) * size * 0.4); g.globalAlpha = A;
  }

  // ---------- background: gradient + a slow motif
  // Renders draw on a software canvas (render.js turns 2D acceleration off for fast, exact pixel reads), where a
  // full-frame gradient costs milliseconds: the still gradient is drawn once and copied, and the soft glow is drawn
  // at 1/8 size and scaled up (it is a blur anyway). This took the glow themes from ~30 to ~11 ms a frame.
  const offscreen = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  function background(g, m, th, t) {
    const { W, H, u } = m;
    if (!m.bgCache || m.bgKey !== th.bg.join()) {
      m.bgCache = offscreen(W, H); m.bgKey = th.bg.join();
      const b = m.bgCache.getContext('2d', { alpha: false }), grd = b.createLinearGradient(0, 0, W * 0.4, H);
      grd.addColorStop(0, th.bg[0]); grd.addColorStop(1, th.bg[1]); b.fillStyle = grd; b.fillRect(0, 0, W, H);
    }
    g.drawImage(m.bgCache, 0, 0, W, H);
    const motif = th.motif || 'grid';
    g.save();
    if (motif === 'grid') {
      const step = 90 * u, off = (t * 12 * u) % step;
      g.strokeStyle = rgba(th.accent, 0.07); g.lineWidth = Math.max(1, 1.5 * u);
      for (let x = -step + off; x < W + step; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = -step + off; y < H + step; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    } else if (motif === 'dots') {
      for (let i = 0; i < 70; i++) {
        const x = (seeded(i) * W + t * (6 + seeded(i + 4) * 18) * u) % W, y = (seeded(i + 2) * H + Math.sin(t * 0.5 + i) * 10 * u);
        g.fillStyle = rgba(th.accent, 0.10 + 0.12 * seeded(i + 9)); g.beginPath(); g.arc(x, y, (2 + seeded(i + 7) * 5) * u, 0, Math.PI * 2); g.fill();
      }
    } else if (motif === 'rings') {
      const cx = W * 0.5, cy = H * 0.5;
      for (let i = 0; i < 6; i++) {
        const r = ((t * 60 * u + i * 220 * u) % (1320 * u));
        g.strokeStyle = rgba(i % 2 ? th.accent2 : th.accent, 0.10 * (1 - r / (1320 * u))); g.lineWidth = 3 * u;
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
      }
    } else if (motif === 'glow') {
      const k = 1 / 8;
      if (!m.glow) m.glow = offscreen(W * k, H * k);
      const s = m.glow.getContext('2d'); s.setTransform(k, 0, 0, k, 0, 0); s.clearRect(0, 0, W, H);
      for (let i = 0; i < 2; i++) {
        const x = W * (0.25 + 0.5 * i) + Math.sin(t * 0.3 + i * 2) * W * 0.08, y = H * (0.3 + 0.4 * i) + Math.cos(t * 0.25 + i) * H * 0.06, r = Math.max(W, H) * 0.45;
        const rg = s.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, rgba(i ? th.accent2 : th.accent, 0.16)); rg.addColorStop(1, rgba(th.accent, 0));
        s.fillStyle = rg; s.fillRect(0, 0, W, H);
      }
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(m.glow, 0, 0, W, H);
    }
    g.restore();
  }

  // ---------- scenes
  const DRAW = {
    title(g, m, th, sc, s, A) {
      const { W, H, u, tall } = m, maxW = W - (tall ? 140 : 300) * u;
      const f = fit(g, sc.title, { weight: 800, family: th.font, size: (tall ? 150 : 150) * u, min: 50 * u, maxW, maxLines: tall ? 5 : 3 });
      const block = f.lines.length * f.size * 1.08, y0 = H / 2 - block / 2 + f.size * 0.8 - (sc.sub ? 40 * u : 0);
      const r = reveal(g, f.lines, { x: W / 2, y: y0, size: f.size, lh: 1.08, weight: 800, family: th.font, color: th.ink, A, s, delay: 0.15 });
      const after = 0.15 + r.words * 0.07 + 0.2;
      const bw = Math.min(maxW * 0.35, 380 * u) * easeInOut((s - after) / 0.6);
      g.fillStyle = th.accent; g.globalAlpha = A; g.fillRect(W / 2 - bw / 2, y0 + block - f.size * 0.55, bw, 8 * u);
      if (sc.sub) text(g, sc.sub, { x: W / 2, y: y0 + block + 50 * u, size: (tall ? 58 : 52) * u, weight: 500, family: th.font, color: th.muted, A, k: (s - after - 0.1) / 0.5 });
    },
    point(g, m, th, sc, s, A) {
      const { W, H, u, tall } = m, n = String(sc.n ?? (sc.i)).padStart(2, '0');
      const pad = (tall ? 90 : 170) * u, maxW = W - pad * 2;
      const big = (tall ? 260 : 300) * u;
      const k = back((s - 0.05) / 0.6);
      g.save(); g.globalAlpha = A * clamp(k); g.font = fontOf(800, big, th.font); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.lineWidth = 4 * u; g.strokeStyle = th.accent;
      const ny = tall ? H * 0.30 : H * 0.42;
      g.strokeText(n, pad + (1 - clamp(k)) * -60 * u, ny); g.restore();
      const tx = tall ? pad : pad + big * 1.25, tw = tall ? maxW : W - tx - pad;
      const ty = tall ? ny + 140 * u : H * 0.40;
      const f = fit(g, sc.title, { weight: 800, family: th.font, size: (tall ? 110 : 96) * u, min: 40 * u, maxW: tw, maxLines: 3 });
      const r = reveal(g, f.lines, { x: tx, y: ty, size: f.size, align: 'left', weight: 800, family: th.font, color: th.ink, A, s, delay: 0.25 });
      if (sc.text) {
        const bf = fit(g, sc.text, { weight: 400, family: th.font, size: (tall ? 58 : 46) * u, min: 26 * u, maxW: tw, maxLines: tall ? 7 : 4 });
        const ka = (s - 0.35 - r.words * 0.07) / 0.5;
        bf.lines.forEach((l, i) => text(g, l, { x: tx, y: ty + r.height + 30 * u + i * bf.size * 1.3, size: bf.size, weight: 400, family: th.font, color: th.muted, align: 'left', A, k: ka - i * 0.15 }));
      }
    },
    list(g, m, th, sc, s, A) {
      const { W, H, u, tall } = m, items = (sc.items || []).filter(Boolean);
      const pad = (tall ? 90 : 200) * u, maxW = W - pad * 2;
      const tf = fit(g, sc.title || '', { weight: 800, family: th.font, size: (tall ? 100 : 84) * u, min: 40 * u, maxW, maxLines: 2 });
      const top = tall ? H * 0.16 : H * 0.17;
      reveal(g, tf.lines, { x: pad, y: top, size: tf.size, align: 'left', weight: 800, family: th.font, color: th.ink, A, s, delay: 0.1 });
      const len = sc.t1 - sc.t0, span = Math.max(0.4, (len - 1.6) / Math.max(1, items.length));
      const rowH = Math.min((tall ? 230 : 150) * u, (H - top - tf.lines.length * tf.size - 160 * u) / Math.max(1, items.length));
      const y0 = top + tf.lines.length * tf.size * 1.1 + 70 * u;
      items.forEach((it, i) => {
        const k = (s - 0.7 - i * span) / 0.45; if (k <= 0) return;
        const y = y0 + i * rowH, r = Math.min(rowH * 0.36, 52 * u), cx = pad + r;
        g.globalAlpha = A * easeOut(k);
        g.fillStyle = th.accent; g.beginPath(); g.arc(cx + (1 - easeOut(k)) * -40 * u, y + r * 0.2, r * back(k), 0, Math.PI * 2); g.fill();
        g.fillStyle = th.bg[0]; g.font = fontOf(800, r * 1.1, th.font); g.textAlign = 'center'; g.fillText(String(i + 1), cx, y + r * 0.6);
        const f = fit(g, it, { weight: 700, family: th.font, size: (tall ? 74 : 60) * u, min: 26 * u, maxW: maxW - r * 3, maxLines: 2 });
        f.lines.forEach((l, j) => text(g, l, { x: pad + r * 2.6, y: y + r * 0.6 + j * f.size * 1.1 - (f.lines.length - 1) * f.size * 0.4, size: f.size, weight: 700, family: th.font, color: th.ink, align: 'left', A, k }));
      });
      g.globalAlpha = A;
    },
    stat(g, m, th, sc, s, A) {
      const { W, H, u, tall } = m, v = +sc.value || 0, suffix = sc.suffix || '';
      const k = easeInOut((s - 0.2) / 1.6), cur = Math.round(v * k);
      const num = cur.toLocaleString(m.lang || 'en').replace(/,/g, ' ') + suffix;
      const pct = /%/.test(suffix) && v <= 100;
      const cy = tall ? H * 0.42 : H * 0.46;
      if (pct) {
        const R = (tall ? 330 : 300) * u;
        g.globalAlpha = A; g.lineCap = 'round';
        g.strokeStyle = rgba(th.ink, 0.10); g.lineWidth = 26 * u; g.beginPath(); g.arc(W / 2, cy, R, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = th.accent; g.beginPath(); g.arc(W / 2, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (v / 100) * k); g.stroke();
      }
      const f = fit(g, num, { weight: 800, family: th.font, size: (pct ? 190 : 230) * u, min: 60 * u, maxW: W - 200 * u, maxLines: 1 });
      g.globalAlpha = A * clamp(s / 0.3); g.font = fontOf(800, f.size, th.font); g.textAlign = 'center'; g.fillStyle = pct ? th.ink : th.accent;
      g.fillText(num, W / 2, cy + f.size * 0.35);
      const lf = fit(g, sc.label || '', { weight: 500, family: th.font, size: (tall ? 64 : 54) * u, min: 26 * u, maxW: W - (tall ? 160 : 400) * u, maxLines: 3 });
      const ly = pct ? cy + (tall ? 330 : 300) * u + 110 * u : cy + f.size * 0.35 + 110 * u;
      lf.lines.forEach((l, i) => text(g, l, { x: W / 2, y: ly + i * lf.size * 1.2, size: lf.size, weight: 500, family: th.font, color: th.muted, A, k: (s - 1.0 - i * 0.12) / 0.5 }));
      g.globalAlpha = A;
    },
    quote(g, m, th, sc, s, A) {
      const { W, H, u, tall } = m, pad = (tall ? 100 : 260) * u, maxW = W - pad * 2;
      g.globalAlpha = A * easeOut(s / 0.6); g.fillStyle = th.accent; g.font = fontOf(700, 420 * u, th.quoteFont || th.font); g.textAlign = 'left';
      g.fillText('“', pad - 30 * u, (tall ? H * 0.30 : H * 0.42) + (1 - easeOut(s / 0.6)) * 40 * u);
      const f = fit(g, sc.text, { weight: 400, family: th.quoteFont || th.font, size: (tall ? 92 : 78) * u, min: 34 * u, maxW, maxLines: tall ? 9 : 5 });
      const y0 = H / 2 - (f.lines.length * f.size * 1.25) / 2 + f.size * 0.8;
      const r = reveal(g, f.lines, { x: pad, y: y0, size: f.size, lh: 1.25, align: 'left', weight: 400, family: th.quoteFont || th.font, color: th.ink, A, s, delay: 0.4, stagger: Math.min(0.12, 2.6 / Math.max(10, f.lines.join(' ').split(' ').length)) });
      const ka = (s - 0.6 - r.words * Math.min(0.12, 2.6 / Math.max(10, r.words))) / 0.5;
      if (sc.author) { g.globalAlpha = A * easeOut(ka); g.fillStyle = th.accent; g.fillRect(pad, y0 + r.height + 20 * u, 60 * u * easeOut(ka), 6 * u); }
      text(g, sc.author, { x: pad + 80 * u, y: y0 + r.height + 40 * u, size: (tall ? 50 : 42) * u, weight: 600, family: th.font, color: th.muted, align: 'left', A, k: ka });
    },
    cta(g, m, th, sc, s, A) {
      const { W, H, u, tall } = m, maxW = W - (tall ? 140 : 300) * u;
      const f = fit(g, sc.title, { weight: 800, family: th.font, size: (tall ? 140 : 130) * u, min: 50 * u, maxW, maxLines: 3 });
      const block = f.lines.length * f.size * 1.08, y0 = H / 2 - block / 2 + f.size * 0.6 - 60 * u;
      const r = reveal(g, f.lines, { x: W / 2, y: y0, size: f.size, lh: 1.08, weight: 800, family: th.font, color: th.ink, A, s, delay: 0.1 });
      const after = 0.1 + r.words * 0.07 + 0.15;
      let y = y0 + block + 30 * u;
      if (sc.sub) { text(g, sc.sub, { x: W / 2, y: y + 20 * u, size: (tall ? 58 : 50) * u, weight: 500, family: th.font, color: th.muted, A, k: (s - after) / 0.5 }); y += 90 * u; }
      if (sc.handle) {
        const k = back((s - after - 0.2) / 0.5); if (k <= 0) return;
        const size = (tall ? 58 : 50) * u; g.font = fontOf(700, size, th.font);
        const w = g.measureText(sc.handle).width + 70 * u, h = size * 1.6, pulse = 1 + 0.03 * Math.sin((s - after) * 4);
        g.save(); g.globalAlpha = A * clamp(k); g.translate(W / 2, y + h / 2 + 20 * u); g.scale(k * pulse, k * pulse);
        g.fillStyle = th.accent2 || th.accent; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, h / 2); g.fill();
        g.fillStyle = th.bg[0]; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sc.handle, 0, 2 * u); g.restore();
      }
    },
  };

  // ---------- one frame
  function frame(g, film, m, t) {
    const th = film.theme;
    g.save(); g.setTransform(g.__vsScale || 1, 0, 0, g.__vsScale || 1, 0, 0);
    g.globalAlpha = 1; background(g, m, th, t);
    const sc = m.scenes.find(x => t >= x.t0 && t < x.t1) || m.scenes[m.scenes.length - 1];
    if (sc) {
      const s = t - sc.t0, len = sc.t1 - sc.t0, last = sc === m.scenes[m.scenes.length - 1];
      const out = last ? 0 : easeInOut((s - (len - 0.4)) / 0.4);   // the last scene stays to the end
      g.save(); g.translate(0, -out * 50 * m.u); g.globalAlpha = 1 - out;
      (DRAW[sc.type] || DRAW.title)(g, m, th, sc, s, 1 - out);
      g.restore();
    }
    if (film.progress !== false) { g.globalAlpha = 1; g.fillStyle = rgba(th.ink, 0.12); g.fillRect(0, m.H - 8 * m.u, m.W, 8 * m.u); g.fillStyle = th.accent; g.fillRect(0, m.H - 8 * m.u, m.W * clamp(t / m.dur), 8 * m.u); }
    g.restore();
  }

  // ---------- public: mount a film on a canvas (the preview page uses it too)
  function mount(canvas, film, scale = 1) {
    const m = build(film); m.lang = film.lang;
    const g = canvas.getContext('2d', { alpha: false });
    g.__vsScale = scale;
    return { model: m, draw: t => frame(g, film, m, clamp(t, 0, m.dur - 1e-6)), scenes: m.scenes.map(s => ({ name: (s.title || s.text || s.type).toString().slice(0, 40), t0: s.t0, t1: s.t1 })) };
  }
  window.VSEngine = { mount, build };

  // a film page (index.html + film.data.js): the VideoSpawner contract
  const canvas = document.getElementById('c');
  if (window.FILM && canvas) {
    const film = window.FILM;
    canvas.width = +film.w || 1920; canvas.height = +film.h || 1080;
    const f = mount(canvas, film);
    window.VH_SCENES = f.scenes;
    window.FILM_DURATION = f.model.dur;
    window.renderOut = t => f.draw(t);
    const ready = () => { f.draw(0); window.READY = true; };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(ready, ready);
  }
})();
