// ============================================================
// reminders.js — напоминания о делах, у которых указано время.
// ============================================================
//
// ЧЕСТНО О ВОЗМОЖНОСТЯХ:
// 1) Уведомления приходят, пока приложение ОТКРЫТО (можно свернуть окно
//    или переключиться на другую вкладку). Если приложение закрыто —
//    веб-страница сама себя «разбудить» не может.
// 2) Для надёжного напоминания при закрытом приложении у задачи есть кнопки
//    «Google Календарь» и «Файл для календаря (.ics)» — тогда напомнит календарь.
// 3) Настоящие push-напоминания при закрытом приложении — этап 2.0
//    (нужен сервер: Supabase + рассылка push).

const Reminders = {
  checkedAt: 0,
  GRACE_MIN: 30, // если приложение открыли позже — напомним, но не позже чем через 30 мин после срока

  key() {
    return CONFIG.STORAGE_PREFIX + 'reminded';
  },

  load() {
    try {
      return JSON.parse(localStorage.getItem(this.key())) || { sent: {} };
    } catch {
      return { sent: {} };
    }
  },

  save(state) {
    try {
      localStorage.setItem(this.key(), JSON.stringify(state));
    } catch {
      /* не критично */
    }
  },

  // ---------- Разрешение на системные уведомления ----------
  // 'granted' | 'denied' | 'default' | 'unsupported'
  permission() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  },

  async requestPermission() {
    if (this.permission() === 'unsupported') {
      UI.toast('Этот браузер не умеет системные уведомления — буду напоминать внутри приложения.');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        UI.toast('Уведомления включены 🔔');
        this.show({ title: 'Focus Check', body: 'Так будут выглядеть напоминания.', taskId: null });
      } else {
        UI.toast('Уведомления не разрешены — буду напоминать внутри приложения.');
      }
    } catch {
      UI.toast('Браузер не дал включить уведомления здесь.');
    }
    App.render();
  },

  // ---------- Проверка (вызывается раз в секунду из app.js, работает раз в 15 с) ----------
  tick() {
    if (!Store.settings.reminders) return;
    const now = Date.now();
    if (now - this.checkedAt < 15000) return;
    this.checkedAt = now;

    const state = this.load();
    const today = U.today();
    const before = Number(Store.settings.remind_before) || 0;
    let changed = false;

    Tasks.forDay(today)
      .filter((t) => t.time && t.status !== 'done')
      .forEach((t) => {
        const key = `${t.id}|${today}|${t.time}`;
        if (state.sent[key]) return;
        const [h, m] = t.time.split(':').map(Number);
        const due = new Date();
        due.setHours(h, m, 0, 0);
        const fireAt = due.getTime() - before * 60000;
        if (now >= fireAt && now <= due.getTime() + this.GRACE_MIN * 60000) {
          this.notify(t, due.getTime() - now);
          state.sent[key] = now;
          changed = true;
        }
      });

    // Чистим записи о прошлых днях
    Object.keys(state.sent).forEach((k) => {
      if (!k.includes(`|${today}|`)) {
        delete state.sent[k];
        changed = true;
      }
    });

    if (changed) this.save(state);
  },

  notify(task, msLeft) {
    const minutes = Math.round(msLeft / 60000);
    const when = minutes > 0 ? `Через ${minutes} мин` : 'Пора';
    const hint = task.first_step ? `Первый шаг: ${task.first_step}` : 'Можно начать с 2 минут.';
    const title = `⏰ ${task.time} · ${task.title}`;

    // Системное уведомление (если разрешено)…
    if (this.permission() === 'granted') this.show({ title, body: `${when}. ${hint}`, taskId: task.id });
    // …и всегда — мягкое сообщение внутри приложения со звуком.
    UI.chime();
    UI.toast(`${when}: ${task.title}`, {
      actionLabel: 'Начать',
      duration: 15000,
      onAction: () => Actions.quickFocus({ id: task.id }),
    });
  },

  // На телефоне (Android) уведомление можно показать только через сервис-воркер,
  // на компьютере — и напрямую. Пробуем по очереди.
  async show({ title, body, taskId }) {
    const options = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: taskId || 'focus-check', data: { taskId } };
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, options);
        return;
      }
      const n = new Notification(title, options);
      n.onclick = () => {
        window.focus();
        if (taskId) TaskSheet.open(taskId);
        n.close();
      };
    } catch (err) {
      console.warn('Системное уведомление не показано:', err);
    }
  },

  // Короткая строка для карточки задачи.
  describe(task) {
    if (!Store.settings.reminders) return 'Напоминания выключены в настройках.';
    if (!task.time) return 'Укажи время — и придёт напоминание.';
    if (!task.date) return 'Выбери день — у задач «потом» напоминаний нет.';
    const before = Number(Store.settings.remind_before) || 0;
    return `Напомню ${before ? `за ${before} мин` : 'в момент'}, пока приложение открыто.`;
  },

  // ============================================================
  // Календарь: напомнит даже при закрытом приложении
  // ============================================================
  stamp(date, time, addMinutes = 0) {
    const [y, mo, d] = date.split('-').map(Number);
    const [h, mi] = time.split(':').map(Number);
    const dt = new Date(y, mo - 1, d, h, mi + addMinutes);
    const p = (n) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}${p(dt.getMonth() + 1)}${p(dt.getDate())}T${p(dt.getHours())}${p(dt.getMinutes())}00`;
  },

  googleLink(task) {
    const date = task.date || U.today();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: task.title,
      dates: `${this.stamp(date, task.time)}/${this.stamp(date, task.time, 15)}`,
      ctz: tz,
      details: task.first_step ? `Первый шаг: ${task.first_step}` : 'Из Focus Check',
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  },

  downloadIcs(task) {
    const date = task.date || U.today();
    const before = Number(Store.settings.remind_before) || 0;
    const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
    const utcNow = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Focus Check//RU', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${task.id}@focus-check`,
      `DTSTAMP:${utcNow}`,
      `DTSTART:${this.stamp(date, task.time)}`,
      'DURATION:PT15M',
      `SUMMARY:${esc(task.title)}`,
      task.first_step ? `DESCRIPTION:${esc('Первый шаг: ' + task.first_step)}` : 'DESCRIPTION:Из Focus Check',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(task.title)}`, `TRIGGER:-PT${before}M`, 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ];
    const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${task.title.slice(0, 40).replace(/[\\/:*?"<>|]/g, '')}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    UI.toast('Файл скачан — откройте его, и событие добавится в календарь');
  },

  // Блок для карточки задачи.
  sheetBlock(task) {
    const canCalendar = task.time && task.status !== 'done';
    return `
      <div class="field reminder-box">
        <span class="field__label">🔔 Напоминание</span>
        <p class="muted small">${this.describe(task)}</p>
        ${canCalendar ? `
          <div class="chips">
            <a class="chip" href="${this.googleLink(task)}" target="_blank" rel="noopener">Google Календарь</a>
            <button class="chip" data-action="reminderIcs" data-id="${task.id}">Файл для календаря (.ics)</button>
          </div>
          <p class="muted small">Календарь напомнит, даже если приложение закрыто.</p>` : ''}
      </div>`;
  },
};

Object.assign(Actions, {
  allowNotifications() {
    Reminders.requestPermission();
  },

  reminderIcs(data) {
    const task = Tasks.get(data.id);
    if (task) Reminders.downloadIcs(task);
  },

  setRemindBefore(data) {
    Store.saveSettings({ remind_before: Number(data.min) });
  },
});

// Нажатие на системное уведомление на телефоне: сервис-воркер присылает id задачи.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'open-task' && event.data.taskId && Tasks.get(event.data.taskId)) {
      location.hash = '#today';
      TaskSheet.open(event.data.taskId);
    }
  });
}
