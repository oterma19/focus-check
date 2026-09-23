// ============================================================
// store.js — состояние приложения в памяти.
// ============================================================
//
// Схема работы:
//   1. При запуске Store.load() берёт все данные из адаптера.
//   2. Экраны читают данные из Store.db (быстро, без ожидания).
//   3. Любое изменение идёт через Store.save / Store.remove:
//      сначала обновляется память и экран, потом данные тихо
//      сохраняются в адаптер. Это называется «оптимистичный интерфейс» —
//      так же удобно будет работать и с облаком.

const DEFAULT_SETTINGS = {
  name: '',
  theme: 'auto',        // 'auto' | 'light' | 'dark'
  focus_minutes: 5,     // длина фокус-сессии по умолчанию
  day_start: 8,         // почасовой чек-лист: с какого часа
  day_end: 22,          // …и до какого
  sound: true,          // мягкий звук в конце фокуса
  hourly_nudge: true,   // тихое напоминание «новый час» (пока приложение открыто)
  reminders: true,      // напоминания о делах со временем
  remind_before: 5,     // за сколько минут напоминать
  onboarded: false,     // показывали ли знакомство
};

const Store = {
  db: {},
  settings: { ...DEFAULT_SETTINGS },
  listeners: [],

  async load() {
    this.db = await Data.adapter.loadAll();
    for (const table of TABLES) if (!Array.isArray(this.db[table])) this.db[table] = [];
    const saved = await Data.adapter.loadSettings();
    this.settings = { ...DEFAULT_SETTINGS, ...(saved || {}) };
  },

  // Подписка на изменения: app.js перерисовывает экран.
  subscribe(fn) {
    this.listeners.push(fn);
  },

  changed() {
    this.listeners.forEach((fn) => fn());
  },

  find(table, id) {
    return this.db[table].find((r) => r.id === id);
  },

  // Сохранить запись. options.silent = true → без перерисовки экрана
  // (нужно, например, когда человек печатает в поле и фокус нельзя сбивать).
  save(table, row, options = {}) {
    row.updated_at = U.nowIso();
    const rows = this.db[table];
    const index = rows.findIndex((r) => r.id === row.id);
    if (index >= 0) rows[index] = row;
    else rows.push(row);
    this.persist(() => Data.adapter.upsert(table, row));
    if (!options.silent) this.changed();
    return row;
  },

  remove(table, id, options = {}) {
    this.db[table] = this.db[table].filter((r) => r.id !== id);
    this.persist(() => Data.adapter.remove(table, id));
    if (!options.silent) this.changed();
  },

  saveSettings(patch, options = {}) {
    this.settings = { ...this.settings, ...patch };
    this.persist(() => Data.adapter.saveSettings(this.settings));
    if (!options.silent) this.changed();
  },

  // Все записи идут через одно место и строго по очереди:
  // так «слон» всегда сохранится раньше своих кусочков (важно для облака).
  queue: Promise.resolve(),
  persist(job) {
    this.queue = this.queue
      .then(job)
      .catch((err) => {
        console.error('Ошибка сохранения', err);
        UI.toast('Не получилось сохранить. Проверьте, не запрещено ли хранилище в браузере.');
      });
  },

  // Резервная копия: всё в одном объекте.
  snapshot() {
    return {
      app: CONFIG.APP_NAME,
      version: CONFIG.VERSION,
      exported_at: U.nowIso(),
      settings: this.settings,
      db: this.db,
    };
  },

  async restore(snapshot) {
    const db = {};
    for (const table of TABLES) db[table] = Array.isArray(snapshot.db?.[table]) ? snapshot.db[table] : [];
    await Data.adapter.importAll(db);
    await Data.adapter.saveSettings({ ...DEFAULT_SETTINGS, ...(snapshot.settings || {}), onboarded: true });
  },
};
