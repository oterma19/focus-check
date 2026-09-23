// ============================================================
// config.js — единственное место с настройками подключения.
// ============================================================
//
// Сейчас приложение работает ЛОКАЛЬНО: все данные лежат в этом браузере
// (localStorage). Интернет и сервер не нужны.
//
// Когда будете подключать Supabase (см. README.md, раздел «Supabase»):
//   1. Вставьте SUPABASE_URL и SUPABASE_ANON_KEY из панели Supabase
//      (Project Settings → API).
//   2. Поменяйте DATA_MODE на 'supabase'.
//   3. Раскомментируйте строку с библиотекой supabase-js в focus-check.html.
//
// Публичный ключ (anon / publishable) МОЖНО хранить в коде страницы —
// он и задуман публичным. Защиту данных обеспечивает Row Level Security
// в базе (supabase/schema.sql). А вот service_role / secret-ключ сюда
// класть НЕЛЬЗЯ никогда.

const CONFIG = {
  APP_NAME: 'Focus Check',
  VERSION: '1.0.0',

  // 'local'    — данные в этом браузере (сейчас)
  // 'supabase' — данные в облаке, вход через Google (потом)
  DATA_MODE: 'local',

  SUPABASE_URL: '',        // пример: 'https://abcdefgh.supabase.co'
  SUPABASE_ANON_KEY: '',   // пример: 'eyJhbGciOi...' или 'sb_publishable_...'

  // Префикс ключей в localStorage. Если поменять — приложение «забудет» старые данные.
  STORAGE_PREFIX: 'focuscheck.v1.',
};
