// ============================================================
// auth.js — кто пользуется приложением.
// ============================================================
//
// Локальный режим: «пользователь» один — вы, в этом браузере.
// Облачный режим (потом): вход через Google с помощью Supabase Auth.
//
// ВАЖНО на будущее: вход через Google НЕ работает, если открыть
// файл двойным кликом (адрес вида file:///C:/...). Google должен
// вернуть вас на настоящий адрес сайта: http://localhost:... при
// разработке или https://ваш-сайт при публикации. Подробности — в README.

const Auth = {
  user: null,      // { id, email, name } или null
  mode: 'local',   // 'local' | 'cloud'
  client: null,    // клиент Supabase (в облачном режиме)

  cloudConfigured() {
    return CONFIG.DATA_MODE === 'supabase' && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY;
  },

  async init() {
    if (!this.cloudConfigured()) {
      this.mode = 'local';
      this.user = { id: 'local', email: null, name: null };
      Data.use(LocalAdapter);
      return;
    }

    if (!window.supabase) {
      console.warn('DATA_MODE = supabase, но библиотека supabase-js не подключена в focus-check.html. Работаю локально.');
      this.mode = 'local';
      this.user = { id: 'local' };
      Data.use(LocalAdapter);
      return;
    }

    // --- Облачный режим ---
    this.client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    SupabaseAdapter.client = this.client;

    // После возврата со страницы Google supabase-js сам достанет сессию из адреса.
    const { data } = await this.client.auth.getSession();
    this.setUserFromSession(data.session);

    // Следим за входом/выходом (например, выход в другой вкладке).
    this.client.auth.onAuthStateChange((_event, session) => {
      const wasLoggedIn = Boolean(this.user && this.user.id !== 'local');
      this.setUserFromSession(session);
      const isLoggedIn = Boolean(this.user && this.user.id !== 'local');
      if (wasLoggedIn !== isLoggedIn) window.location.reload();
    });

    if (this.user && this.user.id !== 'local') {
      this.mode = 'cloud';
      Data.use(SupabaseAdapter);
    } else {
      // Не вошли — пока работаем локально, в настройках будет кнопка «Войти через Google».
      this.mode = 'local';
      this.user = { id: 'local' };
      Data.use(LocalAdapter);
    }
  },

  setUserFromSession(session) {
    if (!session) {
      this.user = null;
      return;
    }
    const u = session.user;
    this.user = {
      id: u.id,
      email: u.email,
      name: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || null,
    };
  },

  async signInWithGoogle() {
    if (!this.client) {
      UI.toast('Облако ещё не подключено. Сейчас всё хранится в этом браузере.');
      return;
    }
    if (location.protocol === 'file:') {
      UI.toast('Вход через Google работает только с адреса http(s). Запустите приложение через локальный сервер.');
      return;
    }
    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) UI.toast('Не получилось войти: ' + error.message);
  },

  async signOut() {
    if (this.client) await this.client.auth.signOut();
  },
};
