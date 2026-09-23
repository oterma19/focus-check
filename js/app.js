// ============================================================
// app.js — запуск приложения, переключение экранов, общие события.
// Этот файл подключается ПОСЛЕДНИМ.
// ============================================================

const App = {
  screens: ['today', 'focus', 'routine', 'progress', 'settings'],
  current: 'today',
  lastDay: null,
  lastHour: null,

  async init() {
    try {
      await Auth.init();
      await Store.load();
      Tasks.migrateSteps(); // перенос «шагов» из первой версии в кусочки
    } catch (err) {
      console.error(err);
      document.getElementById('view').innerHTML = UI.empty({
        emoji: '🌧',
        title: 'Не получилось загрузить данные',
        text: 'Попробуй обновить страницу. Если не поможет — открой приложение в Chrome или Edge.',
      });
      return;
    }

    Focus.loadActive();
    this.applyTheme();
    this.bindEvents();
    Store.subscribe(() => this.render());

    this.lastDay = U.today();
    this.lastHour = new Date().getHours();
    this.route();

    if (!Store.settings.onboarded) Onboarding.open();
    setInterval(() => this.tick(), 1000);
  },

  // ---------- Экраны ----------
  // Адрес вида focus-check.html#focus открывает экран «Фокус».
  route() {
    // Переход на другой экран закрывает открытое окно.
    if (UI.modal) {
      UI.modal.onClose = null;
      UI.closeModal();
    }
    const name = location.hash.replace('#', '');
    this.current = this.screens.includes(name) ? name : 'today';
    if (this.current === 'routine' && Screens.routine.tab === 'hours') Screens.routine.scrollToNow = true;
    this.render();
    window.scrollTo(0, 0);
  },

  render() {
    const screen = Screens[this.current];
    document.getElementById('view').innerHTML = screen.render();
    if (screen.afterRender) screen.afterRender();

    document.querySelectorAll('[data-nav]').forEach((link) => {
      const active = link.dataset.nav === this.current;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = `${screen.title} · ${CONFIG.APP_NAME}`;

    this.renderFocusPill();
    UI.refreshModal();

    if (UI.focusAfterRender) {
      const el = document.querySelector(UI.focusAfterRender);
      if (el) el.focus();
      UI.focusAfterRender = null;
    }
  },

  // Маленькая плашка «идёт фокус», видна на других экранах.
  renderFocusPill() {
    const pill = document.getElementById('focusPill');
    const a = Focus.active;
    if (!a || this.current === 'focus') {
      pill.hidden = true;
      return;
    }
    pill.hidden = false;
    const label = a.status === 'review' ? 'как прошло?' : a.status === 'paused' ? 'пауза' : U.clock(Focus.leftMs() / 1000);
    pill.innerHTML = `<span class="pulse ${a.status === 'running' ? '' : 'is-still'}"></span>
      <span data-timer-mini>${label}</span><span class="focus-pill__title">${U.esc(a.title)}</span>`;
  },

  applyTheme() {
    const theme = Store.settings.theme;
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  },

  // ---------- Раз в секунду ----------
  tick() {
    const a = Focus.active;
    if (a && a.status === 'running') {
      if (Focus.leftMs() <= 0) {
        Focus.review(); // вызовет перерисовку
        UI.chime();
        if (this.current !== 'focus') UI.toast('Фокус закончился 🌿', { actionLabel: 'Открыть', onAction: () => (location.hash = '#focus') });
      } else {
        Screens.focus.tick();
        const mini = document.querySelector('[data-timer-mini]');
        if (mini) mini.textContent = U.clock(Focus.leftMs() / 1000);
        document.title = `${U.clock(Focus.leftMs() / 1000)} · ${CONFIG.APP_NAME}`;
      }
    }

    Reminders.tick();

    // Наступил новый день — обновим экран (если приложение открыто ночью).
    const today = U.today();
    if (today !== this.lastDay) {
      this.lastDay = today;
      this.render();
    }

    // Новый час — тихое напоминание про почасовой чек-лист.
    const hour = new Date().getHours();
    if (hour !== this.lastHour) {
      this.lastHour = hour;
      const { hourly_nudge, day_start, day_end } = Store.settings;
      if (hourly_nudge && hour >= day_start && hour <= day_end && !UI.modal) {
        UI.toast(`${U.hh(hour)}. Как ты? Можно отметиться в чек-листе.`, {
          actionLabel: 'Отметить',
          duration: 8000,
          onAction: () => {
            Screens.routine.tab = 'hours';
            Screens.routine.scrollToNow = true;
            location.hash = '#routine';
          },
        });
      }
      if (this.current === 'routine') this.render();
    }
  },

  // ---------- События ----------
  // Вместо сотни обработчиков — три общих. Кнопка говорит, что делать,
  // через атрибут: data-action="toggleTask" → вызовется Actions.toggleTask.
  bindEvents() {
    window.addEventListener('hashchange', () => this.route());

    document.addEventListener('click', (event) => {
      const el = event.target.closest('[data-action]');
      if (!el || el.disabled) return;
      const action = Actions[el.dataset.action];
      if (!action) return console.warn('Нет действия', el.dataset.action);
      event.preventDefault();
      action(el.dataset, el, event);
    });

    document.addEventListener('submit', (event) => {
      const form = event.target;
      const action = Actions[form.dataset.submit];
      if (!action) return;
      event.preventDefault();
      action(new FormData(form), form);
      form.reset();
    });

    document.addEventListener('change', (event) => {
      const el = event.target.closest('[data-change]');
      if (!el) return;
      const action = Actions[el.dataset.change];
      if (action) action(el);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && UI.modal) UI.closeModal();

      // «N» — быстро добавить задачу (когда курсор не в поле ввода).
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if (!typing && !UI.modal && (event.key === 'n' || event.key === 'т')) {
        event.preventDefault();
        if (this.current !== 'today') location.hash = '#today';
        setTimeout(() => document.getElementById('quickAdd')?.focus(), 0);
      }
    });

    document.getElementById('focusPill').addEventListener('click', () => {
      location.hash = '#focus';
    });
  },
};

App.init();
