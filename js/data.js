// ============================================================
// data.js — СЛОЙ ДАННЫХ.
// ============================================================
//
// Идея простая: остальной код НЕ знает, где лежат данные.
// Он вызывает только методы «адаптера»:
//
//   loadAll()              → { tasks: [...], habits: [...], ... }
//   upsert(table, row)     → сохранить (создать или обновить) запись
//   remove(table, id)      → удалить запись
//   loadSettings()         → объект настроек или null
//   saveSettings(settings)
//   importAll(db)          → заменить все данные (восстановление из резервной копии)
//   clearAll()             → стереть всё
//
// Сейчас работает LocalAdapter (localStorage браузера).
// Потом включится SupabaseAdapter — у него ТЕ ЖЕ методы,
// поэтому экраны и логику переписывать не придётся.
//
// Названия полей специально в стиле snake_case (task_id, created_at):
// так же будут называться колонки в Supabase, и ничего не надо переименовывать.

// Список «таблиц». Такие же таблицы описаны в supabase/schema.sql.
const TABLES = ['tasks', 'habits', 'habit_checks', 'hourly_entries', 'focus_sessions', 'day_notes', 'runs'];

// ------------------------------------------------------------
// 1. Локальный адаптер: всё хранится в localStorage этого браузера.
// ------------------------------------------------------------
const LocalAdapter = {
  name: 'local',

  key(name) {
    return CONFIG.STORAGE_PREFIX + name;
  },

  read(name, fallback) {
    try {
      const raw = localStorage.getItem(this.key(name));
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.warn('Не удалось прочитать', name, err);
      return fallback;
    }
  },

  write(name, value) {
    // Если место закончилось или хранилище запрещено — будет исключение,
    // его поймает Store и покажет мягкое сообщение.
    localStorage.setItem(this.key(name), JSON.stringify(value));
  },

  async loadAll() {
    const db = {};
    for (const table of TABLES) db[table] = this.read(table, []);
    return db;
  },

  async upsert(table, row) {
    const rows = this.read(table, []);
    const index = rows.findIndex((r) => r.id === row.id);
    if (index >= 0) rows[index] = row;
    else rows.push(row);
    this.write(table, rows);
  },

  async remove(table, id) {
    const rows = this.read(table, []).filter((r) => r.id !== id);
    this.write(table, rows);
  },

  async loadSettings() {
    return this.read('settings', null);
  },

  async saveSettings(settings) {
    this.write('settings', settings);
  },

  async importAll(db) {
    for (const table of TABLES) this.write(table, Array.isArray(db[table]) ? db[table] : []);
  },

  async clearAll() {
    for (const table of TABLES) localStorage.removeItem(this.key(table));
    localStorage.removeItem(this.key('settings'));
    localStorage.removeItem(this.key('active_focus'));
  },
};

// ------------------------------------------------------------
// 2. Облачный адаптер Supabase — ЗАГОТОВКА.
// Сейчас не используется (CONFIG.DATA_MODE = 'local').
// Код написан по документации supabase-js v2, но проверить его
// можно только после создания проекта в Supabase.
// ------------------------------------------------------------
const SupabaseAdapter = {
  name: 'supabase',
  client: null, // создаётся в Auth.init()

  async loadAll() {
    const db = {};
    for (const table of TABLES) {
      // RLS в базе сам отфильтрует записи: придут только ваши.
      const { data, error } = await this.client.from(table).select('*');
      if (error) throw error;
      db[table] = data || [];
    }
    return db;
  },

  async upsert(table, row) {
    // user_id не передаём: в базе он заполняется автоматически (default auth.uid()).
    const { error } = await this.client.from(table).upsert(row);
    if (error) throw error;
  },

  async remove(table, id) {
    const { error } = await this.client.from(table).delete().eq('id', id);
    if (error) throw error;
  },

  async loadSettings() {
    const { data, error } = await this.client.from('profiles').select('settings').maybeSingle();
    if (error) throw error;
    return data ? data.settings : null;
  },

  async saveSettings(settings) {
    const { error } = await this.client
      .from('profiles')
      .upsert({ id: Auth.user.id, settings, updated_at: U.nowIso() });
    if (error) throw error;
  },

  async importAll(db) {
    for (const table of TABLES) {
      const rows = (db[table] || []).map(({ user_id, ...rest }) => rest);
      if (!rows.length) continue;
      const { error } = await this.client.from(table).upsert(rows);
      if (error) throw error;
    }
  },

  async clearAll() {
    for (const table of TABLES) {
      // Удалит только ваши записи — остальные не видны из-за RLS.
      const { error } = await this.client.from(table).delete().not('id', 'is', null);
      if (error) throw error;
    }
  },
};

// ------------------------------------------------------------
// 3. Фасад: остальной код обращается только к Data.adapter.
// ------------------------------------------------------------
const Data = {
  adapter: LocalAdapter,

  use(adapter) {
    this.adapter = adapter;
  },

  // Перенос локальных данных в облако при первом входе через Google.
  // Работает, потому что id — UUID и совпадают по формату с Supabase.
  async migrateLocalToCloud() {
    const db = await LocalAdapter.loadAll();
    const settings = await LocalAdapter.loadSettings();
    await SupabaseAdapter.importAll(db);
    if (settings) await SupabaseAdapter.saveSettings(settings);
  },
};
