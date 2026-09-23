// ============================================================
// Экран «Фокус»: маленькие сессии 2–25 минут.
// ============================================================

const RING = 2 * Math.PI * 92; // длина окружности таймера (r = 92)

Screens.focus = {
  title: 'Фокус',
  selectedTaskId: undefined, // undefined — выбрать автоматически; null — «без задачи»
  minutes: null,
  freeTitle: '',

  render() {
    const a = Focus.active;
    return `
      ${UI.header({ title: 'Фокус', subtitle: 'Короткие сессии, чтобы начать и не выдохнуться' })}
      ${!a ? this.setup() : a.status === 'review' ? this.review(a) : this.running(a)}
      ${this.history()}
    `;
  },

  // ---------- Подготовка ----------
  defaultTaskId(todo) {
    if (this.selectedTaskId !== undefined && (this.selectedTaskId === null || todo.some((t) => t.id === this.selectedTaskId))) {
      return this.selectedTaskId;
    }
    const main = Tasks.main(U.today());
    if (main && main.status !== 'done') return main.id;
    return todo.length ? todo[0].id : null;
  },

  setup() {
    const todo = Tasks.sort(Tasks.forDay(U.today()).filter((t) => t.status !== 'done'));
    const selectedId = this.defaultTaskId(todo);
    const selected = selectedId ? Tasks.get(selectedId) : null;
    const minutes = this.minutes || Days.suggestedFocus();

    return `
      <section class="card focus-setup">
        <p class="card__label">С чем посидим?</p>
        <div class="chips chips--wrap">
          ${todo.slice(0, 8).map((t) => `
            <button class="chip ${t.id === selectedId ? 'is-active' : ''}" data-action="focusPick" data-id="${t.id}">
              ${t.is_main ? '★ ' : ''}${U.esc(t.title)}
            </button>`).join('')}
          <button class="chip ${selectedId === null ? 'is-active' : ''}" data-action="focusPick" data-id="">Без задачи</button>
        </div>

        ${selected ? `
          <label class="field">
            <span class="field__label">Самый маленький первый шаг</span>
            <input class="input" data-change="focusFirstStep" value="${U.esc(selected.first_step || '')}"
              placeholder="${U.esc(U.pickForDay(Content.firstStepIdeas))}" maxlength="200" />
          </label>` : `
          <label class="field">
            <span class="field__label">Над чем? (можно не писать)</span>
            <input class="input" data-change="focusFreeTitle" value="${U.esc(this.freeTitle)}" placeholder="Например: разобрать стол" maxlength="200" />
          </label>`}

        <p class="card__label">Сколько минут?</p>
        <div class="chips">
          ${[2, 5, 10, 15, 25].map((m) => `
            <button class="chip chip--round ${m === minutes ? 'is-active' : ''}" data-action="focusMinutes" data-min="${m}">${m}</button>`).join('')}
        </div>

        <p class="muted small">Договор с собой: через ${minutes} ${U.plural(minutes, ['минуту', 'минуты', 'минут'])} можно честно остановиться. Продолжать не обязательно.</p>
        <button class="btn btn--primary btn--lg" data-action="focusStart">${Icon.play} Начать</button>
      </section>`;
  },

  // ---------- Идёт сессия ----------
  running(a) {
    const task = a.task_id ? Tasks.get(a.task_id) : null;
    const paused = a.status === 'paused';
    const left = Focus.leftMs();
    const offset = RING * (1 - left / Focus.totalMs());

    return `
      <section class="card focus-live ${paused ? 'is-paused' : ''}">
        <div class="timer">
          <svg viewBox="0 0 200 200" class="timer__svg" aria-hidden="true">
            <circle cx="100" cy="100" r="92" class="timer__track" />
            <circle cx="100" cy="100" r="92" class="timer__ring" data-ring
              stroke-dasharray="${RING}" stroke-dashoffset="${offset}" />
          </svg>
          <div class="timer__text">
            <span class="timer__time" data-timer>${U.clock(left / 1000)}</span>
            <span class="timer__state">${paused ? 'пауза' : 'идёт фокус'}</span>
          </div>
        </div>

        ${task && task.parent_id && Tasks.parentOf(task) ? `<p class="muted small">🐘 кусочек дела «${U.esc(Tasks.parentOf(task).title)}»</p>` : ''}
        <p class="focus-live__title">${U.esc(a.title)}</p>
        ${task && task.first_step ? `<p class="first-step">Первый шаг: ${U.esc(task.first_step)}</p>` : ''}
        ${task && task.finish_line ? `<p class="muted small">Готово, когда: ${U.esc(task.finish_line)}</p>` : ''}

        <div class="row-actions">
          ${paused
            ? `<button class="btn btn--primary" data-action="focusResume">${Icon.play} Продолжить</button>`
            : `<button class="btn btn--ghost" data-action="focusPause">${Icon.pause} Пауза</button>`}
          <button class="btn btn--ghost" data-action="focusAdd" data-min="5">+5 мин</button>
          <button class="btn btn--ghost" data-action="focusReview">Завершить</button>
        </div>

        <form class="parking" data-submit="parkThought" autocomplete="off">
          <label class="field__label" for="parkInput">Отвлекающая мысль? Запиши — и возвращайся к делу</label>
          <div class="inline-form">
            <input id="parkInput" class="input" name="thought" placeholder="Например: купить батарейки" maxlength="200" />
            <button class="btn btn--ghost btn--sm" type="submit">В «Потом»</button>
          </div>
        </form>
      </section>
      <p class="tip">${Icon.leaf} ${U.pickForDay(Content.startTips, 'focus')}</p>`;
  },

  // ---------- Как прошло? ----------
  review(a) {
    const timeIsUp = (a.review_left || 0) <= 1000;
    return `
      <section class="card focus-review">
        <div class="focus-review__emoji" aria-hidden="true">${timeIsUp ? '🌿' : '🫖'}</div>
        <h2 class="sheet__title">${timeIsUp ? 'Время вышло. Как прошло?' : 'Остановимся? Как прошло?'}</h2>
        <p class="muted">«${U.esc(a.title)}». Любой ответ — нормальный, сессия в любом случае засчитается.</p>
        <div class="choice-grid">
          ${a.task_id ? `<button class="choice" data-action="focusFinish" data-outcome="done"><b>✓ Задача готова</b><span>отмечу как сделанную</span></button>` : ''}
          <button class="choice" data-action="focusFinish" data-outcome="progress"><b>Есть продвижение</b><span>продолжу в другой раз</span></button>
          <button class="choice" data-action="focusAdd" data-min="5"><b>Ещё 5 минут</b><span>процесс пошёл</span></button>
          <button class="choice" data-action="focusFinish" data-outcome="stopped"><b>Хватит на сейчас</b><span>и это нормально</span></button>
        </div>
      </section>`;
  },

  // ---------- История за сегодня ----------
  history() {
    const sessions = Focus.sessionsOn(U.today()).sort((x, y) => y.started_at.localeCompare(x.started_at));
    if (!sessions.length) {
      return Focus.active ? '' : `<p class="muted small center">Сегодня сессий ещё не было. Даже 2 минуты — это старт.</p>`;
    }
    const minutes = sessions.reduce((s, x) => s + x.actual_min, 0);
    const outcome = { done: 'готово', progress: 'есть продвижение', stopped: 'остановка' };
    return `
      <section class="section">
        <div class="section__head">
          <h2 class="section__title">Сегодня в фокусе</h2>
          <span class="muted small">${sessions.length} ${U.plural(sessions.length, ['сессия', 'сессии', 'сессий'])} · ${minutes} мин</span>
        </div>
        <ul class="plain-list">
          ${sessions.map((s) => `
            <li><span>${U.esc(s.title)}</span><span class="muted small">${s.actual_min} мин · ${outcome[s.outcome] || ''}</span></li>`).join('')}
        </ul>
      </section>`;
  },

  // Вызывается раз в секунду из app.js — обновляет только цифры, без перерисовки экрана.
  tick() {
    const timeEl = document.querySelector('[data-timer]');
    const ringEl = document.querySelector('[data-ring]');
    if (timeEl) timeEl.textContent = U.clock(Focus.leftMs() / 1000);
    if (ringEl) ringEl.setAttribute('stroke-dashoffset', RING * (1 - Focus.leftMs() / Focus.totalMs()));
  },
};

