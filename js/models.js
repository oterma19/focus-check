// ============================================================
// models.js — «правила» приложения: что такое задача, привычка,
// почасовая отметка, фокус-сессия, и что с ними можно делать.
// Здесь нет HTML — только данные и действия над ними.
// ============================================================

// ---------------- Задачи ----------------
const Tasks = {
  all() {
    return Store.db.tasks;
  },

  get(id) {
    return Store.find('tasks', id);
  },

  // Быстрый ввод понимает время в начале: «15:30 позвонить в банк»
  // и слово «завтра»: «завтра купить хлеб».
  parseQuick(text) {
    let title = text.trim();
    let time = null;
    let date = U.today();

    const timeMatch = title.match(/^(\d{1,2})[:.](\d{2})\s+(.+)$/);
    if (timeMatch && Number(timeMatch[1]) < 24 && Number(timeMatch[2]) < 60) {
      time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
      title = timeMatch[3];
    }
    const tomorrowMatch = title.match(/^завтра\s+(.+)$/i);
    if (tomorrowMatch) {
      date = U.addDays(U.today(), 1);
      title = tomorrowMatch[1];
    }
    return { title: title.trim(), time, date };
  },

  add({ title, date = U.today(), time = null, is_main = false, parent_id = null, position = 0 }) {
    const now = U.nowIso();
    const task = {
      id: U.uid(),
      title: title.trim(),
      date,               // 'ГГГГ-ММ-ДД' или null («потом»)
      time: time || null, // 'ЧЧ:ММ' или null
      is_main,            // «главное дело дня»
      status: 'todo',     // 'todo' | 'done'
      first_step: '',     // самое маленькое первое действие
      finish_line: '',    // что считается «готово»
      parent_id,          // если это кусочек «слона» — id большого дела, иначе null
      position,           // порядок кусочков внутри «слона»
      created_at: now,
      updated_at: now,
      done_at: null,
    };
    if (is_main && date) this.clearMain(date);
    return Store.save('tasks', task);
  },

  update(id, patch, options) {
    const task = this.get(id);
    if (!task) return;
    Object.assign(task, patch);
    Store.save('tasks', task, options);
  },

  toggle(id) {
    const task = this.get(id);
    if (!task) return false;
    const done = task.status !== 'done';
    this.update(id, { status: done ? 'done' : 'todo', done_at: done ? U.nowIso() : null });
    return done;
  },

  complete(id) {
    const task = this.get(id);
    if (task && task.status !== 'done') this.update(id, { status: 'done', done_at: U.nowIso() });
  },

  // Удаляем задачу; у «слона» — вместе со всеми кусочками.
  remove(id) {
    this.children(id).forEach((c) => Store.remove('tasks', c.id, { silent: true }));
    Store.remove('tasks', id);
  },

  clearMain(date) {
    this.all()
      .filter((t) => t.date === date && t.is_main)
      .forEach((t) => {
        t.is_main = false;
        Store.save('tasks', t, { silent: true });
      });
  },

  toggleMain(id) {
    const task = this.get(id);
    if (!task || this.isElephant(task)) return;
    if (task.is_main) {
      this.update(id, { is_main: false });
    } else {
      const date = task.date || U.today();
      this.clearMain(date);
      this.update(id, { is_main: true, date });
    }
  },

  moveTo(id, date) {
    const task = this.get(id);
    if (!task) return;
    const patch = { date };
    if (task.is_main && date !== task.date) patch.is_main = false;
    this.update(id, patch);
  },

  // Сортировка: сначала дела со временем (по времени), потом остальные (по порядку добавления).
  sort(list) {
    return [...list].sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return a.created_at.localeCompare(b.created_at);
    });
  },

  // Дела на день. «Слоны» сюда не попадают — в план дня идут их кусочки.
  forDay(date) {
    return this.all().filter((t) => t.date === date && !this.isElephant(t));
  },

  main(date) {
    return this.forDay(date).find((t) => t.is_main && t.status !== 'done')
      || this.forDay(date).find((t) => t.is_main);
  },

  // Незавершённые дела с прошлых дней. Мы НЕ называем их «просроченными».
  leftovers() {
    const today = U.today();
    return this.sort(this.all().filter((t) => t.date && t.date < today && t.status !== 'done' && !this.isElephant(t)));
  },

  // «Потом»: без даты или на будущие дни.
  later() {
    const today = U.today();
    return this.all()
      .filter((t) => t.status !== 'done' && (!t.date || t.date > today) && !this.isElephant(t))
      .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  },

  doneOn(date) {
    return this.all().filter((t) => t.status === 'done' && t.done_at && U.dayKey(new Date(t.done_at)) === date);
  },

  // ============================================================
  // «Съесть слона по кусочку»: большое дело → маленькие кусочки.
  // Кусочек — обычная задача с parent_id. Вложенность — один уровень:
  // у кусочка своих кусочков не бывает (иначе легко утонуть в планировании).
  // ============================================================
  children(id) {
    return this.all()
      .filter((t) => t.parent_id === id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.created_at.localeCompare(b.created_at));
  },

  isElephant(task) {
    return Boolean(task) && this.all().some((t) => t.parent_id === task.id);
  },

  parentOf(task) {
    return task && task.parent_id ? this.get(task.parent_id) : null;
  },

  // Все незаконченные «слоны».
  elephants() {
    return this.all()
      .filter((t) => t.status !== 'done' && this.isElephant(t))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  nextPiece(elephantId) {
    return this.children(elephantId).find((c) => c.status !== 'done') || null;
  },

  progress(elephantId) {
    const list = this.children(elephantId);
    return { done: list.filter((c) => c.status === 'done').length, total: list.length };
  },

  // Разбить дело на кусочки.
  //   taskId — существующая задача (или null, тогда создаётся новый «слон» с названием title);
  //   pieces — массив названий кусочков;
  //   plan   — 'first' (первый кусочек на сегодня, остальные «потом»), 'all' (все на сегодня), 'none' (все «потом»).
  breakDown({ taskId = null, title = '', pieces = [], plan = 'first' }) {
    const names = pieces.map((p) => p.trim()).filter(Boolean);
    if (!names.length) return [];

    let elephant = taskId ? this.get(taskId) : this.add({ title, date: null });
    if (elephant.parent_id) elephant = this.get(elephant.parent_id); // кусочек кусочка → кладём рядом

    const wasMain = elephant.is_main && elephant.date === U.today();
    if (elephant.date || elephant.is_main) {
      elephant.date = null;
      elephant.is_main = false;
      Store.save('tasks', elephant, { silent: true });
    }

    const existing = this.children(elephant.id);
    let position = existing.length ? Math.max(...existing.map((c) => c.position ?? 0)) + 1 : 0;
    const today = U.today();
    const created = names.map((name, i) => {
      const date = plan === 'all' ? today : plan === 'first' && i === 0 ? today : null;
      return this.add({ title: name, date, parent_id: elephant.id, position: position++ });
    });
    if (wasMain && created[0].date === today) this.toggleMain(created[0].id);
    Store.changed();
    return created;
  },

  // Что сказать после того, как кусочек сделан.
  pieceFollowUp(id) {
    const task = this.get(id);
    if (!task || !task.parent_id || task.status !== 'done') return null;
    const elephant = this.get(task.parent_id);
    if (!elephant || elephant.status === 'done') return null;
    const next = this.nextPiece(elephant.id);
    if (!next) return { type: 'all', elephant };
    if (!next.date || next.date > U.today()) return { type: 'next', elephant, next };
    return { type: 'progress', elephant };
  },

  // Закрыть «слона» целиком (оставшиеся кусочки тоже отмечаются).
  completeElephant(id) {
    this.children(id).forEach((c) => {
      if (c.status !== 'done') {
        c.status = 'done';
        c.done_at = U.nowIso();
        Store.save('tasks', c, { silent: true });
      }
    });
    this.complete(id);
  },

  // Переезд со старой версии: раньше «шаги» хранились внутри задачи (поле steps).
  // Превращаем их в настоящие кусочки один раз при запуске.
  migrateSteps() {
    this.all()
      .filter((t) => Array.isArray(t.steps))
      .forEach((t) => {
        const steps = t.steps;
        delete t.steps;
        Store.save('tasks', t, { silent: true });
        steps.forEach((s, i) => {
          const piece = this.add({ title: s.title, date: t.date, parent_id: t.id, position: i });
          if (s.done) {
            piece.status = 'done';
            piece.done_at = t.updated_at;
            Store.save('tasks', piece, { silent: true });
          }
        });
        if (steps.length && t.date) {
          t.date = null;
          t.is_main = false;
          Store.save('tasks', t, { silent: true });
        }
      });
  },
};

