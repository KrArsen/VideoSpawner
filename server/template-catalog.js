// The ready-made film templates: what each one is, its scenes and the sample text in every language.
// A template film is data (film.data.js) drawn by one shared engine (templates/engine/engine.js): making or changing
// one costs the agent a few hundred tokens instead of writing a film's code.

export const LANGUAGES = { uk: 'Українська', en: 'English', ru: 'Русский', pl: 'Polski' };

export const FORMATS = {
  '16:9': { w: 1920, h: 1080, label: '16:9 · YouTube' },
  '9:16': { w: 1080, h: 1920, label: '9:16 · Shorts, Reels, TikTok' },
  '1:1': { w: 1080, h: 1080, label: '1:1 · Feed' },
};

// colours and type of a film; copied into film.data.js so a film can be retuned by editing it
export const THEMES = {
  spawn: { name: 'Spawn', bg: ['#050505', '#0c1d14'], ink: '#f3f3f1', muted: '#9a9a96', accent: '#22d37f', accent2: '#ffd60a', font: 'Bahnschrift, "Segoe UI", sans-serif', quoteFont: 'Georgia, serif', motif: 'grid' },
  chalk: { name: 'Chalk', bg: ['#f2f2f0', '#dcdcd8'], ink: '#111111', muted: '#5c5c58', accent: '#ff4d2e', accent2: '#111111', font: '"Segoe UI", Arial, sans-serif', quoteFont: 'Georgia, serif', motif: 'dots' },
  neon: { name: 'Neon', bg: ['#0d0221', '#2a0845'], ink: '#ffffff', muted: '#b9a8d6', accent: '#ff2bd6', accent2: '#26f0ff', font: 'Bahnschrift, "Segoe UI", sans-serif', quoteFont: 'Georgia, serif', motif: 'rings' },
  ocean: { name: 'Ocean', bg: ['#021627', '#06375a'], ink: '#eaf6ff', muted: '#8fb4cc', accent: '#3fd2ff', accent2: '#ffd166', font: '"Segoe UI", sans-serif', quoteFont: 'Georgia, serif', motif: 'glow' },
  sunset: { name: 'Sunset', bg: ['#1f0710', '#5a1a24'], ink: '#fff3e8', muted: '#d9a99a', accent: '#ffb347', accent2: '#ff5e62', font: 'Bahnschrift, "Segoe UI", sans-serif', quoteFont: 'Georgia, serif', motif: 'glow' },
};

export const MUSIC = { pad: 'Calm pad', pulse: 'Light pulse', none: 'No music' };

// scene types the engine draws, and the fields each one has (the editor and hub_template use this)
export const SCENE_TYPES = {
  title: { label: 'Title', fields: { title: 'text', sub: 'text' }, dur: 3.5 },
  point: { label: 'Point', fields: { title: 'text', text: 'long' }, dur: 4.5 },
  list: { label: 'List', fields: { title: 'text', items: 'lines' }, dur: 7 },
  stat: { label: 'Number', fields: { value: 'number', suffix: 'short', label: 'text' }, dur: 3.5 },
  quote: { label: 'Quote', fields: { text: 'long', author: 'text' }, dur: 6 },
  cta: { label: 'Ending', fields: { title: 'text', sub: 'text', handle: 'short' }, dur: 3.5 },
};

const T = (uk, en, ru, pl) => ({ uk, en, ru, pl });

