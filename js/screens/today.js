// ============================================================
// Экран «Сегодня»: силы, главное дело, быстрое добавление, список дня.
// ============================================================

Screens.today = {
  title: 'Сегодня',

  render() {
    const today = U.today();
    const name = Store.settings.name ? `, ${U.esc(Store.settings.name)}` : '';
    const all = Tasks.forDay(today);
    const main = Tasks.main(today);
    const todo = Tasks.sort(all.filter((t) => t.status !== 'done' && t !== main));
    const done = Tasks.doneOn(today);
    const leftovers = Tasks.leftovers();
    const later = Tasks.later();

    return `
      ${UI.header({
        title: `${Content.greeting(new Date().getHours())}${name}`,
        subtitle: `${U.longDate(today)} · ${Content.dayLines[this.lineIndex()]}`,
        right: `<button class="btn btn--soft btn--sm" data-action="openRescue">${Icon.leaf}<span>Мне трудно</span></button>`,
      })}

      ${this.energyBlock()}
      ${this.mainBlock(main, all)}
      ${Runs.active().length ? Parallel.block() : ''}
      ${this.quickAdd()}
      ${Runs.active().length ? '' : Parallel.block()}
      ${leftovers.length ? this.leftoversBlock(leftovers) : ''}
      ${this.listBlock(all, todo, main)}
      ${Elephant.block()}
      ${done.length ? this.doneBlock(done) : ''}
      ${later.length ? this.laterBlock(later) : ''}
    `;
  },

  lineIndex() {
    return Content.dayLines.indexOf(U.pickForDay(Content.dayLines));
  },

  // ---------- Сколько сегодня сил ----------
  energyBlock() {
    const energy = Days.get()?.energy;
    if (energy) {
      const e = Content.energy[energy];
      return `
        <div class="energy-line">
          <span aria-hidden="true">${e.emoji}</span>
          <span>${e.note}</span>
          <button class="link" data-action="resetEnergy">изменить</button>
        </div>`;
    }
    return `
      <section class="card card--soft energy">
        <p class="card__label">Сколько сегодня сил?</p>
        <div class="chips">
          ${Object.entries(Content.energy).map(([key, e]) => `
            <button class="chip" data-action="setEnergy" data-level="${key}">
              <span aria-hidden="true">${e.emoji}</span> ${e.label}
            </button>`).join('')}
        </div>
      </section>`;
  },

  // ---------- Главное дело дня ----------
  mainBlock(main, all) {
    if (main) {
      const isDone = main.status === 'done';
      const minutes = Days.suggestedFocus();
      return `
        <section class="card main-task ${isDone ? 'is-done' : ''}">
          <p class="card__label">${Icon.star} Главное на сегодня</p>
          ${this.elephTag(main)}
          <div class="main-task__row">
            ${UI.checkButton({ done: isDone, action: 'toggleTask', data: { id: main.id }, label: 'Отметить главное дело' })}
            <button class="main-task__title" data-action="openTask" data-id="${main.id}">${U.esc(main.title)}</button>
          </div>
          ${isDone
            ? '<p class="muted small">Главное сделано. Всё остальное сегодня — бонус.</p>'
            : `${main.first_step ? `<p class="first-step">Первый шаг: ${U.esc(main.first_step)}</p>` : ''}
               <button class="btn btn--primary" data-action="quickFocus" data-id="${main.id}">
                 ${Icon.play} Начать с ${minutes} мин
               </button>`}
        </section>`;
    }
    if (all.some((t) => t.status !== 'done')) {
      return `
        <div class="hint-card">
          ${Icon.star}
          <span>Выбери <b>одно</b> главное дело — нажми звёздочку у задачи. Всё остальное сегодня — бонус.</span>
        </div>`;
    }
    return '';
  },

  // ---------- Быстрое добавление ----------
  quickAdd() {
    return `
      <form class="quick-add" data-submit="quickAdd" autocomplete="off">
        <input id="quickAdd" name="title" class="quick-add__input" type="text" maxlength="200"
          placeholder="Что хочется сделать?" aria-label="Новая задача" />
        <button class="quick-add__eleph" type="button" data-action="quickElephant" title="Большое дело — разбить на кусочки" aria-label="Разбить большое дело на кусочки">🐘</button>
        <button class="quick-add__btn" type="submit" aria-label="Добавить">${Icon.plus}</button>
      </form>
      <p class="quick-hint">Можно так: «15:30 позвонить в банк», «завтра купить хлеб». Большое дело? Жми 🐘 — разобьём на кусочки</p>`;
  },

  // ---------- Хвосты с прошлых дней (без слова «просрочено») ----------
  leftoversBlock(list) {
    const n = list.length;
    return `
      <section class="card card--sun leftovers">
        <p><b>С прошлых дней ${n === 1 ? 'осталось одно дело' : `осталось ${n} ${U.plural(n, ['дело', 'дела', 'дел'])}`}.</b>
        Ничего страшного — просто реши, что с ними делать.</p>
        <div class="row-actions row-actions--start">
          <button class="btn btn--sm btn--primary" data-action="leftoversToToday">Взять на сегодня</button>
          <button class="btn btn--sm btn--ghost" data-action="openLeftovers">Разобрать по одному</button>
        </div>
      </section>`;
  },

  // ---------- Список дня ----------
  listBlock(all, todo, main) {
    const total = all.length;
    const doneCount = all.filter((t) => t.status === 'done').length;

    if (!total) {
      return `
        <section class="section">
          ${UI.empty({
            emoji: '🍵',
            title: 'День пока чистый',
            text: 'Можно начать с одного маленького дела — или просто налить чай. Вот идеи в одно касание:',
            extra: `<div class="chips chips--center">${Content.tinyTaskIdeas.map((idea) =>
              `<button class="chip" data-action="addIdea" data-title="${U.esc(idea)}">+ ${U.esc(idea)}</button>`).join('')}</div>`,
          })}
        </section>`;
    }

    const percent = Math.round((doneCount / total) * 100);
    return `
      <section class="section">
        <div class="section__head">
          <h2 class="section__title">План на день</h2>
          <span class="muted small">${doneCount} из ${total}</span>
        </div>
        <div class="bar" aria-hidden="true"><span style="width:${percent}%"></span></div>
        ${todo.length
          ? `<ul class="task-list">${todo.map((t) => this.taskItem(t)).join('')}</ul>`
          : `<p class="all-done">${main && main.status !== 'done'
              ? 'Осталось только главное. Одно дело — это посильно.'
              : 'Всё на сегодня сделано. Можно отдыхать — честно заслужено 🌿'}</p>`}
      </section>`;
  },

  taskItem(t, { showDate = false } = {}) {
    const done = t.status === 'done';
    const meta = [];
    if (t.time) meta.push(`<span class="tag">${t.time}</span>`);
    if (showDate) meta.push(`<span class="tag tag--soft">${U.relDay(t.date)}</span>`);
    const parent = Tasks.parentOf(t);
    if (parent) meta.push(`<span class="tag tag--eleph">🐘 ${U.esc(parent.title)}</span>`);
    const run = Runs.forTask(t.id);
    if (run) meta.push(`<span class="tag tag--run">${run.emoji} идёт параллельно</span>`);
    if (t.first_step && !done) meta.push(`<span>→ ${U.esc(t.first_step)}</span>`);

    return `
      <li class="task ${done ? 'is-done' : ''}">
        ${UI.checkButton({ done, action: 'toggleTask', data: { id: t.id }, label: done ? 'Вернуть в работу' : 'Отметить как сделанное' })}
        <button class="task__body" data-action="openTask" data-id="${t.id}">
          <span class="task__title">${U.esc(t.title)}</span>
          ${meta.length ? `<span class="task__meta">${meta.join('')}</span>` : ''}
        </button>
        ${done ? '' : `
          <button class="icon-btn icon-btn--faint ${t.is_main ? 'is-star' : ''}" data-action="toggleMain" data-id="${t.id}"
            aria-label="${t.is_main ? 'Убрать из главного' : 'Сделать главным'}">${Icon.star}</button>
          <button class="icon-btn icon-btn--accent" data-action="quickFocus" data-id="${t.id}" aria-label="Начать фокус">${Icon.play}</button>`}
      </li>`;
  },

  // Подпись «🐘 из какого слона» у кусочка.
  elephTag(t) {
    const parent = Tasks.parentOf(t);
    if (!parent) return '';
    const { done, total } = Tasks.progress(parent.id);
    return `<button class="eleph-link" data-action="openElephant" data-id="${parent.id}">🐘 кусочек дела «${U.esc(parent.title)}» · ${done}/${total}</button>`;
  },

  doneBlock(list) {
    return `
      <details class="fold">
        <summary>Сделано сегодня · ${list.length}</summary>
        <ul class="task-list">${list.map((t) => this.taskItem(t)).join('')}</ul>
      </details>`;
  },

  laterBlock(list) {
    return `
      <details class="fold">
        <summary>Потом и на другие дни · ${list.length}</summary>
        <ul class="task-list">
          ${list.map((t) => `
            <li class="task">
              <button class="task__body" data-action="openTask" data-id="${t.id}">
                <span class="task__title">${U.esc(t.title)}</span>
                <span class="task__meta"><span class="tag tag--soft">${U.relDay(t.date)}</span>${t.time ? `<span class="tag">${t.time}</span>` : ''}${t.parent_id && Tasks.parentOf(t) ? `<span class="tag tag--eleph">🐘 ${U.esc(Tasks.parentOf(t).title)}</span>` : ''}</span>
              </button>
              <button class="btn btn--sm btn--ghost" data-action="moveToToday" data-id="${t.id}">на сегодня</button>
            </li>`).join('')}
        </ul>
      </details>`;
  },
};