// ---------------- Привычки (рутина) ----------------
const Habits = {
  all() {
    return Store.db.habits.filter((h) => !h.archived);
  },

  byPart(part) {
    return this.all()
      .filter((h) => h.part === part)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  add(title, part = 'morning') {
    const now = U.nowIso();
    return Store.save('habits', {
      id: U.uid(),
      title: title.trim(),
      part,             // 'morning' | 'day' | 'evening'
      archived: false,
      created_at: now,
      updated_at: now,
    });
  },

  remove(id) {
    Store.db.habit_checks
      .filter((c) => c.habit_id === id)
      .forEach((c) => Store.remove('habit_checks', c.id, { silent: true }));
    Store.remove('habits', id);
  },

  check(habitId, date) {
    return Store.db.habit_checks.find((c) => c.habit_id === habitId && c.date === date);
  },

  toggle(habitId, date = U.today()) {
    const existing = this.check(habitId, date);
    if (existing) {
      Store.remove('habit_checks', existing.id);
      return false;
    }
    const now = U.nowIso();
    Store.save('habit_checks', { id: U.uid(), habit_id: habitId, date, created_at: now, updated_at: now });
    return true;
  },

  // Последние 7 дней: [false, true, …] — без «серий», которые больно обнулять.
  week(habitId) {
    const today = U.today();
    return Array.from({ length: 7 }, (_, i) => {
      const date = U.addDays(today, i - 6);
      return { date, done: Boolean(this.check(habitId, date)) };
    });
  },

  checksOn(date) {
    const ids = new Set(this.all().map((h) => h.id));
    return Store.db.habit_checks.filter((c) => c.date === date && ids.has(c.habit_id));
  },
};

// ---------------- Почасовой чек-лист ----------------
const Hours = {
  range() {
    const { day_start, day_end } = Store.settings;
    const list = [];
    for (let h = day_start; h <= day_end; h++) list.push(h);
    return list;
  },

  get(date, hour) {
    return Store.db.hourly_entries.find((e) => e.date === date && e.hour === hour);
  },

  ensure(date, hour) {
    let entry = this.get(date, hour);
    if (!entry) {
      const now = U.nowIso();
      entry = { id: U.uid(), date, hour, note: '', done: false, created_at: now, updated_at: now };
    }
    return entry;
  },

  setNote(date, hour, note) {
    const entry = this.ensure(date, hour);
    entry.note = note.trim();
    Store.save('hourly_entries', entry, { silent: true });
  },

  toggle(date, hour) {
    const entry = this.ensure(date, hour);
    entry.done = !entry.done;
    Store.save('hourly_entries', entry);
  },

  filledOn(date) {
    return Store.db.hourly_entries.filter((e) => e.date === date && (e.done || e.note));
  },
};

// ---------------- Заметки дня: уровень сил и «что получилось» ----------------
const Days = {
  get(date = U.today()) {
    return Store.db.day_notes.find((d) => d.date === date);
  },

  ensure(date) {
    let note = this.get(date);
    if (!note) {
      const now = U.nowIso();
      note = { id: U.uid(), date, energy: null, win_note: '', created_at: now, updated_at: now };
    }
    return note;
  },

  setEnergy(level, date = U.today()) {
    const note = this.ensure(date);
    note.energy = level;
    Store.save('day_notes', note);
  },

  setWin(text, date = U.today(), options) {
    const note = this.ensure(date);
    note.win_note = text.trim();
    Store.save('day_notes', note, options);
  },

  recentWins(limit = 5) {
    return Store.db.day_notes
      .filter((d) => d.win_note)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);
  },

  // Длина фокуса «по умолчанию» с учётом сил сегодня.
  suggestedFocus() {
    const energy = this.get()?.energy;
    const fromEnergy = energy && Content.energy[energy].focus;
    return fromEnergy || Store.settings.focus_minutes;
  },
};

