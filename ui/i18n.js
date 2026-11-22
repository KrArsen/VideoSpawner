// Interface language. The UI is written in English; with Russian chosen (Settings → Interface language) a translator
// watches the page and replaces known English texts, tooltips and placeholders as they appear. The user's own content
// (note text, paths, code, timecodes) is not in the dictionary and stays as it is. Unknown strings stay English.
const KEY = 'vs-ui-lang';
export const LANGS = { en: 'English', ru: 'Русский' };
export function uiLang() { try { return localStorage.getItem(KEY) === 'ru' ? 'ru' : 'en'; } catch { return 'en'; } }
export function setUiLang(v) { try { localStorage.setItem(KEY, v === 'ru' ? 'ru' : 'en'); } catch { } location.reload(); }

const RU = {
  // rail, top bar, pages
  'Films': 'Фильмы', 'Now': 'Сейчас', 'Skills': 'Скиллы', 'Renders': 'Рендеры', 'Cleanup': 'Очистка', 'Settings': 'Настройки',
  'Recent renders': 'Последние рендеры', 'Review': 'Просмотр', 'Files': 'Файлы', 'Film details': 'О фильме', 'Plan': 'План',
  'Render…': 'Рендер…', 'Protection off': 'Защита выкл.', 'Live from code': 'Из кода, вживую', 'Needs you': 'Ждёт тебя', 'Finished': 'Закончил', 'Working': 'Работает',
  // Films
  'Rescan': 'Обновить', 'Import project': 'Импорт проекта', 'Search films': 'Поиск фильмов', 'Search by name or folder': 'Поиск по имени или папке',
  'films': 'фильмов', 'film': 'фильм', 'on disk': 'на диске', 'render leftovers': 'остатки рендеров', 'open notes': 'открытых заметок',
  'RECENT RENDERS': 'ПОСЛЕДНИЕ РЕНДЕРЫ', 'ALL FILMS': 'ВСЕ ФИЛЬМЫ', 'Outputs folder': 'Папка готовых видео', 'View all': 'Все', 'Open video': 'Открыть видео', 'Show in folder': 'Показать в папке',
  'All statuses': 'Все статусы', 'All types': 'Все типы', 'All folders': 'Все папки', 'Recently updated': 'Недавно изменённые', 'Name': 'Имя', 'Size': 'Размер',
  'in progress': 'в работе', 'review': 'на проверке', 'revision': 'правки', 'approved': 'одобрено', 'published': 'опубликовано', 'archived': 'в архиве', 'done': 'готово',
  'Live code': 'Код вживую', 'Latest MP4': 'Последний MP4', 'Live': 'Вживую', 'chunked': 'по частям', 'code': 'код', 'other': 'другое', 'New': 'Новое',
  'No completed renders yet. Videos will appear here when they finish.': 'Готовых рендеров пока нет. Видео появятся здесь, когда закончатся.',
  'Look for new and changed films in the watched folders': 'Найти новые и изменённые фильмы в отслеживаемых папках',
  // Import
  'Choose another folder…': 'Выбрать другую папку…', 'Close': 'Закрыть', 'Add': 'Добавить', 'Added': 'Добавлено', 'Adding…': 'Добавляю…', 'Already here': 'Уже здесь',
  'Looking for your Claude Code projects…': 'Ищу твои проекты Claude Code…', 'Remotion project': 'Проект Remotion', 'film project': 'проект фильма', 'no films found yet': 'фильмов пока нет',
  // film details
  'Live preview (no render)': 'Живой просмотр (без рендера)', 'Review latest video': 'Смотреть последнее видео', 'Open folder': 'Открыть папку', 'Finish film…': 'Завершить фильм…', 'Remove…': 'Убрать…',
  'Live preview from the code': 'Живой просмотр из кода', 'Rebuild': 'Пересобрать', 'Build preview': 'Собрать просмотр', 'Building…': 'Собираю…', 'Live preview': 'Живой просмотр', 'Render final': 'Финальный рендер',
  'Choose a composition…': 'Выбери композицию…',
  'Notes on the live preview get the exact frame picture from Remotion. The final render runs only when you press Render final.': 'Заметки в живом просмотре получают точный кадр от Remotion. Финальный рендер запускается только кнопкой «Финальный рендер».',
  'Claude chats in this folder': 'Чаты Claude в этой папке', "Pick the chat you paste this film's notes into.": 'Выбери чат, в который вставляешь заметки этого фильма.',
  'Notes go here': 'Заметки сюда', 'Open this chat': 'Открыть этот чат',
  'FILE': 'ФАЙЛ', 'TYPE': 'ТИП', 'DURATION': 'ДЛИТЕЛЬНОСТЬ', 'RESOLUTION': 'РАЗРЕШЕНИЕ', 'SIZE': 'РАЗМЕР', 'DATE': 'ДАТА', 'Watch / add notes': 'Смотреть / заметки', 'Show': 'Показать',
  'Status': 'Статус', 'Folder': 'Папка', 'Type': 'Тип', 'Script': 'Скрипт', 'FPS / chunk': 'FPS / часть', 'Partial render': 'Частичный рендер', 'File count': 'Файлов', 'unavailable': 'недоступно',
  'final with audio': 'финал со звуком', 'test clip': 'тестовый клип',
  // Review
  'Tip': 'Подсказка', 'Click the video → type your note': 'Кликни по видео → напиши заметку', 'play / pause': 'старт / пауза', 'frame by frame': 'по кадрам',
  'rewind · stop · fast forward': 'назад · стоп · вперёд', 'all shortcuts': 'все клавиши', 'Got it': 'Понятно', 'Scan': 'Скан', 'Reload': 'Перезагрузить', 'Help': 'Помощь',
  'Range start': 'Начало отрезка', 'Range end': 'Конец отрезка', 'no range selected': 'отрезок не выбран', 'Add note': 'Заметка',
  'whole film': 'весь фильм', 'Film audio': 'Звук фильма', 'Scenes': 'Сцены', 'Notes': 'Заметки', 'Added music': 'Добавленная музыка', 'Added effects': 'Добавленные эффекты',
  'Sounds': 'Звуки', 'Open': 'Открытые', 'All': 'Все', 'Fixed': 'Исправлено', 'Edit': 'Изменить', 'Delete': 'Удалить', 'frame image': 'кадр', 'just now': 'только что',
  'No notes yet. Click a problem area in the video to place a marker, write your note, then press Enter. Use the tools on the left to draw.': 'Заметок пока нет. Кликни по проблемному месту в видео, напиши заметку и нажми Enter. Слева — инструменты для рисования.',
  'Enter save · Shift+Enter new line · Esc close': 'Enter — сохранить · Shift+Enter — новая строка · Esc — закрыть',
  'Check fixes': 'Проверить правки', 'Copy again': 'Скопировать снова', 'send straight to it': 'отправить ему напрямую',
  // Renders, cleanup
  'Render queue': 'Очередь рендеров', 'Running renders': 'Идущие рендеры', 'No renders are running or waiting.': 'Сейчас нет рендеров.', 'Refresh': 'Обновить',
  'Render protection': 'Защита рендера', 'Render speed': 'Скорость рендера', 'Render leftovers': 'Остатки рендеров', 'Nothing to clean.': 'Нечего чистить.', 'Films with leftovers': 'Фильмы с остатками',
  // Settings
  'Settings for this computer.': 'Настройки этого компьютера.', 'RENDER PROTECTION': 'ЗАЩИТА РЕНДЕРА', 'AGENT NAME': 'ИМЯ АГЕНТА', 'AGENT ACTIVITY': 'АКТИВНОСТЬ АГЕНТА', 'RENDER LEFTOVERS': 'ОСТАТКИ РЕНДЕРОВ',
  'Speed': 'Скорость', 'Full power': 'Максимум', 'Balanced': 'Баланс', 'Quiet': 'Тихо', 'Temporary': 'Временно', 'Render power': 'Мощность рендера', 'Run renders at low priority': 'Рендер с низким приоритетом',
  'Save': 'Сохранить', 'Cancel': 'Отмена', 'Watched folders': 'Отслеживаемые папки', 'Archive folder': 'Папка архива', 'Other folders': 'Другие папки', 'Tools': 'Инструменты', 'Workspace': 'Рабочая папка',
  'Show agent activity': 'Показывать активность агента', 'Ask about render leftovers': 'Спрашивать про остатки рендеров', 'The name shown on review buttons.': 'Имя на кнопках просмотра.',
  'Optional parts on this computer': 'Дополнительные части на этом компьютере', 'Interface language': 'Язык интерфейса', 'About VideoSpawner': 'О VideoSpawner',
  'Enabled': 'Вкл.', 'Remove': 'Убрать', 'Choose folder…': 'Выбрать папку…', 'Remove all': 'Убрать всё',
  // Now, skills
  'Agent sessions working now': 'Сессии агентов сейчас', 'Agent activity is off.': 'Активность агентов выключена.', 'Search skills': 'Поиск скиллов', 'Last action': 'Последнее действие',
};
const RULES = [
  [/^Copy for (.+) \((\d+)\)$/, 'Скопировать для $1 ($2)'],
  [/^(\d+) films?$/, '$1 фильм(ов)'],
  [/^(\d+) films?( · .+)?$/, (m, n, rest) => `${n} фильм(ов)${rest ? tr(rest) : ''}`],
  [/^ · last scan (.+)$/, (m, a) => ` · последний скан ${tr(a)}`],
  [/^last scan (.+)$/, (m, a) => `последний скан ${tr(a)}`],
  [/^last used (.+)$/, (m, a) => `использован ${tr(a)}`],
  [/^(\d+) min ago$/, '$1 мин назад'], [/^(\d+) h ago$/, '$1 ч назад'], [/^(\d+) hours? ago$/, '$1 ч назад'], [/^(\d+) days? ago$/, '$1 дн назад'], [/^(\d+) m ago$/, '$1 мин назад'],
  [/^Versions · (\d+)$/i, 'Версии · $1'], [/^VERSIONS · (\d+)$/, 'ВЕРСИИ · $1'],
  [/^Copied (\d+) notes?\. Paste into (.+) \(Ctrl\+V\) and press Enter\.$/, 'Скопировано заметок: $1. Вставь в $2 (Ctrl+V) и нажми Enter.'],
  [/^(\d+) film folders? inside$/, 'внутри папок фильмов: $1'], [/^(\d+) videos?$/, 'видео: $1'],
];
function tr(s) {
  if (RU[s]) return RU[s];
  for (const [re, to] of RULES) if (re.test(s)) return s.replace(re, to);
  return null;
}
const SKIP = 'textarea, input, code, pre, .mono, .note-text, .rv2-ntext, script, style, [data-no-tr]';
function textNode(n) {
  const v = n.nodeValue; if (!v || !/[A-Za-z]/.test(v)) return;
  const p = n.parentElement; if (!p || p.closest(SKIP)) return;
  const t = v.trim(); if (!t || t.length > 300) return;
  const out = tr(t); if (out && out !== t) n.nodeValue = v.replace(t, out);
}
function attrs(el) {
  for (const a of ['title', 'placeholder', 'aria-label']) { const v = el.getAttribute?.(a); if (v && /[A-Za-z]/.test(v)) { const o = tr(v.trim()); if (o) el.setAttribute(a, o); } }
}
function walk(root) {
  if (root.nodeType === 3) return textNode(root);
  if (root.nodeType !== 1 || root.closest?.('script, style')) return;
  attrs(root);
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = it.nextNode(); n; n = it.nextNode()) n.nodeType === 3 ? textNode(n) : attrs(n);
}
export function startTranslator() {
  if (uiLang() !== 'ru') return;
  document.documentElement.lang = 'ru';
  walk(document.body);
  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === 'characterData') textNode(m.target);
      else if (m.type === 'attributes') attrs(m.target);
      else for (const n of m.addedNodes) walk(n);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'placeholder', 'aria-label'] });
}
