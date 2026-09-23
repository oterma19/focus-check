// ============================================================
// Экран «Настройки»: имя, тема, фокус, часы, данные, облако.
// ============================================================

Screens.settings = {
  title: 'Настройки',

  render() {
    const s = Store.settings;
    const themeChip = (value, label) =>
      `<button class="chip ${s.theme === value ? 'is-active' : ''}" data-action="setTheme" data-theme="${value}">${label}</button>`;
    const hourOptions = (selected, from, to) => {
      let html = '';
      for (let h = from; h <= to; h++) html += `<option value="${h}" ${h === selected ? 'selected' : ''}>${U.hh(h)}</option>`;
      return html;
    };

    return `
      ${UI.header({ title: 'Настройки', subtitle: 'Всё под тебя', gear: false })}

      <section class="card settings">
        <label class="field">
          <span class="field__label">Как к тебе обращаться</span>
          <input class="input" data-change="setName" value="${U.esc(s.name)}" placeholder="Имя (можно не писать)" maxlength="40" />
        </label>

        <div class="field">
          <span class="field__label">Тема</span>
          <div class="chips">${themeChip('auto', 'Как в системе')}${themeChip('light', 'Светлая')}${themeChip('dark', 'Тёмная')}</div>
        </div>

        <div class="field">
          <span class="field__label">Фокус по умолчанию</span>
          <div class="chips">
            ${[2, 5, 10, 15, 25].map((m) => `<button class="chip chip--round ${s.focus_minutes === m ? 'is-active' : ''}" data-action="setFocusDefault" data-min="${m}">${m}</button>`).join('')}
          </div>
        </div>

        <div class="field">
          <span class="field__label">Почасовой чек-лист</span>
          <div class="inline-form">
            <select class="input" data-change="setHours" data-edge="day_start" aria-label="Начало дня">${hourOptions(s.day_start, 5, 12)}</select>
            <span class="muted">—</span>
            <select class="input" data-change="setHours" data-edge="day_end" aria-label="Конец дня">${hourOptions(s.day_end, 17, 23)}</select>
          </div>
        </div>

        <label class="switch">
          <input type="checkbox" data-change="setToggle" data-key="sound" ${s.sound ? 'checked' : ''} />
          <span>Тихий звук в конце фокуса</span>
        </label>
        <label class="switch">
          <input type="checkbox" data-change="setToggle" data-key="hourly_nudge" ${s.hourly_nudge ? 'checked' : ''} />
          <span>Мягкое напоминание в начале каждого часа (пока приложение открыто)</span>
        </label>
      </section>

      <section class="card">
        <h2 class="section__title">🔔 Напоминания о делах со временем</h2>
        <label class="switch">
          <input type="checkbox" data-change="setToggle" data-key="reminders" ${s.reminders ? 'checked' : ''} />
          <span>Напоминать, если у задачи указано время</span>
        </label>
        <div class="field">
          <span class="field__label">Когда напоминать</span>
          <div class="chips">
            ${[[0, 'в момент'], [5, 'за 5 мин'], [10, 'за 10 мин'], [15, 'за 15 мин'], [30, 'за 30 мин']].map(([m, label]) =>
              `<button class="chip ${Number(s.remind_before) === m ? 'is-active' : ''}" data-action="setRemindBefore" data-min="${m}">${label}</button>`).join('')}
          </div>
        </div>
        ${{
          granted: '<p class="muted small">Системные уведомления разрешены ✓</p>',
          denied: '<p class="muted small">Системные уведомления запрещены в браузере. Напоминания будут внутри приложения (со звуком). Разрешить можно в настройках сайта: значок слева от адреса → Уведомления.</p>',
          default: '<button class="btn btn--primary btn--sm" data-action="allowNotifications">Разрешить уведомления</button>',
          unsupported: '<p class="muted small">Здесь браузер не поддерживает системные уведомления — напоминания будут внутри приложения.</p>',
        }[Reminders.permission()]}
        <p class="muted small"><b>Важно:</b> напоминание приходит, пока приложение открыто (можно свернуть). Чтобы напомнило при закрытом приложении, в карточке задачи есть кнопки «Google Календарь» и «Файл для календаря».</p>
      </section>

      <section class="card">
        <h2 class="section__title">Мои данные</h2>
        ${Auth.mode === 'cloud'
          ? `<p class="muted small">Данные хранятся в облаке (Supabase), аккаунт: ${U.esc(Auth.user.email || '')}.</p>`
          : `<p class="muted small">Сейчас всё хранится <b>только в этом браузере</b> на этом компьютере. Если очистить данные браузера — записи пропадут, поэтому иногда делай резервную копию.</p>`}
        <div class="row-actions row-actions--start">
          <button class="btn btn--ghost btn--sm" data-action="exportData">Скачать резервную копию</button>
          <label class="btn btn--ghost btn--sm">
            Восстановить из копии
            <input type="file" accept="application/json,.json" data-change="importData" hidden />
          </label>
        </div>
      </section>

      <section class="card card--soft">
        <h2 class="section__title">Облако и вход через Google</h2>
        ${Auth.mode === 'cloud'
          ? `<button class="btn btn--ghost btn--sm" data-action="signOut">Выйти</button>`
          : Auth.client
            ? `<p class="muted small">Облако настроено. Войди, чтобы данные были на всех устройствах.</p>
               <button class="btn btn--primary btn--sm" data-action="signIn">Войти через Google</button>`
            : `<p class="muted small">Скоро: синхронизация между компьютером и телефоном. Места для подключения уже подготовлены — см. README, раздел «Supabase».</p>
               <button class="btn btn--ghost btn--sm" disabled>Войти через Google (позже)</button>`}
      </section>

      <section class="card">
        <div class="row-actions row-actions--start">
          <button class="btn btn--ghost btn--sm" data-action="replayOnboarding">Показать знакомство ещё раз</button>
          <button class="btn btn--ghost btn--sm" data-action="loadDemo">Заполнить примером</button>
          <button class="btn btn--danger-ghost btn--sm" data-action="resetAll">Стереть всё</button>
        </div>
        <p class="muted small">${CONFIG.APP_NAME} ${CONFIG.VERSION} · режим: ${Auth.mode === 'cloud' ? 'облако' : 'локальный'}</p>
      </section>
    `;
  },
};

