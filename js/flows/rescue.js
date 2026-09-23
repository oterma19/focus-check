// ============================================================
// rescue.js — кнопка «Мне трудно» и три сценария поддержки:
//   start  — «Мне тяжело начать»
//   finish — «Начато, но не заканчивается»
//   guilt  — «Сделано мало, и за это стыдно»
// ============================================================

const Rescue = {
  step: 'menu', // 'menu' | 'start' | 'finish' | 'guilt'
  taskId: null,

  open(step = 'menu') {
    this.step = step;
    this.taskId = this.defaultTask();
    UI.openModal({ render: () => this.render(), onClose: () => App.render() });
  },

  todo() {
    return Tasks.sort(Tasks.forDay(U.today()).filter((t) => t.status !== 'done'));
  },

  defaultTask() {
    const main = Tasks.main(U.today());
    if (main && main.status !== 'done') return main.id;
    const list = this.todo();
    return list.length ? list[0].id : null;
  },

  render() {
    return this[this.step]();
  },

  // ---------- Меню ----------
  menu() {
    return `
      <h2 class="sheet__title">Что сейчас происходит?</h2>
      <p class="muted">Выбери, что ближе. Здесь нет неправильных ответов.</p>
      <div class="choice-list">
        <button class="choice choice--row" data-action="rescueGo" data-step="start">
          <span class="choice__emoji">🌱</span><span><b>Мне тяжело начать</b><span>сделаем первый шаг совсем маленьким</span></span>
        </button>
        <button class="choice choice--row" data-action="rescueGo" data-step="finish">
          <span class="choice__emoji">🧩</span><span><b>Начато, но не заканчивается</b><span>найдём финишную черту</span></span>
        </button>
        <button class="choice choice--row" data-action="rescueGo" data-step="guilt">
          <span class="choice__emoji">🫖</span><span><b>Сделано мало, и за это стыдно</b><span>посмотрим, что уже есть</span></span>
        </button>
      </div>`;
  },

  taskPicker() {
    const list = this.todo();
    return `
      <div class="field">
        <span class="field__label">Какое дело?</span>
        <div class="chips chips--wrap">
          ${list.map((t) => `<button class="chip ${t.id === this.taskId ? 'is-active' : ''}" data-action="rescuePick" data-id="${t.id}">${U.esc(t.title)}</button>`).join('')}
          <button class="chip ${this.taskId === null ? 'is-active' : ''}" data-action="rescuePick" data-id="">Другое</button>
        </div>
        ${this.taskId === null ? `<input class="input" id="rescueNew" placeholder="Напиши дело своими словами" maxlength="200" />` : ''}
      </div>`;
  },

  // ---------- «Мне тяжело начать» ----------
  start() {
    const task = this.taskId ? Tasks.get(this.taskId) : null;
    return `
      <button class="link back" data-action="rescueGo" data-step="menu">← назад</button>
      <h2 class="sheet__title">Начнём с самого маленького</h2>
      <p class="muted">Трудно начинать — это не лень, а нормальная реакция на что-то большое или неприятное. Уменьшим дело до смешного.</p>
      ${this.taskPicker()}
      <label class="field">
        <span class="field__label">Какое первое действие займёт меньше 2 минут?</span>
        <input class="input" id="rescueStep" value="${U.esc(task ? task.first_step || '' : '')}" placeholder="Например: открыть файл" maxlength="200" />
      </label>
      <div class="chips chips--wrap">
        ${Content.firstStepIdeas.map((i) => `<button class="chip chip--quiet" data-action="rescueStepIdea" data-text="${U.esc(i)}">${U.esc(i)}</button>`).join('')}
      </div>
      <p class="tip">${Icon.leaf} ${U.pick(Content.startTips)}</p>
      <button class="btn btn--primary btn--lg" data-action="rescueStartFocus">${Icon.play} Только 2 минуты</button>`;
  },

  // ---------- «Начато, но не заканчивается» ----------
  finish() {
    const task = this.taskId ? Tasks.get(this.taskId) : null;
    const parent = Tasks.parentOf(task);
    const openPieces = parent ? Tasks.children(parent.id).filter((c) => c.status !== 'done' && c.id !== task.id) : [];
    return `
      <button class="link back" data-action="rescueGo" data-step="menu">← назад</button>
      <h2 class="sheet__title">Найдём финишную черту</h2>
      <p class="muted">Часто дело не заканчивается, потому что непонятно, где «конец». Давай определим его — не идеальный, а достаточный.</p>
      ${this.taskPicker()}
      <label class="field">
        <span class="field__label">Что будет считаться «готово»?</span>
        <input class="input" id="rescueFinish" value="${U.esc(task ? task.finish_line || '' : '')}"
          placeholder="Например: отправить черновик, даже если неидеальный" maxlength="200" />
      </label>
      ${parent ? `<p class="muted small">🐘 Это кусочек дела «${U.esc(parent.title)}».${openPieces.length ? ` Дальше в нём: ${openPieces.map((c) => U.esc(c.title)).join(' · ')}` : ''}</p>` : ''}
      <div class="field">
        <span class="field__label">Какие 1–3 кусочка остались? 🐘</span>
        <input class="input" data-rescue-step placeholder="Кусочек 1" maxlength="200" />
        <input class="input" data-rescue-step placeholder="Кусочек 2 (можно пропустить)" maxlength="200" />
        <input class="input" data-rescue-step placeholder="Кусочек 3 (можно пропустить)" maxlength="200" />
        <span class="muted small">Дело станет «слоном»: первый кусочек — на сегодня, остальные — потом.</span>
      </div>
      <p class="tip">${Icon.leaf} ${U.pick(Content.finishTips)}</p>
      <div class="row-actions">
        <button class="btn btn--ghost" data-action="rescueGoodEnough">Считаю готовым</button>
        <button class="btn btn--primary" data-action="rescueFinishFocus">${Icon.play} Финишный рывок 10 мин</button>
      </div>`;
  },

  // ---------- «Сделано мало, и за это стыдно» ----------
  guilt() {
    const d = Stats.day(U.today());
    const wins = [];
    Tasks.doneOn(d.date).forEach((t) => wins.push(`✓ ${U.esc(t.title)}`));
    Tasks.elephants().forEach((e) => {
      const { done, total } = Tasks.progress(e.id);
      if (done) wins.push(`🐘 «${U.esc(e.title)}»: съедено ${done} из ${total}`);
    });
    if (d.sessions) wins.push(`⏱ ${d.minutes} мин в фокусе`);
    if (d.habits) wins.push(`🌿 ${d.habits} ${U.plural(d.habits, ['привычка', 'привычки', 'привычек'])}`);
    if (d.hours) wins.push(`🕐 ${d.hours} ${U.plural(d.hours, ['час', 'часа', 'часов'])} в чек-листе`);
    const left = this.todo().length;

    return `
      <button class="link back" data-action="rescueGo" data-step="menu">← назад</button>
      <h2 class="sheet__title">Давай посмотрим честно — и по-доброму</h2>
      ${wins.length
        ? `<p class="muted">Вот что сегодня уже было:</p><ul class="plain-list">${wins.map((w) => `<li>${w}</li>`).join('')}</ul>`
        : `<p class="muted">Сегодня пока тихо. Так бывает: усталость, заботы, просто тяжёлый день. Открыть приложение — это уже шаг к себе.</p>`}
      <blockquote class="quote">${U.pick(Content.guiltReframes)}</blockquote>

      <label class="field">
        <span class="field__label">Одна вещь, которая сегодня удалась (любая)</span>
        <div class="inline-form">
          <input class="input" id="rescueWin" value="${U.esc(Days.get()?.win_note || '')}" placeholder="Например: ужин приготовлен" maxlength="200" />
          <button class="btn btn--ghost btn--sm" data-action="rescueSaveWin">Записать</button>
        </div>
      </label>

      <p class="field__label">Что дальше — на твой выбор:</p>
      <div class="choice-list">
        <button class="choice choice--row" data-action="rescueGo" data-step="start"><span class="choice__emoji">🌱</span><span><b>Одно дело на 2 минуты</b><span>если хочется чуть-чуть сдвинуться</span></span></button>
        ${left ? `<button class="choice choice--row" data-action="rescueMoveTomorrow"><span class="choice__emoji">📦</span><span><b>Перенести остальное на завтра</b><span>${left} ${U.plural(left, ['дело', 'дела', 'дел'])} — без чувства вины</span></span></button>` : ''}
        <button class="choice choice--row" data-action="rescueRest"><span class="choice__emoji">🛋</span><span><b>Просто отдохнуть</b><span>это тоже часть плана</span></span></button>
      </div>`;
  },

  // Прочитать выбранную задачу; если «Другое» — создать новую.
  resolveTask() {
    if (this.taskId) return Tasks.get(this.taskId);
    const input = document.getElementById('rescueNew');
    const title = input ? input.value.trim() : '';
    if (!title) {
      UI.toast('Напиши, какое дело, — хотя бы пару слов.');
      return null;
    }
    const task = Tasks.add({ title });
    this.taskId = task.id;
    return task;
  },
};

