/**
 * Shared revenue + habit analytics for a given YYYY-MM month.
 * Used by analytics.html (current month) and month.html (selected month sidebar).
 */
(function (global) {
  const REVENUE_KEY = 'aprilRevenueEntries';
  const MONTHLY_GOAL = 10000;

  const DEFAULT_ELEMENT_IDS = {
    totalRevenue: 'analyticsTotalRevenueValue',
    expectedRevenue: 'analyticsExpectedRevenueValue',
    dailyGreen1: 'analyticsDailyGreen1',
    dailyRed1: 'analyticsDailyRed1',
    dailyGreen2: 'analyticsDailyGreen2',
    dailyRed2: 'analyticsDailyRed2',
    dailyScaleAvg1: 'analyticsDailyScaleAvg1',
    dailyScaleExtra1: 'analyticsDailyScaleExtra1',
    dailyScaleAvg2: 'analyticsDailyScaleAvg2',
    dailyScaleExtra2: 'analyticsDailyScaleExtra2',
    dailyGoalLine: 'analyticsDailyGoalLine',
    hbarChart: 'analyticsHBarChart'
  };

  const MONTH_PAGE_ELEMENT_IDS = {
    totalRevenue: 'monthSideTotalRevenueValue',
    expectedRevenue: 'monthSideExpectedRevenueValue',
    dailyGreen1: 'monthSideDailyGreen1',
    dailyRed1: 'monthSideDailyRed1',
    dailyGreen2: 'monthSideDailyGreen2',
    dailyRed2: 'monthSideDailyRed2',
    dailyScaleAvg1: 'monthSideDailyScaleAvg1',
    dailyScaleExtra1: 'monthSideDailyScaleExtra1',
    dailyScaleAvg2: 'monthSideDailyScaleAvg2',
    dailyScaleExtra2: 'monthSideDailyScaleExtra2',
    dailyGoalLine: 'monthSideDailyGoalLine',
    hbarChart: 'monthSideHBarChart'
  };

  const HABIT_FILL_CLASSES = [
    'analytics-hbar-fill--habit1',
    'analytics-hbar-fill--habit2',
    'analytics-hbar-fill--habit3',
    'analytics-hbar-fill--habit4'
  ];

  function loadEntries() {
    try {
      const raw = global.localStorage.getItem(REVENUE_KEY);
      const arr = JSON.parse(raw || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function entryMonthKey(entry) {
    if (entry.revenueDate && /^\d{4}-\d{2}-\d{2}$/.test(entry.revenueDate)) {
      return entry.revenueDate.slice(0, 7);
    }
    const c = entry.createdAt ? new Date(entry.createdAt) : null;
    if (!c || Number.isNaN(c.getTime())) return '';
    return `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}`;
  }

  function getCurrentMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function daysInMonthKey(monthKey) {
    const parts = monthKey.split('-');
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(y) || !Number.isFinite(m)) return 30;
    return new Date(y, m, 0).getDate();
  }

  /**
   * Elapsed days in that month used for average daily pace:
   * past month → full month; current → day of month; future → 1 (avoid div-by-zero).
   */
  function paceDayCount(monthKey) {
    const dim = daysInMonthKey(monthKey);
    const cur = getCurrentMonthKey();
    if (monthKey < cur) return Math.max(1, dim);
    if (monthKey > cur) return 1;
    const dom = new Date().getDate();
    return Math.max(1, Math.min(dom, dim));
  }

  function formatCurrency(value) {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    });
  }

  function sumActualEstimatedMonth(entries, monthKey) {
    let actual = 0;
    let estimated = 0;
    entries.forEach(function (entry) {
      if (entryMonthKey(entry) !== monthKey) return;
      const amt = Number(entry.amount || 0);
      if (!Number.isFinite(amt)) return;
      if (entry.revenueKind === 'estimated') {
        estimated += amt;
      } else {
        actual += amt;
      }
    });
    return { actual, estimated };
  }

  function applyDailyPaceRow(avgDaily, neededDaily, greenEl, redEl, scaleAvgEl, scaleExtraEl) {
    if (!greenEl || !redEl || !scaleAvgEl || !scaleExtraEl) return;
    const extraDaily = Math.max(0, neededDaily - avgDaily);
    const pctGreen =
      neededDaily > 0
        ? Math.min(100, Math.max(0, (avgDaily / neededDaily) * 100))
        : avgDaily > 0
          ? 100
          : 0;
    const pctRed = Math.max(0, 100 - pctGreen);

    greenEl.style.flex = `0 0 ${pctGreen}%`;
    redEl.style.flex = `0 0 ${pctRed}%`;

    scaleAvgEl.textContent = `${formatCurrency(avgDaily)} / day`;
    if (extraDaily > 0) {
      scaleExtraEl.textContent = `+${formatCurrency(extraDaily)} / day needed`;
      scaleExtraEl.classList.remove('analytics-daily-scale-extra--on-pace');
    } else {
      scaleExtraEl.textContent = 'On pace';
      scaleExtraEl.classList.add('analytics-daily-scale-extra--on-pace');
    }
  }

  function el(ids, key) {
    const id = ids[key];
    return id ? document.getElementById(id) : null;
  }

  function renderMonthRevenuePanels(monthKey, ids) {
    const entries = loadEntries();
    const sums = sumActualEstimatedMonth(entries, monthKey);
    const totalEl = el(ids, 'totalRevenue');
    const expectedEl = el(ids, 'expectedRevenue');
    if (totalEl) totalEl.textContent = formatCurrency(sums.actual);
    if (expectedEl) expectedEl.textContent = formatCurrency(sums.estimated);
  }

  function renderAverageDailyProgress(monthKey, ids) {
    const g1 = el(ids, 'dailyGreen1');
    const r1 = el(ids, 'dailyRed1');
    const g2 = el(ids, 'dailyGreen2');
    const r2 = el(ids, 'dailyRed2');
    const a1 = el(ids, 'dailyScaleAvg1');
    const e1 = el(ids, 'dailyScaleExtra1');
    const a2 = el(ids, 'dailyScaleAvg2');
    const e2 = el(ids, 'dailyScaleExtra2');
    const goalLine = el(ids, 'dailyGoalLine');
    if (!g1 || !r1 || !g2 || !r2 || !a1 || !e1 || !a2 || !e2 || !goalLine) return;

    const entries = loadEntries();
    const sums = sumActualEstimatedMonth(entries, monthKey);
    const dim = daysInMonthKey(monthKey);
    const paceDays = paceDayCount(monthKey);
    const avgActualDaily = sums.actual / paceDays;
    const avgCombinedDaily = (sums.actual + sums.estimated) / paceDays;

    const neededDaily = dim > 0 ? MONTHLY_GOAL / dim : 0;

    applyDailyPaceRow(avgActualDaily, neededDaily, g1, r1, a1, e1);
    applyDailyPaceRow(avgCombinedDaily, neededDaily, g2, r2, a2, e2);

    goalLine.textContent = `Goal: ${formatCurrency(neededDaily)} / day · $10,000 over ${dim} days`;
  }

  function renderHorizontalBarChart(monthKey, ids) {
    const container = el(ids, 'hbarChart');
    if (!container) return;

    const meta = global.DailyHabits && global.DailyHabits.HABIT_META ? global.DailyHabits.HABIT_META : [];
    const rows = meta.map(function (h, i) {
      const prog =
        global.DailyHabits && typeof global.DailyHabits.habitMonthProgress === 'function'
          ? global.DailyHabits.habitMonthProgress(monthKey, h.id)
          : { done: 0, total: 0, pct: 0 };
      return {
        label: h.label,
        pct: prog.pct,
        countLabel: `${prog.done}/${prog.total}`,
        fillClass: HABIT_FILL_CLASSES[i] || HABIT_FILL_CLASSES[0]
      };
    });

    if (!rows.length) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = '';

    rows.forEach(function (row) {
      const wrap = document.createElement('div');
      wrap.className = 'analytics-hbar-row';

      const lab = document.createElement('span');
      lab.className = 'analytics-hbar-label';
      lab.textContent = row.label;

      const track = document.createElement('div');
      track.className = 'analytics-hbar-track';
      const fill = document.createElement('div');
      fill.className = `analytics-hbar-fill ${row.fillClass}`;
      fill.style.width = `${Math.min(100, Math.max(0, row.pct))}%`;
      track.appendChild(fill);

      const val = document.createElement('span');
      val.className = 'analytics-hbar-value';
      val.textContent = row.countLabel;

      wrap.appendChild(lab);
      wrap.appendChild(track);
      wrap.appendChild(val);
      container.appendChild(wrap);
    });
  }

  /**
   * @param {string} monthKey YYYY-MM
   * @param {Record<string,string>} [idOverrides] map logical keys → DOM id (see DEFAULT_ELEMENT_IDS)
   */
  function renderAnalyticsForMonth(monthKey, idOverrides) {
    if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return;
    const ids = Object.assign({}, DEFAULT_ELEMENT_IDS, idOverrides || {});
    renderMonthRevenuePanels(monthKey, ids);
    renderAverageDailyProgress(monthKey, ids);
    renderHorizontalBarChart(monthKey, ids);
  }

  global.renderAnalyticsForMonth = renderAnalyticsForMonth;
  global.ANALYTICS_RENDER_DEFAULT_IDS = DEFAULT_ELEMENT_IDS;
  global.MONTH_PAGE_ANALYTICS_IDS = MONTH_PAGE_ELEMENT_IDS;
  global.analyticsRenderDaysInMonthKey = daysInMonthKey;
})(window);
