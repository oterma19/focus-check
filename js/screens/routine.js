// ============================================================
// Экран «Рутина»: привычки по частям дня + почасовой чек-лист.
// ============================================================

Screens.routine = {
  title: 'Рутина',
  tab: 'habits', // 'habits' | 'hours'

  render() {
    return `
      ${UI.header({ title: 'Рутина', subtitle: 'Опоры дня — без оценок и «серий»' })}
      <div class="segmented" role="tablist">
        <button class="${this.tab === 'habits' ? 'is-active' : ''}" data-action="routineTab" data-tab="habits" role="tab">Привычки</button>
        <button class="${this.tab === 'hours' ? 'is-active' : ''}" data-action="routineTab" data-tab="hours" role="tab">По часам</button>
      </div>
      ${this.tab === 'habits' ? this.habits() : this.hours()}
    `;
  },

  // ---------- Привычки ----------
  habits() {
    const all = Habits.all();
    if (!all.length) {
      return UI.empty({
        emoji: '🌱',
        title: 'Здесь будут маленькие опоры дня',
        text: 'Не цели, а простые действия, после которых чуть легче. Выбери 1–3 для начала:',
        extra: `<div class="chips chips--center">${Content.habitIdeas.map((h) => `
          <button class="chip" data-action="addHabitIdea" data-title="${U.esc(h.title)}" data-part="${h.part}">+ ${U.esc(h.title)}</button>`).join('')}</div>
          ${this.habitForm()}`,
      });
    }

    const today = U.today();
    const doneToday = Habits.checksOn(today).length;
    return `
      <p class="muted small">Сегодня отмечено ${doneToday} из ${all.length}. Пропуски — это нормально, точки ниже ничего не «сжигают».</p>
      ${Object.entries(Content.parts).map(([part, label]) => {
        const list = Habits.byPart(part);
        if (!list.length) return '';
        return `
          <section class="section">
            <h2 class="section__title">${label}</h2>
            <ul class="task-list">
              ${list.map((h) => {
                const done = Boolean(Habits.check(h.id, today));
                return `
                  <li class="task habit ${done ? 'is-done' : ''}">
                    ${UI.checkButton({ done, action: 'toggleHabit', data: { id: h.id }, label: 'Отметить привычку' })}
                    <div class="task__body task__body--static">
                      <span class="task__title">${U.esc(h.title)}</span>
                      <span class="dots" aria-label="Последние 7 дней">
                        ${Habits.week(h.id).map((d) => `<i class="${d.done ? 'on' : ''}" title="${U.shortDate(d.date)}"></i>`).join('')}
                      </span>
                    </div>
                    <button class="icon-btn icon-btn--faint" data-action="deleteHabit" data-id="${h.id}" aria-label="Удалить привычку">${Icon.close}</button>
                  </li>`;
              }).join('')}
            </ul>
          </section>`;
      }).join('')}
      ${this.habitForm()}
    `;
  },

  habitForm() {
    return `
      <form class="card card--soft habit-form" data-submit="addHabit" autocomplete="off">
        <input class="input" name="title" placeholder="Новая привычка, например «растяжка 5 минут»" maxlength="120" aria-label="Новая привычка" />
        <div class="inline-form">
          <select class="input" name="part" aria-label="Часть дня">
            ${Object.entries(Content.parts).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
          <button class="btn btn--primary btn--sm" type="submit">Добавить</button>
        </div>
      </form>`;
  },

  // ---------- Почасовой чек-лист ----------
  hours() {
    const today = U.today();
    const now = new Date().getHours();
    const filled = Hours.filledOn(today).length;
    return `
      <p class="muted small">Раз в час — одна строчка: что было или что планируешь. Пустые часы не страшны — это просто жизнь.
        ${filled ? `Сегодня заполнено: ${filled}.` : ''}</p>
      <ol class="hours">
        ${Hours.range().map((h) => {
          const entry = Hours.get(today, h);
          const state = h < now ? 'past' : h === now ? 'now' : 'future';
          const placeholder = state === 'future' ? 'план на этот час' : state === 'now' ? 'что делаю сейчас?' : 'что было?';
          return `
            <li class="hour hour--${state} ${entry && entry.done ? 'is-done' : ''}" ${state === 'now' ? 'id="hour-now"' : ''}>
              <span class="hour__time">${U.hh(h)}</span>
              <input class="input hour__input" data-change="hourNote" data-hour="${h}"
                value="${U.esc(entry ? entry.note : '')}" placeholder="${placeholder}" maxlength="160" aria-label="Заметка на ${U.hh(h)}" />
              ${UI.checkButton({ done: Boolean(entry && entry.done), action: 'toggleHour', data: { hour: h }, label: `Отметить ${U.hh(h)}` })}
            </li>`;
        }).join('')}
      </ol>
      <p class="muted small center">Часы можно поменять в настройках.</p>`;
  },

  afterRender() {
    // Прокрутить к текущему часу при первом открытии вкладки.
    if (this.tab === 'hours' && this.scrollToNow) {
      this.scrollToNow = false;
      const el = document.getElementById('hour-now');
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  },
};

Object.assign(Actions, {
  routineTab(data) {
    Screens.routine.tab = data.tab;
    Screens.routine.scrollToNow = data.tab === 'hours';
    App.render();
  },

  toggleHabit(data) {
    const done = Habits.toggle(data.id);
    if (done) UI.toast('Отмечено 🌿');
  },

  addHabit(form) {
    const title = String(form.get('title') || '').trim();
    if (!title) return;
    Habits.add(title, form.get('part'));
  },

  addHabitIdea(data) {
    Habits.add(data.title, data.part);
  },

  async deleteHabit(data) {
    const habit = Store.find('habits', data.id);
    if (!habit) return;
    const ok = await UI.confirm({
      title: 'Убрать привычку?',
      text: `«${U.esc(habit.title)}» и её отметки исчезнут. Если она просто не подходит сейчас — это нормально.`,
      ok: 'Убрать',
      danger: true,
    });
    if (ok) Habits.remove(data.id);
  },

  hourNote(el) {
    Hours.setNote(U.today(), Number(el.dataset.hour), el.value);
  },

  toggleHour(data) {
    // Сначала сохраним текст, если он введён, но поле ещё не потеряло фокус.
    const input = document.querySelector(`[data-change="hourNote"][data-hour="${data.hour}"]`);
    if (input) Hours.setNote(U.today(), Number(data.hour), input.value);
    Hours.toggle(U.today(), Number(data.hour));
  },
});