Object.assign(Actions, {
  focusPick(data) {
    Screens.focus.selectedTaskId = data.id || null;
    App.render();
  },

  focusMinutes(data) {
    Screens.focus.minutes = Number(data.min);
    App.render();
  },

  focusFirstStep(el) {
    const id = Screens.focus.defaultTaskId(Tasks.forDay(U.today()).filter((t) => t.status !== 'done'));
    if (id) Tasks.update(id, { first_step: el.value.trim() }, { silent: true });
  },

  focusFreeTitle(el) {
    Screens.focus.freeTitle = el.value.trim();
  },

  focusStart() {
    // Если человек печатал в поле и сразу нажал «Начать», сохраним введённое.
    const input = document.querySelector('[data-change="focusFirstStep"], [data-change="focusFreeTitle"]');
    if (input) Actions[input.dataset.change](input);

    const s = Screens.focus;
    const todo = Tasks.forDay(U.today()).filter((t) => t.status !== 'done');
    const taskId = s.defaultTaskId(todo);
    Focus.start({ taskId, title: taskId ? '' : s.freeTitle, minutes: s.minutes || Days.suggestedFocus() });
    s.freeTitle = '';
  },

  focusPause() {
    Focus.pause();
  },

  focusResume() {
    Focus.resume();
  },

  focusAdd(data) {
    Focus.addMinutes(Number(data.min));
  },

  focusReview() {
    Focus.review();
  },

  focusFinish(data) {
    const taskId = Focus.active && Focus.active.task_id;
    Focus.finish(data.outcome);
    Screens.focus.selectedTaskId = undefined;
    // Если закрыли кусочек «слона» — подскажем следующий.
    if (data.outcome === 'done' && taskId && Elephant.afterDone(taskId)) return;
    UI.toast(Content.focusCheers[data.outcome]);
  },

  parkThought(form) {
    const text = String(form.get('thought') || '').trim();
    if (!text) return;
    UI.focusAfterRender = '#parkInput';
    Tasks.add({ title: text, date: null });
    UI.toast('Записано в «Потом». Возвращаемся к делу.');
  },
});