Object.assign(Actions, {
  rescueGo(data) {
    Rescue.step = data.step;
    UI.refreshModal();
  },

  rescuePick(data) {
    Rescue.taskId = data.id || null;
    UI.refreshModal();
  },

  rescueStepIdea(data) {
    const input = document.getElementById('rescueStep');
    if (input) input.value = data.text;
  },

  // Важно: сначала читаем поля, потом создаём задачу —
  // создание перерисует окно, и введённый текст пропал бы.
  rescueStartFocus() {
    const step = document.getElementById('rescueStep')?.value.trim();
    const task = Rescue.resolveTask();
    if (!task) return;
    if (step) Tasks.update(task.id, { first_step: step }, { silent: true });
    UI.closeModal();
    if (Focus.active) Focus.finish('stopped');
    Focus.start({ taskId: task.id, minutes: 2 });
    location.hash = '#focus';
  },

  // Сохраняет «финишную черту» и кусочки. Возвращает id задачи, на которой делать фокус.
  rescueSaveFinish() {
    const finish = document.getElementById('rescueFinish')?.value.trim();
    const pieces = [...document.querySelectorAll('[data-rescue-step]')].map((i) => i.value.trim()).filter(Boolean);
    const task = Rescue.resolveTask();
    if (!task) return null;
    if (finish) Tasks.update(task.id, { finish_line: finish }, { silent: true });
    if (!pieces.length) return task.id;
    const created = Tasks.breakDown({ taskId: task.id, pieces, plan: 'first' });
    // Если это уже был кусочек — продолжаем его; иначе начинаем с первого нового кусочка.
    return task.parent_id ? task.id : created[0].id;
  },

  rescueFinishFocus() {
    const focusId = Actions.rescueSaveFinish();
    if (!focusId) return;
    UI.closeModal();
    if (Focus.active) Focus.finish('stopped');
    Focus.start({ taskId: focusId, minutes: 10 });
    location.hash = '#focus';
  },

  rescueGoodEnough() {
    const finish = document.getElementById('rescueFinish')?.value.trim();
    const task = Rescue.resolveTask();
    if (!task) return;
    if (finish) Tasks.update(task.id, { finish_line: finish }, { silent: true });
    Tasks.complete(task.id);
    UI.closeModal();
    if (!Elephant.afterDone(task.id)) UI.toast('Готово — значит, готово. Отпускаем 🌿');
  },

  rescueSaveWin() {
    const text = document.getElementById('rescueWin')?.value.trim();
    if (!text) return;
    Days.setWin(text, U.today(), { silent: true });
    UI.toast('Записано. Это правда считается.');
  },

  rescueMoveTomorrow() {
    const tomorrow = U.addDays(U.today(), 1);
    Rescue.todo().forEach((t) => Tasks.moveTo(t.id, tomorrow));
    UI.closeModal();
    UI.toast('Перенесено на завтра. Сегодня можно выдохнуть.');
  },

  rescueRest() {
    UI.closeModal();
    UI.toast('Хорошего отдыха. Приложение подождёт 🌿');
  },
});