// ---------------- Фокус-сессии ----------------
// Идущая сессия хранится отдельно (только на этом устройстве), чтобы
// таймер пережил перезагрузку страницы. Завершённые сессии пишутся
// в таблицу focus_sessions.
const Focus = {
  active: null,

  storageKey() {
    return CONFIG.STORAGE_PREFIX + 'active_focus';
  },

  loadActive() {
    try {
      this.active = JSON.parse(localStorage.getItem(this.storageKey())) || null;
    } catch {
      this.active = null;
    }
  },

  saveActive() {
    try {
      if (this.active) localStorage.setItem(this.storageKey(), JSON.stringify(this.active));
      else localStorage.removeItem(this.storageKey());
    } catch {
      /* не критично: таймер просто не переживёт перезагрузку */
    }
  },

  start({ taskId = null, title = '', minutes = 5 }) {
    const now = Date.now();
    this.active = {
      id: U.uid(),
      task_id: taskId,
      title: title || (taskId && Tasks.get(taskId)?.title) || 'Фокус без задачи',
      planned_min: minutes,
      started_at: now,
      ends_at: now + minutes * 60000,
      paused_left: null,     // сколько мс оставалось на момент паузы
      status: 'running',     // 'running' | 'paused' | 'review'
    };
    this.saveActive();
    Store.changed();
  },

  leftMs() {
    const a = this.active;
    if (!a) return 0;
    if (a.status === 'paused') return a.paused_left;
    if (a.status === 'review') return Math.max(0, a.review_left ?? 0);
    return Math.max(0, a.ends_at - Date.now());
  },

  totalMs() {
    return this.active ? this.active.planned_min * 60000 : 1;
  },

  pause() {
    if (!this.active || this.active.status !== 'running') return;
    this.active.paused_left = this.leftMs();
    this.active.status = 'paused';
    this.saveActive();
    Store.changed();
  },

  resume() {
    if (!this.active || this.active.status !== 'paused') return;
    this.active.ends_at = Date.now() + this.active.paused_left;
    this.active.paused_left = null;
    this.active.status = 'running';
    this.saveActive();
    Store.changed();
  },

  addMinutes(n) {
    const a = this.active;
    if (!a) return;
    a.planned_min += n;
    if (a.status === 'paused') {
      a.paused_left += n * 60000;
    } else if (a.status === 'review') {
      a.ends_at = Date.now() + (a.review_left || 0) + n * 60000;
      a.status = 'running';
      a.review_left = null;
    } else {
      a.ends_at += n * 60000;
    }
    this.saveActive();
    Store.changed();
  },

  // Перейти к вопросу «как прошло?» (по окончании времени или раньше).
  review() {
    const a = this.active;
    if (!a || a.status === 'review') return;
    a.review_left = this.leftMs();
    a.status = 'review';
    this.saveActive();
    Store.changed();
  },

  // outcome: 'done' | 'progress' | 'stopped'
  finish(outcome) {
    const a = this.active;
    if (!a) return;
    const spentMs = a.planned_min * 60000 - (a.review_left ?? this.leftMs());
    const actual = Math.max(1, Math.round(spentMs / 60000));
    const now = U.nowIso();
    Store.save('focus_sessions', {
      id: a.id,
      task_id: a.task_id,
      title: a.title,
      date: U.today(),
      planned_min: a.planned_min,
      actual_min: actual,
      outcome,
      started_at: new Date(a.started_at).toISOString(),
      ended_at: now,
      created_at: now,
      updated_at: now,
    }, { silent: true });
    if (outcome === 'done' && a.task_id) Tasks.complete(a.task_id);
    this.active = null;
    this.saveActive();
    Store.changed();
  },

  cancel() {
    this.active = null;
    this.saveActive();
    Store.changed();
  },

  sessionsOn(date) {
    return Store.db.focus_sessions.filter((s) => s.date === date);
  },

  minutesOn(date) {
    return this.sessionsOn(date).reduce((sum, s) => sum + (s.actual_min || 0), 0);
  },
};