// ============================================================
// Карточка задачи (открывается по нажатию на задачу)
// ============================================================
const TaskSheet = {
  open(id) {
    this.id = id;
    UI.openModal({ render: () => this.render(), onClose: () => App.render() });
  },

  render() {
    const t = Tasks.get(this.id);
    if (!t) return '<p class="muted">Задача удалена.</p>';
    const today = U.today();
    const tomorrow = U.addDays(today, 1);
    const dateChip = (value, label) => {
      const active = (t.date || null) === value;
      return `<button class="chip ${active ? 'is-active' : ''}" data-action="taskDate" data-date="${value ?? ''}">${label}</button>`;
    };
    const parent = Tasks.parentOf(t);

    return `
      <label class="field">
        <span class="field__label">${parent ? 'Кусочек' : 'Задача'}</span>
        <input class="input input--title" data-change="taskField" data-field="title" value="${U.esc(t.title)}" maxlength="200" />
      </label>

      <div class="field">
        <span class="field__label">Когда</span>
        <div class="chips">
          ${dateChip(today, 'Сегодня')}
          ${dateChip(tomorrow, 'Завтра')}
          ${dateChip(null, 'Потом')}
          ${t.date && t.date !== today && t.date !== tomorrow ? `<span class="chip is-active">${U.relDay(t.date)}</span>` : ''}
          <input class="input input--time" type="time" data-change="taskField" data-field="time" value="${t.time || ''}" aria-label="Время" />
        </div>
      </div>

      <label class="field">
        <span class="field__label">Самый маленький первый шаг</span>
        <input class="input" data-change="taskField" data-field="first_step" value="${U.esc(t.first_step || '')}"
          placeholder="Например: открыть документ и написать заголовок" maxlength="200" />
      </label>

      <label class="field">
        <span class="field__label">Когда это будет «готово»?</span>
        <input class="input" data-change="taskField" data-field="finish_line" value="${U.esc(t.finish_line || '')}"
          placeholder="Например: черновик отправлен, даже если неидеальный" maxlength="200" />
      </label>

      ${parent
        ? `<div class="field">${Screens.today.elephTag(t)}</div>`
        : `<div class="field">
             <span class="field__label">Дело кажется большим?</span>
             <button class="btn btn--soft btn--sm" data-action="breakDownTask" data-id="${t.id}">🐘 Разбить на кусочки</button>
           </div>`}

      ${t.status !== 'done' && !Tasks.isElephant(t) ? Reminders.sheetBlock(t) : ''}

      <div class="sheet__actions">
        ${t.status === 'done'
          ? `<button class="btn btn--ghost" data-action="toggleTask" data-id="${t.id}">Вернуть в работу</button>`
          : `<button class="btn btn--primary" data-action="quickFocus" data-id="${t.id}">${Icon.play} Фокус</button>
             <button class="btn btn--ghost" data-action="toggleTask" data-id="${t.id}">${Icon.check} Готово</button>
             <button class="btn btn--ghost" data-action="runForTask" data-id="${t.id}">⏳ Параллельно</button>
             <button class="btn btn--ghost ${t.is_main ? 'is-star' : ''}" data-action="toggleMain" data-id="${t.id}">${Icon.star} ${t.is_main ? 'Главное' : 'Сделать главным'}</button>`}
        <button class="icon-btn icon-btn--danger" data-action="deleteTask" data-id="${t.id}" aria-label="Удалить задачу">${Icon.trash}</button>
      </div>`;
  },
};

