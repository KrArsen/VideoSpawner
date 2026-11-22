// A Remotion project on its Film details page: which composition the live preview plays, the build that makes the
// preview (seconds; it rebuilds by itself when the code changes) and the final render, which only the user starts.
import { h, api, toast } from './app.js';
import { icon, ic } from './icons.js';

const secs = c => c.durationInFrames / c.fps;
const len = s => s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : `${Math.round(s * 10) / 10} s`;

export async function remotionPanel(id) {
  let st = await api(`/api/project/${id}/remotion`).catch(() => null);
  if (!st?.remotion) return null;
  const box = h('section', { class: 'panel rem-panel' });
  const draw = () => {
    const videos = st.compositions.filter(c => !c.still);
    const sel = h('select', { 'aria-label': 'Composition', disabled: !videos.length || st.building },
      !st.composition ? h('option', { value: '' }, videos.length ? 'Choose a composition…' : '—') : null,
      videos.map(c => h('option', { value: c.id, selected: c.id === st.composition }, `${c.id} · ${c.width}×${c.height} · ${c.fps} fps · ${len(secs(c))}`)));
    sel.onchange = async () => {
      try { st = await api(`/api/project/${id}/remotion/select`, { method: 'POST', body: { composition: sel.value } }); toast(`Live preview plays ${sel.value}.`); draw(); }
      catch (e) { toast('Could not choose it: ' + e.message, true); }
    };
    const build = h('button', { disabled: st.building, title: 'Bundle the code for the live preview (it also rebuilds by itself when the code changes)', onclick: async () => {
      st.building = true; draw();
      try { st = await api(`/api/project/${id}/remotion/build`, { method: 'POST' }); toast(st.error ? 'Build failed: ' + st.error : `Built in ${Math.round((st.ms || 0) / 100) / 10} s.`, !!st.error); }
      catch (e) { toast('Build failed: ' + e.message, true); st.building = false; }
      draw();
    } }, ...(st.building ? [].concat(ic('hourglass', 'Building…')) : [].concat(ic('refresh', st.built ? 'Rebuild' : 'Build preview'))));
    const live = h('button', { class: 'primary', disabled: !st.composition, title: 'Plays from the code: no render, no tokens', onclick: () => location.hash = `#/review/${id}/~live` }, ic('play', 'Live preview'));
    const fin = h('button', { disabled: !st.composition, title: 'Remotion renders the final MP4 through the render queue (out\\<composition>-<time>.mp4)', onclick: async e => {
      const b = e.currentTarget; b.disabled = true;
      try { const j = await api(`/api/project/${id}/remotion/render`, { method: 'POST' }); toast(`Final render queued: ${j.output}. Follow it on the Renders page.`); }
      catch (err) { toast('Could not queue the render: ' + err.message, true); b.disabled = false; }
    } }, ic('renders', 'Render final'));
    box.replaceChildren(...[
      h('div', { class: 'rem-head' }, h('span', { class: 'rem-badge' }, 'Remotion'),
        h('b', {}, 'Live preview from the code'),
        h('span', { class: 'dim' }, st.built ? `entry ${st.entry}` : 'Build it once; after that it rebuilds by itself when the code changes.')),
      h('div', { class: 'row rem-row' }, sel, build, live, h('span', { class: 'spacer', style: { flex: 1 } }), fin),
      st.error ? h('div', { class: 'red rem-err' }, icon('warn'), ' ', st.error) : null,
      h('p', { class: 'dim rem-hint' }, 'Notes on the live preview get the exact frame picture from Remotion. The final render runs only when you press Render final.')].filter(Boolean));   // replaceChildren(null) would print "null"
  };
  draw();
  return box;
}
