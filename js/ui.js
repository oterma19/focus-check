// ============================================================
// ui.js — общие кусочки интерфейса: иконки, окна, уведомления.
// ============================================================

// Реестры, которые заполняют файлы экранов:
//   Screens.today = { title, render() }
//   Object.assign(Actions, { имяДействия(data, element) { ... } })
// В разметке кнопка связывается с действием атрибутом data-action="имяДействия".
const Screens = {};
const Actions = {};

// Простые линейные иконки (SVG), цвет берут из текста.
const Icon = (() => {
  const svg = (body, size = 22) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  return {
    today: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    focus: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>'),
    routine: svg('<path d="M4 7h11M4 12h9M4 17h7"/><path d="m16 16 2 2 4-4"/>'),
    progress: svg('<path d="M12 21c-4-3-8-6.5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 4.5-4 8-8 11Z"/>'),
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>', 20),
    plus: svg('<path d="M12 5v14M5 12h14"/>', 20),
    check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 16),
    play: svg('<path d="M8 5.5v13l10.5-6.5L8 5.5Z"/>', 18),
    pause: svg('<path d="M9 5v14M15 5v14"/>', 18),
    more: svg('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>', 20),
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>', 20),
    star: svg('<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z"/>', 18),
    leaf: svg('<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15"/><path d="M5 19 13 11"/>', 20),
    arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 18),
    trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', 18),
    sprout: svg('<path d="M12 20v-8"/><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6Z"/><path d="M12 10c0-3 2.5-5 6-5 0 3.5-2.5 5-6 5Z"/>', 20),
  };
})();

const UI = {
  // ---------- Шапка экрана ----------
  header({ title, subtitle = '', right = '', gear = true }) {
    return `
      <header class="screen-head">
        <h1 class="screen-title">${title}</h1>
        <div class="screen-head__right">
          ${right}
          ${gear ? `<a class="icon-btn only-mobile" href="#settings" aria-label="Настройки">${Icon.settings}</a>` : ''}
        </div>
        ${subtitle ? `<p class="screen-sub">${subtitle}</p>` : ''}
      </header>`;
  },

  // ---------- Пустое состояние ----------
  empty({ emoji = '🌿', title, text = '', extra = '' }) {
    return `
      <div class="empty">
        <div class="empty__emoji" aria-hidden="true">${emoji}</div>
        <p class="empty__title">${title}</p>
        ${text ? `<p class="empty__text">${text}</p>` : ''}
        ${extra}
      </div>`;
  },

  // ---------- Круглая «галочка» ----------
  checkButton({ done, action, data = {}, label }) {
    const attrs = Object.entries(data).map(([k, v]) => `data-${k}="${U.esc(v)}"`).join(' ');
    return `<button class="check ${done ? 'is-done' : ''}" data-action="${action}" ${attrs}
      aria-pressed="${done}" aria-label="${U.esc(label)}">${Icon.check}</button>`;
  },

  // ---------- Модальное окно (на телефоне — выезжает снизу) ----------
  modal: null, // { render: () => html, onClose }

  openModal({ render, onClose, wide = false, className = '' }) {
    this.modal = { render, onClose, wide, className };
    this.renderModal();
    document.body.classList.add('no-scroll');
    const firstInput = document.querySelector('#modal-root [autofocus]');
    if (firstInput && window.matchMedia('(pointer: fine)').matches) firstInput.focus();
  },

  // animate = false при перерисовке, чтобы окно не «мигало» заново.
  renderModal(animate = true) {
    const root = document.getElementById('modal-root');
    if (!this.modal) {
      root.innerHTML = '';
      return;
    }
    root.innerHTML = `
      <div class="overlay ${animate ? '' : 'is-static'}" data-action="closeModal"></div>
      <div class="sheet ${animate ? '' : 'is-static'} ${this.modal.wide ? 'sheet--wide' : ''} ${this.modal.className}" role="dialog" aria-modal="true">
        <button class="icon-btn sheet__close" data-action="closeModal" aria-label="Закрыть">${Icon.close}</button>
        ${this.modal.render()}
      </div>`;
  },

  // Перерисовать открытое окно (например, после отметки шага).
  refreshModal() {
    if (!this.modal) return;
    const scroller = document.querySelector('#modal-root .sheet');
    const top = scroller ? scroller.scrollTop : 0;
    this.renderModal(false);
    const next = document.querySelector('#modal-root .sheet');
    if (next) next.scrollTop = top;
  },

  closeModal() {
    const onClose = this.modal && this.modal.onClose;
    this.modal = null;
    this.renderModal();
    document.body.classList.remove('no-scroll');
    if (onClose) onClose();
  },

  // Мягкое подтверждение вместо системного confirm().
  confirm({ title, text = '', ok = 'Да', cancel = 'Отмена', danger = false }) {
    return new Promise((resolve) => {
      let answered = false;
      Actions.confirmAnswer = (data) => {
        answered = true;
        UI.closeModal();
        resolve(data.value === 'yes');
      };
      this.openModal({
        onClose: () => { if (!answered) resolve(false); },
        render: () => `
          <h2 class="sheet__title">${title}</h2>
          ${text ? `<p class="muted">${text}</p>` : ''}
          <div class="row-actions">
            <button class="btn btn--ghost" data-action="confirmAnswer" data-value="no">${cancel}</button>
            <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-action="confirmAnswer" data-value="yes">${ok}</button>
          </div>`,
      });
    });
  },

  // ---------- Всплывающее сообщение ----------
  toast(message, { actionLabel, onAction, duration = 4500 } = {}) {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.innerHTML = `<span>${U.esc(message)}</span>`;
    if (actionLabel) {
      const btn = document.createElement('button');
      btn.className = 'toast__action';
      btn.textContent = actionLabel;
      btn.addEventListener('click', () => {
        onAction();
        el.remove();
      });
      el.appendChild(btn);
    }
    root.appendChild(el);
    // Не больше двух сообщений одновременно — чтобы не было «стены» уведомлений.
    while (root.children.length > 2) root.firstElementChild.remove();
    requestAnimationFrame(() => el.classList.add('is-visible'));
    setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  // ---------- Тихий звук (без файлов: генерируется браузером) ----------
  chime() {
    if (!Store.settings.sound) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 1.3);
      });
    } catch {
      /* звук необязателен */
    }
  },

  // После перерисовки экрана поставить курсор в нужное поле.
  focusAfterRender: null,
};

// Общие действия, нужные везде.
Object.assign(Actions, {
  closeModal() {
    UI.closeModal();
  },
  go(data) {
    location.hash = data.to;
  },
});