export const TEMPLATES = [
  {
    id: 'explainer', name: T('Пояснення', 'Explainer', 'Объяснение', 'Wyjaśnienie'),
    desc: T('Заголовок, три тези, фінал. Для YouTube.', 'A title, three points and an ending. For YouTube.', 'Заголовок, три тезиса, финал. Для YouTube.', 'Tytuł, trzy punkty i zakończenie. Na YouTube.'),
    format: '16:9', theme: 'spawn', music: 'pad',
    scenes: [
      { type: 'title', title: T('Як працює сон', 'How sleep works', 'Как работает сон', 'Jak działa sen'), sub: T('за 30 секунд', 'in 30 seconds', 'за 30 секунд', 'w 30 sekund') },
      { type: 'point', title: T('Мозок прибирає', 'The brain cleans up', 'Мозг убирается', 'Mózg sprząta'), text: T('Уночі він вимиває відходи, що накопичились за день.', 'At night it washes out the waste built up during the day.', 'Ночью он вымывает отходы, накопившиеся за день.', 'W nocy wypłukuje odpady zebrane w ciągu dnia.') },
      { type: 'point', title: T('Пам’ять зберігається', 'Memories are saved', 'Память сохраняется', 'Wspomnienia się utrwalają'), text: T('Під час глибокого сну нове переходить у довгу пам’ять.', 'Deep sleep moves new things into long-term memory.', 'Во время глубокого сна новое уходит в долгую память.', 'Głęboki sen przenosi nowe rzeczy do pamięci długotrwałej.') },
      { type: 'point', title: T('Тіло відновлюється', 'The body repairs', 'Тело восстанавливается', 'Ciało się regeneruje'), text: T('Росте м’язова тканина, падає тиск, серце відпочиває.', 'Muscle grows, blood pressure drops, the heart rests.', 'Растут мышцы, падает давление, сердце отдыхает.', 'Rosną mięśnie, spada ciśnienie, serce odpoczywa.') },
      { type: 'cta', title: T('Спи 7–9 годин', 'Sleep 7–9 hours', 'Спи 7–9 часов', 'Śpij 7–9 godzin'), sub: T('Підпишись, щоб знати більше', 'Subscribe to learn more', 'Подпишись, чтобы узнать больше', 'Subskrybuj, by wiedzieć więcej'), handle: '' },
    ],
  },
  {
    id: 'top5', name: T('Топ-5', 'Top 5', 'Топ-5', 'Top 5'),
    desc: T('Вертикальний список для Shorts і Reels.', 'A vertical list for Shorts and Reels.', 'Вертикальный список для Shorts и Reels.', 'Pionowa lista na Shorts i Reels.'),
    format: '9:16', theme: 'neon', music: 'pulse',
    scenes: [
      { type: 'title', title: T('5 звичок успішних людей', '5 habits of successful people', '5 привычек успешных людей', '5 nawyków ludzi sukcesu'), sub: T('№1 тебе здивує', '#1 will surprise you', '№1 тебя удивит', 'Nr 1 cię zaskoczy') },
      { type: 'list', title: T('Вони щодня…', 'Every day they…', 'Каждый день они…', 'Codziennie…'), items: [T('Встають рано', 'Wake up early', 'Встают рано', 'Wstają wcześnie'), T('Читають 20 хвилин', 'Read for 20 minutes', 'Читают 20 минут', 'Czytają 20 minut'), T('Рухаються', 'Move their body', 'Двигаются', 'Ruszają się'), T('Планують день', 'Plan the day', 'Планируют день', 'Planują dzień'), T('Кажуть «ні»', 'Say “no”', 'Говорят «нет»', 'Mówią „nie”')] },
      { type: 'cta', title: T('Яка звичка твоя?', 'Which one is yours?', 'Какая привычка твоя?', 'Który jest twój?'), sub: T('Пиши в коментарях', 'Tell me in the comments', 'Пиши в комментариях', 'Napisz w komentarzu'), handle: '@videospawner' },
    ],
  },
  {
    id: 'quote', name: T('Цитата', 'Quote', 'Цитата', 'Cytat'),
    desc: T('Одна сильна фраза й автор.', 'One strong line and its author.', 'Одна сильная фраза и автор.', 'Jedno mocne zdanie i autor.'),
    format: '9:16', theme: 'sunset', music: 'pad',
    scenes: [
      { type: 'quote', text: T('Найкращий час посадити дерево був двадцять років тому. Наступний найкращий — сьогодні.', 'The best time to plant a tree was twenty years ago. The second best time is now.', 'Лучшее время посадить дерево было двадцать лет назад. Следующее лучшее — сегодня.', 'Najlepszy czas na posadzenie drzewa był dwadzieścia lat temu. Drugi najlepszy jest dziś.'), author: T('Китайське прислів’я', 'Chinese proverb', 'Китайская пословица', 'Chińskie przysłowie'), dur: 7 },
      { type: 'cta', title: T('Почни сьогодні', 'Start today', 'Начни сегодня', 'Zacznij dziś'), sub: '', handle: '@videospawner' },
    ],
  },
  {
    id: 'stats', name: T('Цифри', 'By the numbers', 'Цифры', 'Liczby'),
    desc: T('Великі числа, що рахуються на екрані.', 'Big numbers that count up on screen.', 'Большие числа, которые считаются на экране.', 'Duże liczby, które liczą się na ekranie.'),
    format: '16:9', theme: 'ocean', music: 'pulse',
    scenes: [
      { type: 'title', title: T('Океан у цифрах', 'The ocean in numbers', 'Океан в цифрах', 'Ocean w liczbach'), sub: T('три факти', 'three facts', 'три факта', 'trzy fakty') },
      { type: 'stat', value: 71, suffix: '%', label: T('поверхні Землі вкрито водою', 'of Earth’s surface is water', 'поверхности Земли покрыто водой', 'powierzchni Ziemi to woda') },
      { type: 'stat', value: 11034, suffix: T(' м', ' m', ' м', ' m'), label: T('глибина Маріанської западини', 'deep: the Mariana Trench', 'глубина Марианской впадины', 'głębokość Rowu Mariańskiego') },
      { type: 'stat', value: 80, suffix: '%', label: T('океану ще не досліджено', 'of the ocean is still unexplored', 'океана ещё не исследовано', 'oceanu wciąż niezbadane') },
      { type: 'cta', title: T('Більше фактів щотижня', 'More facts every week', 'Больше фактов каждую неделю', 'Więcej faktów co tydzień'), sub: '', handle: '@videospawner' },
    ],
  },
  {
    id: 'promo', name: T('Анонс', 'Announcement', 'Анонс', 'Zapowiedź'),
    desc: T('Короткий анонс продукту чи події.', 'A short product or event announcement.', 'Короткий анонс продукта или события.', 'Krótka zapowiedź produktu lub wydarzenia.'),
    format: '9:16', theme: 'spawn', music: 'pulse',
    scenes: [
      { type: 'title', title: T('Новий курс уже тут', 'The new course is here', 'Новый курс уже здесь', 'Nowy kurs już jest'), sub: T('Монтаж за 7 днів', 'Video editing in 7 days', 'Монтаж за 7 дней', 'Montaż w 7 dni') },
      { type: 'point', title: T('Без досвіду', 'No experience needed', 'Без опыта', 'Bez doświadczenia'), text: T('Почнеш з нуля і зробиш перше відео вже завтра.', 'Start from zero and make your first video tomorrow.', 'Начнёшь с нуля и сделаешь первое видео уже завтра.', 'Zaczniesz od zera i zrobisz pierwszy film jutro.') },
      { type: 'point', title: T('Практика щодня', 'Practice every day', 'Практика каждый день', 'Praktyka codziennie'), text: T('Сім коротких уроків і завдання після кожного.', 'Seven short lessons, a task after each one.', 'Семь коротких уроков и задание после каждого.', 'Siedem krótkich lekcji i zadanie po każdej.') },
      { type: 'cta', title: T('Старт у понеділок', 'Starts Monday', 'Старт в понедельник', 'Start w poniedziałek'), sub: T('Посилання в профілі', 'Link in bio', 'Ссылка в профиле', 'Link w bio'), handle: '@videospawner' },
    ],
  },
];

const pick = (v, lang) => (v && typeof v === 'object' && !Array.isArray(v)) ? (v[lang] ?? v.en ?? '') : v;

// a template's scenes in one language, every scene with its length
export function sampleScenes(tpl, lang) {
  return tpl.scenes.map(s => {
    const out = { type: s.type, dur: s.dur || SCENE_TYPES[s.type].dur };
    for (const [k, v] of Object.entries(s)) if (k !== 'type' && k !== 'dur') out[k] = Array.isArray(v) ? v.map(x => pick(x, lang)) : pick(v, lang);
    if (s.type === 'list') out.dur = Math.max(out.dur, 2 + out.items.length * 1.1);
    return out;
  });
}

// the catalog as the UI and the agent see it (one language)
export function catalog(lang = 'en') {
  return {
    languages: LANGUAGES, formats: FORMATS, music: MUSIC, sceneTypes: SCENE_TYPES,
    themes: Object.fromEntries(Object.entries(THEMES).map(([k, v]) => [k, v])),
    templates: TEMPLATES.map(t => ({ id: t.id, name: pick(t.name, lang), desc: pick(t.desc, lang), format: t.format, theme: t.theme, music: t.music, scenes: sampleScenes(t, lang) })),
  };
}
