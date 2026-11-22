// The Claude Code chats that worked on this film's folder, on its Film details page. "Notes go here" remembers which
// chat the user pastes this film's notes into (the "Copy for Claude" toast and prompt name it); "Open this chat" copies
// the command that resumes exactly that chat in a terminal. Nothing is sent anywhere.
import { h, api, toast, AGO } from './app.js';
import { icon, ic } from './icons.js';

const KEY = id => 'vs-chat-' + id;
export function chosenChat(projectId) { try { return JSON.parse(localStorage.getItem(KEY(projectId)) || 'null'); } catch { return null; } }
const choose = (projectId, chat) => { try { chat ? localStorage.setItem(KEY(projectId), JSON.stringify({ id: chat.id, title: chat.title })) : localStorage.removeItem(KEY(projectId)); } catch { } };
const label = c => c.title || 'Chat ' + c.id.slice(0, 8);
const quote = s => /[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;

export async function chatsPanel(projectId) {
  const r = await api(`/api/project/${projectId}/chats`).catch(() => null);
  const chats = r?.chats || [];
  if (!chats.length) return null;
  const box = h('section', { class: 'panel chats-panel' });
  const draw = () => {
    const cur = chosenChat(projectId);
    box.replaceChildren(
      h('div', { class: 'chats-head' }, h('b', {}, 'Claude chats in this folder'), h('span', { class: 'dim' }, 'Pick the chat you paste this film\'s notes into.')),
      ...chats.slice(0, 8).map(c => {
        const on = cur?.id === c.id;
        return h('div', { class: 'chat-row' + (on ? ' on' : '') },
          h('div', { class: 'chat-main' }, h('b', {}, label(c)), h('span', { class: 'dim' }, `last used ${AGO(c.lastActive)}${c.cwd ? ' · ' : ''}`, c.cwd ? h('span', { class: 'mono' }, c.cwd) : null)),
          h('button', { class: on ? 'sm on' : 'sm', title: 'The "Copy for Claude" prompt is for this chat', onclick: () => { choose(projectId, on ? null : c); draw(); toast(on ? 'No chat chosen.' : `Notes for this film go to "${label(c)}".`); } }, ...(on ? [].concat(ic('check', 'Notes go here')) : ['Notes go here'])),
          h('button', { class: 'sm ghost', title: 'Copies the command that opens exactly this chat in Claude Code (paste it into a terminal)', onclick: async () => {
            const cmd = `cd ${quote(c.cwd)}; claude --resume ${c.id}`;
            try { await navigator.clipboard.writeText(cmd); toast('Command copied: paste it into a terminal to open this chat.'); } catch { toast(cmd); }
          } }, icon('send'), ' Open this chat'));
      }));
  };
  draw();
  return box;
}
