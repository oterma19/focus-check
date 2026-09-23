// ============================================================
// parallel.js — «Идёт параллельно»: стирка, программа, лекция…
// ============================================================
//
// Фокус-сессия — одна (внимание у человека одно).
// Параллельных дел — сколько угодно: они идут сами, а приложение
// следит за временем и напомнит, когда пора вернуться
// («Стирка готова — развесить бельё»).

const Parallel = {
  // ---------- Блок на экранах «Сегодня» и «Фокус» ----------
  block({ compact = false } = {}) {
    const runs = Runs.active();
    if (!runs.length) {
      return compact ? '' : `
        <button class="parallel-start" data-action="openRunStart">
          ⏳ <span><b>Запустить параллельно</b> — стирка, программа, лекция…</span>
        </button>`;
    }
    return `
      <section class="card card--lav parallel">
        <div class="section__head">
          <h2 class="section__title">⏳ Идёт параллельно</h2>
          <button class="btn btn--sm btn--ghost" data-action="openRunStart">${Icon.plus} Ещё</button>
        </div>
        <ul class="runs">${runs.map((r) => this.item(r)).join('')}</ul>
      </section>`;
  },

  item(r) {
    const ringing = r.status === 'ringing';
    const p = Runs.progress(r);
    const task = r.task_id ? Tasks.get(r.task_id) : null;
    return `
      <li class="run ${ringing ? 'is-ringing' : ''}">
        <span class="run__emoji" aria-hidden="true">${r.emoji}</span>
        <div class="run__body">
          <span class="run__title">${U.esc(r.title)}</span>
          <span class="run__meta">
            ${ringing
              ? '<b>Готово!</b>'
              : `<span data-run-left="${r.id}">${this.leftText(r)}</span>`}
            ${r.after_text ? ` · потом: ${U.esc(r.after_text)}` : ''}
          </span>
          ${p !== null && !ringing ? `<span class="bar bar--thin"><span data-run-bar="${r.id}" style="width:${Math.round(p * 100)}%"></span></span>` : ''}
        </div>
        <div class="run__actions">
          ${ringing
            ? `${r.after_text ? `<button class="btn btn--sm btn--primary" data-action="runAfterTask" data-id="${r.id}">+ В план</button>` : ''}
               ${task && task.status !== 'done' ? `<button class="btn btn--sm btn--ghost" data-action="runDoneTask" data-id="${r.id}">✓ задача</button>` : ''}
               <button class="btn btn--sm btn--ghost" data-action="runFinish" data-id="${r.id}">Ок</button>`
            : `${r.ends_at ? `<button class="icon-btn icon-btn--faint" data-action="runAdd" data-id="${r.id}" title="Ещё 10 минут" aria-label="Ещё 10 минут">+10</button>` : ''}
               <button class="icon-btn icon-btn--accent" data-action="runFinish" data-id="${r.id}" title="Закончилось" aria-label="Закончилось">${Icon.check}</button>
               <button class="icon-btn icon-btn--faint" data-action="runStop" data-id="${r.id}" title="Убрать" aria-label="Убрать">${Icon.close}</button>`}
        </div>
      </li>`;
  },

  leftText(r) {
    const left = Runs.leftMs(r);
    if (left === null) return `идёт ${this.duration(Runs.elapsedMs(r))}`;
    return `осталось ${this.duration(left, true)}`;
  },

  // 5400000 мс → «1 ч 30 мин»; для последних минут — «04:12»
  duration(ms, precise = false) {
    const totalMin = Math.floor(ms / 60000);
    if (precise && totalMin < 10) return U.clock(ms / 1000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h ? `${h} ч ${m} мин` : `${m} мин`;
  },

  // ---------- Окно «Запустить параллельно» ----------
  draft: {},

  openStart({ taskId = null } = {}) {
    const task = taskId ? Tasks.get(taskId) : null;
    this.draft = { taskId, title: task ? task.title : '', emoji: '⏳', minutes: 30, custom: '', after: '' };
    UI.openModal({ render: () => this.renderStart(), onClose: () => App.render() });
  },

  syncDraft() {
    const get = (id) => document.getElementById(id);
    if (get('runTitle')) this.draft.title = get('runTitle').value;
    if (get('runAfter')) this.draft.after = get('runAfter').value;
    if (get('runCustom')) this.draft.custom = get('runCustom').value;
  },

  renderStart() {
    const d = this.draft;
    const chip = (m, label) =>
      `<button class="chip ${d.minutes === m && !d.custom ? 'is-active' : ''}" data-action="runMinutes" data-min="${m ?? ''}">${label}</button>`;
    return `
      <h2 class="sheet__title">⏳ Запустить параллельно</h2>
      <p class="muted">Для дел, которые идут сами: стирка, расчёт программы, лекция в наушниках. Можно запустить сразу несколько — и заниматься своим. Приложение напомнит, когда пора вернуться.</p>

      <div class="chips chips--wrap">
        ${Content.runPresets.map((p, i) => `
          <button class="chip ${d.title === p.title ? 'is-active' : ''}" data-action="runPreset" data-i="${i}">${p.emoji} ${U.esc(p.title)}</button>`).join('')}
      </div>

      <label class="field">
        <span class="field__label">Что идёт</span>
        <input class="input" id="runTitle" value="${U.esc(d.title)}" placeholder="Например: стирка" maxlength="120" />
      </label>

      <div class="field">
        <span class="field__label">Сколько времени</span>
        <div class="chips">
          ${chip(null, 'без таймера')}${chip(15, '15 мин')}${chip(30, '30 мин')}${chip(45, '45 мин')}${chip(60, '1 ч')}${chip(90, '1,5 ч')}${chip(120, '2 ч')}
          <input class="input input--mini" id="runCustom" type="number" min="1" max="1440" value="${U.esc(d.custom)}" placeholder="свои, мин" aria-label="Своё время в минутах" />
        </div>
      </div>

      <label class="field">
        <span class="field__label">Что сделать, когда закончится (можно пусто)</span>
        <input class="input" id="runAfter" value="${U.esc(d.after)}" placeholder="Например: развесить бельё" maxlength="120" />
      </label>

      <button class="btn btn--primary btn--lg" data-action="runCreate">Запустить</button>`;
  },

  // ---------- Раз в секунду (из app.js) ----------
  tick() {
    Runs.checkEnded().forEach((r) => this.announce(r));
    Runs.active().forEach((r) => {
      const left = document.querySelector(`[data-run-left="${r.id}"]`);
      if (left) left.textContent = this.leftText(r);
      const bar = document.querySelector(`[data-run-bar="${r.id}"]`);
      const p = Runs.progress(r);
      if (bar && p !== null) bar.style.width = `${Math.round(p * 100)}%`;
    });
  },

  announce(r) {
    const text = `${r.emoji} ${r.title} — готово!${r.after_text ? ` Дальше: ${r.after_text}` : ''}`;
    UI.chime();
    if (Reminders.permission() === 'granted') Reminders.show({ title: text, body: 'Focus Check', taskId: r.task_id });
    UI.toast(text, r.after_text
      ? { actionLabel: 'В план', duration: 15000, onAction: () => Actions.runAfterTask({ id: r.id }) }
      : { duration: 10000 });
    App.render();
  },
};

Object.assign(Actions, {
  openRunStart() {
    Parallel.openStart();
  },

  runForTask(data) {
    Parallel.openStart({ taskId: data.id });
  },

  runPreset(data) {
    Parallel.syncDraft();
    const p = Content.runPresets[Number(data.i)];
    Object.assign(Parallel.draft, { title: p.title, emoji: p.emoji, minutes: p.minutes, custom: '', after: p.after });
    UI.refreshModal();
  },

  runMinutes(data) {
    Parallel.syncDraft();
    Parallel.draft.minutes = data.min ? Number(data.min) : null;
    Parallel.draft.custom = '';
    UI.refreshModal();
  },

  runCreate() {
    Parallel.syncDraft();
    const d = Parallel.draft;
    if (!d.title.trim()) return UI.toast('Напиши, что идёт: например, «стирка».');
    const custom = Number(d.custom);
    const minutes = custom > 0 ? Math.min(custom, 1440) : d.minutes;
    const preset = Content.runPresets.find((p) => p.title === d.title.trim());
    UI.closeModal();
    Runs.start({ title: d.title, emoji: preset ? preset.emoji : d.emoji, minutes, after: d.after, taskId: d.taskId });
    UI.toast(minutes ? `Запущено. Напомню через ${Parallel.duration(minutes * 60000)} ⏳` : 'Запущено. Отметь, когда закончится ⏳');
  },

  runAdd(data) {
    Runs.addMinutes(data.id, 10);
  },

  runFinish(data) {
    Runs.finish(data.id);
  },

  runStop(data) {
    const run = Runs.get(data.id);
    Runs.finish(data.id, 'stopped');
    UI.toast('Убрано', { actionLabel: 'Вернуть', onAction: () => { run.status = 'running'; run.finished_at = null; Store.save('runs', run); } });
  },

  // Добавить «что сделать потом» задачей на сегодня.
  runAfterTask(data) {
    const run = Runs.get(data.id);
    if (!run) return;
    if (run.after_text) Tasks.add({ title: run.after_text });
    Runs.finish(run.id);
    UI.toast(`В плане на сегодня: ${run.after_text}`);
  },

  runDoneTask(data) {
    const run = Runs.get(data.id);
    if (!run) return;
    Runs.finish(run.id);
    if (run.task_id) {
      Tasks.complete(run.task_id);
      if (!Elephant.afterDone(run.task_id)) UI.toast(U.pick(Content.doneCheers));
    }
  },
});
