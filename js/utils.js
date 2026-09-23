// ============================================================
// utils.js — маленькие помощники: даты, id, экранирование текста.
// ============================================================

const U = {
  // Уникальный id. Формат UUID выбран специально: такие же id
  // использует Supabase, поэтому локальные записи потом можно
  // перенести в облако без переделки.
  uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  },

  // Дата в виде 'ГГГГ-ММ-ДД' по МЕСТНОМУ времени.
  // (toISOString() даёт время по Гринвичу — ночью дата «уехала» бы на день.)
  dayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  today() {
    return U.dayKey(new Date());
  },

  fromKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  },

  addDays(key, n) {
    const date = U.fromKey(key);
    date.setDate(date.getDate() + n);
    return U.dayKey(date);
  },

  nowIso() {
    return new Date().toISOString();
  },

  // «среда, 23 сентября»
  longDate(key) {
    return new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
      .format(U.fromKey(key));
  },

  // «23 сент.»
  shortDate(key) {
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(U.fromKey(key));
  },

  // «пн», «вт»…
  weekday(key) {
    return new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(U.fromKey(key));
  },

  // Человеческое название дня: «сегодня», «завтра», «вчера» или дата.
  relDay(key) {
    if (!key) return 'потом';
    const t = U.today();
    if (key === t) return 'сегодня';
    if (key === U.addDays(t, 1)) return 'завтра';
    if (key === U.addDays(t, -1)) return 'вчера';
    return U.shortDate(key);
  },

  // Защита от «поломки» разметки: если в названии задачи будет <b> или <script>,
  // он покажется как обычный текст, а не выполнится.
  esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // Склонение: U.plural(5, ['дело', 'дела', 'дел']) → «дел»
  plural(n, [one, few, many]) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  },

  pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  },

  // Одна и та же фраза на весь день (чтобы текст не прыгал при каждом клике).
  pickForDay(list, salt = '') {
    const s = U.today() + salt;
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return list[h % list.length];
  },

  // 125 секунд → «02:05»
  clock(totalSeconds) {
    const s = Math.max(0, Math.round(totalSeconds));
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  },

  hh(hour) {
    return `${String(hour).padStart(2, '0')}:00`;
  },
};
