// ============================================================
// Экран «Прогресс»: мягкая картина недели и дневник побед.
// Никаких «серий», которые обнуляются и вызывают вину.
// ============================================================

Screens.progress = {
  title: 'Прогресс',

  render() {
    const week = Stats.week();
    const today = week[6];
    const max = Math.max(3, ...week.map((d) => d.wins));
    const sum = (key) => week.reduce((s, d) => s + d[key], 0);
    const activeDays = week.filter((d) => d.wins > 0).length;
    const best = Stats.bestTimeOfDay();
    const bestText = { morning: 'утром', day: 'днём', evening: 'вечером' };
    const note = Days.get();

    return `
      ${UI.header({ title: 'Прогресс', subtitle: U.pickForDay(Content.progressLines, 'p') })}

      <section class="card">
        <div class="section__head">
          <h2 class="section__title">Последние 7 дней</h2>
          <span class="muted small">маленькие победы</span>
        </div>
        <div class="week" role="img" aria-label="Победы по дням за неделю">
          ${week.map((d, i) => `
            <div class="week__day ${i === 6 ? 'is-today' : ''}">
              <span class="week__num">${d.wins || ''}</span>
              <div class="week__bar"><span style="height:${Math.max(4, (d.wins / max) * 100)}%"></span></div>
              <span class="week__label">${i === 6 ? 'сег.' : U.weekday(d.date)}</span>
            </div>`).join('')}
        </div>
        <p class="muted small">Победа — это сделанное дело, фокус-сессия или отмеченная привычка.</p>
      </section>

      <div class="stats">
        <div class="stat"><b>${sum('tasks')}</b><span>${U.plural(sum('tasks'), ['дело', 'дела', 'дел'])} завершено</span></div>
        <div class="stat"><b>${sum('minutes')}</b><span>${U.plural(sum('minutes'), ['минута', 'минуты', 'минут'])} фокуса</span></div>
        <div class="stat"><b>${activeDays}<small>/7</small></b><span>дней с победами</span></div>
        <div class="stat"><b>${sum('habits')}</b><span>${U.plural(sum('habits'), ['отметка', 'отметки', 'отметок'])} рутины</span></div>
      </div>

      ${best ? `<p class="hint-card">${Icon.sprout}<span>Чаще всего у тебя получается завершать дела <b>${bestText[best]}</b>. Может, ставить главное на это время?</span></p>` : ''}

      <section class="card">
        <h2 class="section__title">Сегодня получилось</h2>
        ${this.todayWins(today)}
      </section>

      <section class="card card--soft">
        <h2 class="section__title">Одна вещь, за которую можно себя похвалить</h2>
        <form class="inline-form" data-submit="saveWin" autocomplete="off">
          <input class="input" name="win" value="${U.esc(note ? note.win_note : '')}" maxlength="200"
            placeholder="Например: дело не брошено на середине / отдых без вины" />
          <button class="btn btn--primary btn--sm" type="submit">Сохранить</button>
        </form>
        ${this.pastWins()}
      </section>
    `;
  },

  todayWins(d) {
    const items = [];
    Tasks.doneOn(d.date).forEach((t) => items.push(`✓ ${U.esc(t.title)}`));
    if (d.sessions) items.push(`⏱ ${d.sessions} ${U.plural(d.sessions, ['фокус-сессия', 'фокус-сессии', 'фокус-сессий'])}, ${d.minutes} мин`);
    if (d.habits) items.push(`🌿 ${d.habits} ${U.plural(d.habits, ['привычка', 'привычки', 'привычек'])}`);
    if (d.runs) items.push(`⏳ ${d.runs} ${U.plural(d.runs, ['параллельное дело', 'параллельных дела', 'параллельных дел'])}`);
    if (d.hours) items.push(`🕐 ${d.hours} ${U.plural(d.hours, ['час отмечен', 'часа отмечено', 'часов отмечено'])}`);
    if (!items.length) {
      return `<p class="muted">Пока тихо — и это нормально. Раз приложение открыто — забота о себе уже началась.</p>`;
    }
    return `<ul class="plain-list">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
  },

  pastWins() {
    const wins = Days.recentWins(6).filter((d) => d.date !== U.today());
    if (!wins.length) return '';
    return `
      <ul class="plain-list plain-list--quiet">
        ${wins.map((d) => `<li><span>${U.esc(d.win_note)}</span><span class="muted small">${U.relDay(d.date)}</span></li>`).join('')}
      </ul>`;
  },
};

Object.assign(Actions, {
  saveWin(form) {
    const text = String(form.get('win') || '').trim();
    Days.setWin(text);
    if (text) UI.toast('Записано. Это правда считается.');
  },
});