// ---------------- Статистика для экрана «Прогресс» ----------------
const Stats = {
  // «Победы» за день: всё, что получилось, складывается вместе.
  day(date) {
    const tasks = Tasks.doneOn(date).length;
    const sessions = Focus.sessionsOn(date).length;
    const minutes = Focus.minutesOn(date);
    const habits = Habits.checksOn(date).length;
    const hours = Hours.filledOn(date).length;
    return { date, tasks, sessions, minutes, habits, hours, wins: tasks + sessions + habits };
  },

  week() {
    const today = U.today();
    return Array.from({ length: 7 }, (_, i) => this.day(U.addDays(today, i - 6)));
  },

  // Когда чаще завершаются дела — мягкая подсказка, а не оценка.
  bestTimeOfDay() {
    const since = U.addDays(U.today(), -13);
    const done = Tasks.all().filter((t) => t.done_at && U.dayKey(new Date(t.done_at)) >= since);
    if (done.length < 3) return null;
    const buckets = { morning: 0, day: 0, evening: 0 };
    done.forEach((t) => {
      const h = new Date(t.done_at).getHours();
      if (h < 12) buckets.morning++;
      else if (h < 17) buckets.day++;
      else buckets.evening++;
    });
    return Object.entries(buckets).sort((a, b) => b[1] - a[1])[0][0];
  },
};