// ============================================================
// Действия экрана «Сегодня»
// ============================================================
Object.assign(Actions, {
  quickAdd(form) {
    const raw = String(form.get('title') || '').trim();
    if (!raw) return;
    const parsed = Tasks.parseQuick(raw);
    if (!parsed.title) return;
    UI.focusAfterRender = '#quickAdd'; // задаём ДО изменения: оно сразу перерисует экран
    Tasks.add(parsed);
    if (parsed.time && Store.settings.reminders && Reminders.permission() === 'default') {
      UI.toast(`Напомнить в ${parsed.time}? Нужно разрешить уведомления.`, {
        actionLabel: 'Разрешить',
        duration: 8000,
        onAction: () => Reminders.requestPermission(),
      });
    } else if (parsed.time && Store.settings.reminders) {
      UI.toast(`${parsed.date !== U.today() ? 'Добавлено на завтра. ' : ''}Напомню ${Store.settings.remind_before ? `за ${Store.settings.remind_before} мин до ${parsed.time}` : `в ${parsed.time}`} 🔔`);
    } else if (parsed.date !== U.today()) {
      UI.toast('Добавлено на завтра');
    }
  },

  addIdea(data) {
    Tasks.add({ title: data.title });
  },

  toggleTask(data) {
    const nowDone = Tasks.toggle(data.id);
    if (nowDone) {
      // Кусочек «слона» — своя подсказка (следующий кусочек или «слон съеден»).
      if (Elephant.afterDone(data.id)) return;
      UI.toast(U.pick(Content.doneCheers), {
        actionLabel: 'Отменить',
        onAction: () => Tasks.toggle(data.id),
      });
    } else {
      // Сняли отметку с кусочка — значит, и слон снова не доеден.
      const parent = Tasks.parentOf(Tasks.get(data.id));
      if (parent && parent.status === 'done') Tasks.update(parent.id, { status: 'todo', done_at: null });
    }
  },

  toggleMain(data) {
    Tasks.toggleMain(data.id);
  },

  openTask(data) {
    if (Tasks.isElephant(Tasks.get(data.id))) Elephant.openSheet(data.id);
    else TaskSheet.open(data.id);
  },

  taskField(el) {
    const field = el.dataset.field;
    let value = el.value.trim();
    if (field === 'title' && !value) {
      el.value = Tasks.get(TaskSheet.id).title; // пустое название не сохраняем
      return;
    }
    Tasks.update(TaskSheet.id, { [field]: value || (field === 'time' ? null : '') }, { silent: true });
  },

  taskDate(data) {
    Tasks.moveTo(TaskSheet.id, data.date || null);
  },

  async deleteTask(data) {
    const task = Tasks.get(data.id);
    if (!task) return;
    const pieces = Tasks.children(task.id);
    const ok = await UI.confirm({
      title: pieces.length ? 'Удалить большое дело?' : 'Удалить задачу?',
      text: `«${U.esc(task.title)}»${pieces.length ? ` вместе с кусочками (${pieces.length})` : ''}`,
      ok: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    const copies = [task, ...pieces].map((x) => ({ ...x }));
    Tasks.remove(data.id);
    UI.toast('Удалено', { actionLabel: 'Вернуть', onAction: () => copies.forEach((c) => Store.save('tasks', c)) });
  },

  quickFocus(data) {
    if (UI.modal) UI.closeModal();
    if (Focus.active) {
      UI.toast('Сейчас уже идёт фокус — сначала завершим его.');
    } else {
      Focus.start({ taskId: data.id, minutes: Days.suggestedFocus() });
    }
    location.hash = '#focus';
  },

  moveToToday(data) {
    Tasks.moveTo(data.id, U.today());
  },

  leftoversToToday() {
    Tasks.leftovers().forEach((t) => Tasks.moveTo(t.id, U.today()));
    UI.toast('Перенесено на сегодня. Если окажется много — можно снова отложить.');
  },

  openLeftovers() {
    UI.openModal({
      onClose: () => App.render(),
      render: () => {
        const list = Tasks.leftovers();
        if (!list.length) return UI.empty({ emoji: '✨', title: 'Разобрано', text: 'Хвостов больше нет.' });
        return `
          <h2 class="sheet__title">Дела с прошлых дней</h2>
          <p class="muted small">Для каждого: сделать сегодня, отложить или отпустить.</p>
          <ul class="task-list">
            ${list.map((t) => `
              <li class="task task--stack">
                <div class="task__body"><span class="task__title">${U.esc(t.title)}</span>
                  <span class="task__meta"><span class="tag tag--soft">было на ${U.relDay(t.date)}</span></span></div>
                <div class="chips">
                  <button class="chip" data-action="moveToToday" data-id="${t.id}">Сегодня</button>
                  <button class="chip" data-action="leftoverLater" data-id="${t.id}">Потом</button>
                  <button class="chip" data-action="leftoverDone" data-id="${t.id}">Уже сделано</button>
                  <button class="chip" data-action="leftoverDrop" data-id="${t.id}">Отпустить</button>
                </div>
              </li>`).join('')}
          </ul>`;
      },
    });
  },

  leftoverLater(data) {
    Tasks.moveTo(data.id, null);
  },

  leftoverDone(data) {
    Tasks.complete(data.id);
  },

  leftoverDrop(data) {
    Tasks.remove(data.id);
    UI.toast('Отпущено. Не всё обязано быть сделано.');
  },

  setEnergy(data) {
    Days.setEnergy(data.level);
  },

  resetEnergy() {
    Days.setEnergy(null);
  },

  openRescue() {
    Rescue.open();
  },
});
