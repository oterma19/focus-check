// ============================================================
// elephant.js — «Съесть слона по кусочку».
// Большое дело («слон») разбивается на маленькие кусочки.
// Каждый кусочек — обычная задача: её можно поставить на любой день,
// отметить, взять в фокус. В план дня попадают кусочки, а не весь слон.
// ============================================================

const Elephant = {
  // ---------- Блок «Большие дела» на экране «Сегодня» ----------
  block() {
    const list = Tasks.elephants();
    if (!list.length) return '';
    const today = U.today();
    return `
      <section class="section">
        <div class="section__head">
          <h2 class="section__title">🐘 Большие дела</h2>
          <span class="muted small">едим по кусочку</span>
        </div>
        <ul class="eleph-list">
          ${list.map((e) => {
            const { done, total } = Tasks.progress(e.id);
            const next = Tasks.nextPiece(e.id);
            const nextToday = next && next.date && next.date <= today;
            return `
              <li class="eleph">
                <button class="eleph__body" data-action="openElephant" data-id="${e.id}">
                  <span class="eleph__title">${U.esc(e.title)}</span>
                  <span class="bar bar--thin" aria-hidden="true"><span style="width:${Math.round((done / total) * 100)}%"></span></span>
                  <span class="eleph__meta">${done} из ${total} ${U.plural(total, ['кусочка', 'кусочков', 'кусочков'])}${next ? ` · дальше: ${U.esc(next.title)}` : ''}</span>
                </button>
                ${next && !nextToday
                  ? `<button class="btn btn--sm btn--ghost" data-action="takePiece" data-id="${next.id}">На сегодня</button>`
                  : next ? '<span class="tag tag--soft">в плане</span>' : ''}
              </li>`;
          }).join('')}
        </ul>
      </section>`;
  },

  // ============================================================
  // Окно «Разбить на кусочки»
  // ============================================================
  draft: { taskId: null, title: '', text: '', plan: 'first' },

  openBreakdown({ taskId = null, title = '' } = {}) {
    this.draft = { taskId, title, text: '', plan: 'first' };
    UI.openModal({ render: () => this.renderBreakdown(), onClose: () => App.render() });
    setTimeout(() => document.getElementById(taskId || title ? 'ebPieces' : 'ebTitle')?.focus(), 50);
  },

  // Запомнить введённое перед перерисовкой окна.
  syncDraft() {
    const title = document.getElementById('ebTitle');
    const text = document.getElementById('ebPieces');
    if (title) this.draft.title = title.value;
    if (text) this.draft.text = text.value;
  },

  renderBreakdown() {
    const d = this.draft;
    const task = d.taskId ? Tasks.get(d.taskId) : null;
    const parent = Tasks.parentOf(task);
    const planChip = (value, label) =>
      `<button class="chip ${d.plan === value ? 'is-active' : ''}" data-action="ebPlan" data-plan="${value}">${label}</button>`;

    return `
      <h2 class="sheet__title">🐘 Съесть слона по кусочку</h2>
      <p class="muted">Большое дело пугает целиком. Разрежь его на кусочки по 5–25 минут — и ешь по одному.</p>

      ${task
        ? `<p class="eleph-name">${U.esc((parent || task).title)}</p>
           ${parent ? '<p class="muted small">Это уже кусочек — новые кусочки лягут рядом с ним, в того же слона.</p>' : ''}`
        : `<label class="field">
             <span class="field__label">Большое дело</span>
             <input class="input input--title" id="ebTitle" value="${U.esc(d.title)}" placeholder="Например: подготовить доклад" maxlength="200" />
           </label>`}

      <label class="field">
        <span class="field__label">Кусочки — по одному на строку</span>
        <textarea class="input textarea" id="ebPieces" rows="6" placeholder="Собрать материалы в одну папку&#10;Набросать план из 5 пунктов&#10;Написать черновик введения&#10;Сделать 3 слайда">${U.esc(d.text)}</textarea>
        <span class="muted small">Хороший кусочек начинается с глагола и понятен без раздумий: «открыть», «написать», «отправить».</span>
      </label>

      <div class="field">
        <span class="field__label">Как раскладываем?</span>
        <div class="chips">
          ${planChip('first', 'Первый — на сегодня')}
          ${planChip('all', 'Все на сегодня')}
          ${planChip('none', 'Все «потом»')}
        </div>
      </div>

      <button class="btn btn--primary btn--lg" data-action="ebCreate">Разбить на кусочки</button>`;
  },

  // ============================================================
  // Карточка слона
  // ============================================================
  openSheet(id) {
    this.id = id;
    UI.openModal({ render: () => this.renderSheet(), onClose: () => App.render() });
  },

  renderSheet() {
    const e = Tasks.get(this.id);
    if (!e) return '<p class="muted">Удалено.</p>';
    const pieces = Tasks.children(e.id);
    const { done, total } = Tasks.progress(e.id);
    const next = Tasks.nextPiece(e.id);

    return `
      <p class="card__label">🐘 Большое дело</p>
      <input class="input input--title" data-change="elephantTitle" value="${U.esc(e.title)}" maxlength="200" aria-label="Название" />
      <div class="eleph-progress">
        <span class="bar" aria-hidden="true"><span style="width:${total ? Math.round((done / total) * 100) : 0}%"></span></span>
        <span class="muted small">${done} из ${total} ${U.plural(total, ['кусочка', 'кусочков', 'кусочков'])} съедено</span>
      </div>

      <ol class="pieces">
        ${pieces.map((p) => {
          const pDone = p.status === 'done';
          return `
            <li class="piece ${pDone ? 'is-done' : ''} ${next && p.id === next.id ? 'is-next' : ''}">
              ${UI.checkButton({ done: pDone, action: 'toggleTask', data: { id: p.id }, label: 'Отметить кусочек' })}
              <button class="piece__title" data-action="openTask" data-id="${p.id}">${U.esc(p.title)}</button>
              ${pDone ? '' : `<button class="chip chip--date" data-action="pieceDate" data-id="${p.id}" title="Когда">${U.relDay(p.date)}</button>`}
              <button class="icon-btn icon-btn--faint" data-action="removePiece" data-id="${p.id}" aria-label="Удалить кусочек">${Icon.close}</button>
            </li>`;
        }).join('')}
      </ol>

      <form class="field" data-submit="ebAddMore" autocomplete="off">
        <textarea class="input textarea" name="pieces" rows="2" placeholder="Ещё кусочки — по одному на строку"></textarea>
        <button class="btn btn--ghost btn--sm" type="submit">Добавить кусочки</button>
      </form>

      <div class="sheet__actions">
        ${next ? `<button class="btn btn--primary" data-action="focusPiece" data-id="${next.id}">${Icon.play} Фокус на следующем</button>` : ''}
        <button class="btn btn--ghost" data-action="finishElephant" data-id="${e.id}">${Icon.check} Закрыть слона</button>
        <button class="icon-btn icon-btn--danger" data-action="deleteTask" data-id="${e.id}" aria-label="Удалить большое дело">${Icon.trash}</button>
      </div>`;
  },

  // ============================================================
  // Что сказать, когда задача отмечена сделанной.
  // Для кусочка — подсказать следующий; если все съедены — закрыть слона.
  // ============================================================
  afterDone(id) {
    const f = Tasks.pieceFollowUp(id);
    if (!f) return false;
    if (f.type === 'all') {
      Tasks.complete(f.elephant.id);
      UI.toast(`Слон «${f.elephant.title}» съеден целиком! 🐘🎉`, {
        actionLabel: 'Отменить',
        onAction: () => { Tasks.toggle(id); Tasks.update(f.elephant.id, { status: 'todo', done_at: null }); },
      });
    } else if (f.type === 'next') {
      UI.toast(`Кусочек съеден. Следующий: «${f.next.title}»`, {
        actionLabel: 'На сегодня',
        duration: 7000,
        onAction: () => Tasks.moveTo(f.next.id, U.today()),
      });
    } else {
      const { done, total } = Tasks.progress(f.elephant.id);
      UI.toast(`Кусочек съеден · ${done} из ${total}`);
    }
    return true;
  },
};

