// ============================================================
// onboarding.js — знакомство при первом запуске (3 коротких шага).
// ============================================================

const Onboarding = {
  step: 0,
  name: '',
  minutes: 5,
  firstTask: '',
  habits: new Set(),

  open() {
    this.step = 0;
    this.name = Store.settings.name || '';
    this.minutes = Store.settings.focus_minutes || 5;
    this.firstTask = '';
    this.habits = new Set();
    UI.openModal({
      render: () => this.render(),
      onClose: () => this.done(false),
      className: 'sheet--onboarding',
    });
  },

  // Перед перерисовкой запоминаем то, что человек успел ввести.
  sync() {
    const name = document.getElementById('obName');
    const task = document.getElementById('obTask');
    if (name) this.name = name.value.trim();
    if (task) this.firstTask = task.value.trim();
  },

  dots() {
    return `<div class="ob-dots">${[0, 1, 2].map((i) => `<i class="${i === this.step ? 'on' : ''}"></i>`).join('')}</div>`;
  },

  render() {
    if (this.step === 0) {
      return `
        ${this.dots()}
        <div class="ob-hero" aria-hidden="true">🌿</div>
        <h2 class="sheet__title center">Привет! Это Focus Check</h2>
        <p class="muted center">Тихое место, где большие дела становятся маленькими.</p>
        <ul class="ob-list">
          <li><b>Сегодня</b> — одно главное дело и короткий список, без перегруза.</li>
          <li><b>🐘 Большие дела</b> — разбиваются на кусочки: «съесть слона» можно только по частям.</li>
          <li><b>Фокус</b> — сессии от 2 минут, когда трудно начать.</li>
          <li><b>Рутина</b> — маленькие опоры дня и почасовой чек-лист.</li>
          <li><b>Прогресс</b> — всё, что получилось, даже мелочи.</li>
        </ul>
        <p class="muted small center">Здесь нет штрафов, красных просрочек и сравнения с другими.</p>
        <div class="row-actions">
          <button class="btn btn--ghost" data-action="obSkip">Пропустить</button>
          <button class="btn btn--primary" data-action="obNext">Дальше</button>
        </div>`;
    }

    if (this.step === 1) {
      return `
        ${this.dots()}
        <h2 class="sheet__title">Немного о тебе</h2>
        <label class="field">
          <span class="field__label">Как к тебе обращаться?</span>
          <input class="input" id="obName" value="${U.esc(this.name)}" placeholder="Имя (можно пропустить)" maxlength="40" autofocus />
        </label>
        <div class="field">
          <span class="field__label">Сколько минут комфортно для старта?</span>
          <div class="chips">
            ${[2, 5, 10, 15].map((m) => `<button class="chip chip--round ${m === this.minutes ? 'is-active' : ''}" data-action="obMinutes" data-min="${m}">${m}</button>`).join('')}
          </div>
          <p class="muted small">Можно начать с 2 минут — это не «мало», это вход. Поменять можно в любой момент.</p>
        </div>
        <div class="row-actions">
          <button class="btn btn--ghost" data-action="obBack">Назад</button>
          <button class="btn btn--primary" data-action="obNext">Дальше</button>
        </div>`;
    }

    return `
      ${this.dots()}
      <h2 class="sheet__title">Первое маленькое дело</h2>
      <label class="field">
        <span class="field__label">Что-то совсем простое на сегодня</span>
        <input class="input" id="obTask" value="${U.esc(this.firstTask)}" placeholder="Например: выпить стакан воды" maxlength="200" autofocus />
      </label>
      <div class="chips chips--wrap">
        ${Content.tinyTaskIdeas.slice(0, 4).map((i) => `<button class="chip chip--quiet" data-action="obTaskIdea" data-text="${U.esc(i)}">${U.esc(i)}</button>`).join('')}
      </div>
      <div class="field">
        <span class="field__label">Опоры дня (по желанию)</span>
        <div class="chips chips--wrap">
          ${Content.habitIdeas.map((h, i) => `<button class="chip ${this.habits.has(i) ? 'is-active' : ''}" data-action="obHabit" data-i="${i}">${U.esc(h.title)}</button>`).join('')}
        </div>
      </div>
      <div class="row-actions">
        <button class="btn btn--ghost" data-action="obBack">Назад</button>
        <button class="btn btn--primary" data-action="obFinish">Начать</button>
      </div>`;
  },

  done(save) {
    if (save) {
      this.sync();
      Store.saveSettings({ name: this.name, focus_minutes: this.minutes, onboarded: true }, { silent: true });
      if (this.firstTask) Tasks.add({ title: this.firstTask, is_main: true });
      this.habits.forEach((i) => Habits.add(Content.habitIdeas[i].title, Content.habitIdeas[i].part));
    } else if (!Store.settings.onboarded) {
      Store.saveSettings({ onboarded: true }, { silent: true });
    }
    location.hash = '#today';
    App.render();
  },
};

Object.assign(Actions, {
  obNext() {
    Onboarding.sync();
    Onboarding.step = Math.min(2, Onboarding.step + 1);
    UI.refreshModal();
  },
  obBack() {
    Onboarding.sync();
    Onboarding.step = Math.max(0, Onboarding.step - 1);
    UI.refreshModal();
  },
  obSkip() {
    UI.closeModal(); // onClose → done(false)
  },
  obMinutes(data) {
    Onboarding.sync();
    Onboarding.minutes = Number(data.min);
    UI.refreshModal();
  },
  obTaskIdea(data) {
    const input = document.getElementById('obTask');
    if (input) input.value = data.text;
  },
  obHabit(data) {
    Onboarding.sync();
    const i = Number(data.i);
    if (Onboarding.habits.has(i)) Onboarding.habits.delete(i);
    else Onboarding.habits.add(i);
    UI.refreshModal();
  },
  obFinish() {
    // Запоминаем ввод, закрываем окно без повторного onClose и сохраняем выбор.
    Onboarding.sync();
    UI.modal.onClose = null;
    UI.closeModal();
    Onboarding.done(true);
  },
});
