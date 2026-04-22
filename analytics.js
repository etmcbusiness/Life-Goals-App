(function () {
  function getCurrentMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function renderAnalyticsPage() {
    if (typeof window.renderAnalyticsForMonth === 'function') {
      window.renderAnalyticsForMonth(getCurrentMonthKey());
    }
  }

  function buildHabitLogTable() {
    const panel = document.getElementById('analyticsHabitLogPanel');
    if (!panel || typeof window.DailyHabits === 'undefined') return;

    const monthKey = getCurrentMonthKey();
    const nowKey = window.DailyHabits.localDateKey(new Date());
    const dim =
      typeof window.analyticsRenderDaysInMonthKey === 'function'
        ? window.analyticsRenderDaysInMonthKey(monthKey)
        : new Date(
            Number(monthKey.slice(0, 4)),
            Number(monthKey.slice(5, 7)),
            0
          ).getDate();
    const meta = window.DailyHabits.HABIT_META || [];

    panel.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'analytics-habit-log-table';

    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    const hDate = document.createElement('th');
    hDate.textContent = 'Date';
    hr.appendChild(hDate);
    const habitColTitle = {
      emails: 'Emails',
      dms: 'DMS',
      videos: 'Videos',
      pnl: 'P&L'
    };
    meta.forEach(function (h) {
      const th = document.createElement('th');
      th.textContent = habitColTitle[h.id] || h.label;
      hr.appendChild(th);
    });
    const hClear = document.createElement('th');
    hClear.textContent = '';
    hr.appendChild(hClear);
    thead.appendChild(hr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    for (let day = 1; day <= dim; day++) {
      const dateKey = `${monthKey}-${String(day).padStart(2, '0')}`;
      const isFuture = dateKey > nowKey;
      const dayRow = window.DailyHabits.getDay(dateKey);

      const tr = document.createElement('tr');
      if (isFuture) tr.classList.add('analytics-habit-log-row--future');

      const tdDate = document.createElement('td');
      tdDate.textContent = dateKey;
      tr.appendChild(tdDate);

      meta.forEach(function (h) {
        const td = document.createElement('td');
        td.className = 'analytics-habit-log-cell-check';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'analytics-habit-log-checkbox';
        cb.checked = !!dayRow[h.id];
        cb.disabled = isFuture;
        cb.setAttribute('aria-label', `${h.label} on ${dateKey}`);
        cb.addEventListener('change', function () {
          window.DailyHabits.setHabit(dateKey, h.id, cb.checked);
          renderAnalyticsPage();
        });
        td.appendChild(cb);
        tr.appendChild(td);
      });

      const tdClear = document.createElement('td');
      tdClear.className = 'analytics-habit-log-cell-clear';
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'analytics-habit-log-clear';
      clearBtn.textContent = 'Clear day';
      clearBtn.disabled = isFuture;
      clearBtn.setAttribute('aria-label', `Clear all habits for ${dateKey}`);
      clearBtn.addEventListener('click', function () {
        meta.forEach(function (h) {
          window.DailyHabits.setHabit(dateKey, h.id, false);
        });
        meta.forEach(function (h, idx) {
          const cell = tr.children[idx + 1];
          const input = cell && cell.querySelector('input');
          if (input) input.checked = false;
        });
        renderAnalyticsPage();
      });
      tdClear.appendChild(clearBtn);
      tr.appendChild(tdClear);

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    panel.appendChild(table);
  }

  function wireHabitLogToggle() {
    const toggle = document.getElementById('analyticsHabitLogToggle');
    const panel = document.getElementById('analyticsHabitLogPanel');
    if (!toggle || !panel || toggle.dataset.wired === '1') return;
    toggle.dataset.wired = '1';

    toggle.addEventListener('click', function () {
      const show = panel.hidden;
      panel.hidden = !show;
      toggle.setAttribute('aria-expanded', String(show));
      if (show) buildHabitLogTable();
    });
  }

  function renderAnalytics() {
    renderAnalyticsPage();
    const panel = document.getElementById('analyticsHabitLogPanel');
    if (panel && !panel.hidden) buildHabitLogTable();
  }

  renderAnalytics();
  wireHabitLogToggle();
  window.addEventListener('pageshow', renderAnalytics);
  window.addEventListener('storage', function (e) {
    if (e.key === 'aprilRevenueEntries') {
      renderAnalytics();
      return;
    }
    if (!window.DailyHabits || e.key !== window.DailyHabits.STORAGE_KEY) return;
    renderAnalyticsPage();
    const panel = document.getElementById('analyticsHabitLogPanel');
    if (panel && !panel.hidden) buildHabitLogTable();
  });
})();