// ============================================================
// Действия
// ============================================================
Object.assign(Actions, {
  openElephant(data) {
    Elephant.openSheet(data.id);
  },

  quickElephant() {
    const input = document.getElementById('quickAdd');
    Elephant.openBreakdown({ title: input ? input.value.trim() : '' });
  },

  breakDownTask(data) {
    Elephant.openBreakdown({ taskId: data.id });
  },

  ebPlan(data) {
    Elephant.syncDraft();
    Elephant.draft.plan = data.plan;
    UI.refreshModal();
  },

  ebCreate() {
    Elephant.syncDraft();
    const d = Elephant.draft;
    const pieces = d.text.split('\n').map((s) => s.replace(/^\s*(?:[-–•*]|\d+[.)])\s+/, '').trim()).filter(Boolean);
    if (!d.taskId && !d.title.trim()) return UI.toast('Как называется большое дело?');
    if (!pieces.length) return UI.toast('Напиши хотя бы один кусочек.');
    const created = Tasks.breakDown({ taskId: d.taskId, title: d.title, pieces, plan: d.plan });
    const elephantId = created[0].parent_id;
    UI.closeModal();
    const input = document.getElementById('quickAdd');
    if (input) input.value = '';
    UI.toast(`Разбито на ${created.length} ${U.plural(created.length, ['кусочек', 'кусочка', 'кусочков'])}. Начни с первого 🐘`, {
      actionLabel: 'Открыть',
      onAction: () => Elephant.openSheet(elephantId),
    });
  },

  ebAddMore(form) {
    const pieces = String(form.get('pieces') || '').split('\n').map((s) => s.trim()).filter(Boolean);
    if (pieces.length) Tasks.breakDown({ taskId: Elephant.id, pieces, plan: 'none' });
  },

  elephantTitle(el) {
    const value = el.value.trim();
    if (value) Tasks.update(Elephant.id, { title: value }, { silent: true });
  },

  // Нажатие по дате кусочка: сегодня → завтра → потом → сегодня.
  pieceDate(data) {
    const p = Tasks.get(data.id);
    const today = U.today();
    const tomorrow = U.addDays(today, 1);
    const next = p.date === today ? tomorrow : p.date === tomorrow ? null : today;
    Tasks.moveTo(p.id, next);
  },

  takePiece(data) {
    Tasks.moveTo(data.id, U.today());
    UI.toast('Кусочек в плане на сегодня');
  },

  removePiece(data) {
    const copy = { ...Tasks.get(data.id) };
    Tasks.remove(data.id);
    UI.toast('Кусочек убран', { actionLabel: 'Вернуть', onAction: () => Store.save('tasks', copy) });
  },

  focusPiece(data) {
    const p = Tasks.get(data.id);
    if (p && p.date !== U.today()) Tasks.moveTo(p.id, U.today());
    Actions.quickFocus(data);
  },

  async finishElephant(data) {
    const e = Tasks.get(data.id);
    const left = Tasks.children(e.id).filter((c) => c.status !== 'done').length;
    if (left) {
      const ok = await UI.confirm({
        title: 'Закрыть слона целиком?',
        text: `Осталось ${left} ${U.plural(left, ['кусочек', 'кусочка', 'кусочков'])} — они тоже отметятся. Это нормально: иногда дело готово раньше плана.`,
        ok: 'Закрыть',
      });
      if (!ok) return;
    } else if (UI.modal) {
      UI.closeModal();
    }
    Tasks.completeElephant(e.id);
    UI.toast(`Слон «${e.title}» закрыт 🐘`);
  },
});