Object.assign(Actions, {
  setName(el) {
    Store.saveSettings({ name: el.value.trim() }, { silent: true });
  },

  setTheme(data) {
    Store.saveSettings({ theme: data.theme });
    App.applyTheme();
  },

  setFocusDefault(data) {
    Store.saveSettings({ focus_minutes: Number(data.min) });
  },

  setHours(el) {
    Store.saveSettings({ [el.dataset.edge]: Number(el.value) });
  },

  setToggle(el) {
    Store.saveSettings({ [el.dataset.key]: el.checked }, { silent: true });
  },

  exportData() {
    const blob = new Blob([JSON.stringify(Store.snapshot(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focus-check-backup-${U.today()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    UI.toast('Резервная копия скачана');
  },

  importData(el) {
    const file = el.files && el.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const snapshot = JSON.parse(reader.result);
        if (!snapshot.db) throw new Error('Не похоже на резервную копию Focus Check');
        const ok = await UI.confirm({
          title: 'Восстановить из копии?',
          text: 'Текущие данные будут заменены данными из файла.',
          ok: 'Восстановить',
        });
        if (!ok) return;
        await Store.restore(snapshot);
        location.reload();
      } catch (err) {
        UI.toast('Не получилось прочитать файл: ' + err.message);
      }
    };
    reader.readAsText(file);
    el.value = '';
  },

  async resetAll() {
    const ok = await UI.confirm({
      title: 'Стереть все данные?',
      text: 'Задачи, привычки, отметки и настройки исчезнут. Если сомневаешься — сначала скачай резервную копию.',
      ok: 'Стереть',
      danger: true,
    });
    if (!ok) return;
    await Data.adapter.clearAll();
    location.hash = '';
    location.reload();
  },

  replayOnboarding() {
    Onboarding.open();
  },

  async loadDemo() {
    const ok = await UI.confirm({
      title: 'Добавить пример?',
      text: 'Появится несколько задач и привычек, чтобы посмотреть, как всё выглядит. Их можно удалить.',
      ok: 'Добавить',
    });
    if (!ok) return;
    Demo.fill();
    location.hash = '#today';
  },

  signIn() {
    Auth.signInWithGoogle();
  },

  signOut() {
    Auth.signOut();
  },
});

// Пример данных — чтобы посмотреть интерфейс «в жизни».
const Demo = {
  fill() {
    const today = U.today();
    // «Слон», разбитый на кусочки
    const pieces = Tasks.breakDown({
      title: 'Подготовить отчёт',
      pieces: ['Собрать цифры в одну таблицу', 'Написать черновик вывода', 'Сделать 3 слайда', 'Отправить на проверку'],
      plan: 'first',
    });
    Tasks.complete(pieces[0].id);
    Tasks.moveTo(pieces[1].id, today);
    Tasks.toggleMain(pieces[1].id);
    Tasks.update(pieces[1].id, {
      first_step: 'Открыть документ и написать три заголовка',
      finish_line: 'Черновик вывода есть, даже неидеальный',
    });
    Tasks.add({ title: 'Позвонить в поликлинику', time: '10:30' });
    const done = Tasks.add({ title: 'Ответить на письмо', time: '09:00' });
    Tasks.toggle(done.id);
    Tasks.add({ title: 'Короткая прогулка' });
    Tasks.add({ title: 'Разобрать фото с телефона', date: null });
    Tasks.add({ title: 'Оплатить интернет', date: U.addDays(today, -1) });

    if (!Habits.all().length) {
      const water = Habits.add('Стакан воды после пробуждения', 'morning');
      Habits.add('10 минут прогулки', 'day');
      Habits.add('Подготовить вещи на завтра', 'evening');
      Habits.toggle(water.id, today);
      Habits.toggle(water.id, U.addDays(today, -1));
      Habits.toggle(water.id, U.addDays(today, -3));
    }
  },
};
