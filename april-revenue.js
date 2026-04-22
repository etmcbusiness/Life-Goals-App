const REVENUE_ENTRIES_STORAGE_KEY = 'aprilRevenueEntries';
const REVENUE_GOAL = 10000;
let selectedSource = '';
let selectedRevenueKind = 'actual';

function getTodayISODateLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function initRevenueDateInput() {
  const hidden = document.getElementById('aprilRevenueDateInput');
  const display = document.getElementById('aprilRevenueDateDisplay');
  if (hidden) {
    const onAprilPage = Boolean(document.getElementById('aprilEntriesList'));
    if (onAprilPage) {
      const aprilKey = `${new Date().getFullYear()}-04`;
      const today = getTodayISODateLocal();
      hidden.value = today.startsWith(aprilKey) ? today : `${aprilKey}-01`;
    } else {
      hidden.value = getTodayISODateLocal();
    }
  }
  if (window.CalendarPicker && hidden && display) {
    window.CalendarPicker.syncDisplay(hidden, display);
  }
}

function loadAprilRevenueEntries() {
  try {
    const entries = JSON.parse(localStorage.getItem(REVENUE_ENTRIES_STORAGE_KEY) || '[]');
    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    return [];
  }
}

function saveAprilRevenueEntries(entries) {
  localStorage.setItem(REVENUE_ENTRIES_STORAGE_KEY, JSON.stringify(entries));
}

function getCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Month key YYYY-MM from revenueDate, else from createdAt (same idea as side menu). */
function entryMonthKeyForFilter(entry) {
  if (entry.revenueDate && /^\d{4}-\d{2}-\d{2}$/.test(entry.revenueDate)) {
    return entry.revenueDate.slice(0, 7);
  }
  const c = entry.createdAt ? new Date(entry.createdAt) : null;
  if (!c || Number.isNaN(c.getTime())) return '';
  return `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}`;
}

function entryBelongsToMonthKey(entry, monthKey) {
  return entryMonthKeyForFilter(entry) === monthKey;
}

function updateMonthCountdown() {
  const el = document.getElementById('monthDaysCountdown');
  if (!el) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const daysLeft = lastDay - day;
  const monthName = now.toLocaleString('en-US', { month: 'long' });

  if (daysLeft === 0) {
    el.innerHTML = `Last day of <strong>${monthName}</strong>`;
  } else if (daysLeft === 1) {
    el.innerHTML = `<strong>1</strong> day left in <strong>${monthName}</strong>`;
  } else {
    el.innerHTML = `<strong>${daysLeft}</strong> days left in <strong>${monthName}</strong>`;
  }
}

function entryIsEstimated(entry) {
  return entry && entry.revenueKind === 'estimated';
}

function sumActualEstimated(entries) {
  let actual = 0;
  let estimated = 0;
  entries.forEach(function (entry) {
    const amt = Number(entry.amount || 0);
    if (!Number.isFinite(amt)) return;
    if (entryIsEstimated(entry)) {
      estimated += amt;
    } else {
      actual += amt;
    }
  });
  return { actual, estimated };
}

function formatCurrency(value) {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  });
}

function applyDualProgress(dualId, actualSegId, estimatedSegId, entries, target) {
  const dual = document.getElementById(dualId);
  const actualEl = document.getElementById(actualSegId);
  const estEl = document.getElementById(estimatedSegId);
  if (!dual || !actualEl || !estEl) return;

  const sums = sumActualEstimated(entries);
  const total = sums.actual + sums.estimated;
  const pct = Math.min(100, (total / target) * 100);
  dual.style.width = `${pct}%`;

  if (total <= 0) {
    actualEl.style.flex = '1';
    estEl.style.flex = '0';
    return;
  }
  const a = Math.max(sums.actual, 0.0001);
  const e = Math.max(sums.estimated, 0.0001);
  actualEl.style.flex = String(a);
  estEl.style.flex = String(e);
}

function renderAprilRevenue(entries) {
  const allEntries = entries || loadAprilRevenueEntries();
  const dashboardScope = document.getElementById('headerRevenueProgressDual');
  const monthKey = getCurrentMonthKey();
  const list = dashboardScope
    ? allEntries.filter(function (e) {
        return entryBelongsToMonthKey(e, monthKey);
      })
    : allEntries;

  const sums = sumActualEstimated(list);
  const total = sums.actual + sums.estimated;
  const percent = Math.min(100, Math.round((total / REVENUE_GOAL) * 100));

  if (dashboardScope) {
    const lineActual = document.getElementById('revenueLineTotalActual');
    const lineCombined = document.getElementById('revenueLineTotalCombined');
    if (lineActual) {
      lineActual.textContent = `Actual revenue this month: ${formatCurrency(sums.actual)}`;
    }
    if (lineCombined) {
      lineCombined.textContent = `Actual + estimated this month: ${formatCurrency(total)}`;
    }

    applyDualProgress(
      'headerRevenueProgressDual',
      'headerRevenueProgressActual',
      'headerRevenueProgressEstimated',
      list,
      REVENUE_GOAL
    );

    const headerFillLegacy = document.getElementById('headerRevenueProgressFill');
    if (headerFillLegacy) {
      headerFillLegacy.style.width = `${percent}%`;
    }

    const headerMade = document.getElementById('headerRevenueMadeLabel');
    if (headerMade) {
      headerMade.textContent = formatCurrency(total);
    }

    updateMonthCountdown();
  }
}

function bindRevenueDropdownDocumentClose() {
  if (window._aprilRevenueDropdownDocCloseBound) return;
  window._aprilRevenueDropdownDocCloseBound = true;
  document.addEventListener('click', function (event) {
    const t = event.target;
    const sourceDd = document.getElementById('aprilRevenueSourceDropdown');
    const kindDd = document.getElementById('aprilRevenueKindDropdown');
    if (sourceDd && !sourceDd.contains(t)) sourceDd.classList.remove('open');
    if (kindDd && !kindDd.contains(t)) kindDd.classList.remove('open');
  });
}

function addAprilRevenue() {
  const amountInput = document.getElementById('aprilRevenueInput');
  const dateInput = document.getElementById('aprilRevenueDateInput');
  const sourceLabel = document.getElementById('aprilRevenueSourceLabel');
  const kindLabel = document.getElementById('aprilRevenueKindLabel');
  const otherWrapper = document.getElementById('aprilRevenueOtherWrapper');
  const otherInput = document.getElementById('aprilRevenueOtherInput');
  const locationInput = document.getElementById('aprilRevenueLocationInput');

  const amount = Number(amountInput.value);
  const revenueDate = dateInput ? dateInput.value : '';
  const otherSource = otherInput.value.trim();
  const location = locationInput.value.trim();
  const source = selectedSource === 'Other' ? otherSource : selectedSource;

  if (!Number.isFinite(amount) || amount <= 0 || selectedSource.length === 0) {
    return;
  }
  if (!revenueDate) {
    return;
  }

  if (selectedSource === 'Other' && otherSource.length === 0) {
    return;
  }
  if (location.length === 0) {
    return;
  }

  const entries = loadAprilRevenueEntries();
  const entriesBefore = entries.slice();
  entries.push({
    amount,
    source,
    location,
    revenueDate,
    revenueKind: selectedRevenueKind,
    createdAt: new Date().toISOString()
  });

  saveAprilRevenueEntries(entries);
  if (typeof window.notifyRevenueEntriesChanged === 'function') {
    window.notifyRevenueEntriesChanged(entriesBefore, entries);
  }
  if (typeof window.refreshAprilMonthPage === 'function') {
    window.refreshAprilMonthPage();
  } else {
    renderAprilRevenue(entries);
  }
  if (typeof window.renderSideMenuMonths === 'function') {
    window.renderSideMenuMonths();
  }
  if (typeof window.renderDashboardRevenueLine === 'function') {
    window.renderDashboardRevenueLine();
  }

  amountInput.value = '';
  if (dateInput) {
    if (typeof window.refreshAprilMonthPage === 'function') {
      initRevenueDateInput();
    } else {
      dateInput.value = getTodayISODateLocal();
      if (window.CalendarPicker) {
        const display = document.getElementById('aprilRevenueDateDisplay');
        if (display) window.CalendarPicker.syncDisplay(dateInput, display);
      }
    }
  }
  selectedSource = '';
  selectedRevenueKind = 'actual';
  sourceLabel.textContent = 'Select revenue source';
  if (kindLabel) kindLabel.textContent = 'Revenue Type';
  otherInput.value = '';
  locationInput.value = '';
  otherWrapper.classList.add('hidden');

  if (typeof window.dashboardMoneyAfterSave === 'function') {
    window.dashboardMoneyAfterSave();
  }
}

function handleSourceChange() {
  const otherWrapper = document.getElementById('aprilRevenueOtherWrapper');
  const otherInput = document.getElementById('aprilRevenueOtherInput');

  if (selectedSource === 'Other') {
    otherWrapper.classList.remove('hidden');
    otherInput.focus();
  } else {
    otherWrapper.classList.add('hidden');
    otherInput.value = '';
  }
}

function setupSourceDropdown() {
  const dropdown = document.getElementById('aprilRevenueSourceDropdown');
  const trigger = document.getElementById('aprilRevenueSourceTrigger');
  const label = document.getElementById('aprilRevenueSourceLabel');
  const options = document.getElementById('aprilRevenueSourceOptions');
  if (!dropdown || !trigger || !label || !options) return;

  trigger.addEventListener('click', function () {
    const kindDd = document.getElementById('aprilRevenueKindDropdown');
    if (kindDd) kindDd.classList.remove('open');
    dropdown.classList.toggle('open');
  });

  options.querySelectorAll('.custom-dropdown-option').forEach(function (optionBtn) {
    optionBtn.addEventListener('click', function () {
      selectedSource = optionBtn.getAttribute('data-value') || '';
      label.textContent = selectedSource || 'Select revenue source';
      dropdown.classList.remove('open');
      handleSourceChange();
    });
  });

  bindRevenueDropdownDocumentClose();
}

function setupRevenueKindDropdown() {
  const dropdown = document.getElementById('aprilRevenueKindDropdown');
  const trigger = document.getElementById('aprilRevenueKindTrigger');
  const label = document.getElementById('aprilRevenueKindLabel');
  const options = document.getElementById('aprilRevenueKindOptions');
  if (!dropdown || !trigger || !label || !options) return;

  trigger.addEventListener('click', function () {
    const sourceDd = document.getElementById('aprilRevenueSourceDropdown');
    if (sourceDd) sourceDd.classList.remove('open');
    dropdown.classList.toggle('open');
  });

  options.querySelectorAll('.custom-dropdown-option').forEach(function (optionBtn) {
    optionBtn.addEventListener('click', function () {
      selectedRevenueKind = optionBtn.getAttribute('data-value') || 'actual';
      label.textContent = optionBtn.textContent.trim() || 'Revenue Type';
      dropdown.classList.remove('open');
    });
  });

  bindRevenueDropdownDocumentClose();
}

const enterBtn = document.getElementById('aprilRevenueEnterBtn');
if (enterBtn) {
  enterBtn.addEventListener('click', addAprilRevenue);
}
const revenueInput = document.getElementById('aprilRevenueInput');
if (revenueInput) {
  revenueInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') addAprilRevenue();
  });
}
const otherInputEl = document.getElementById('aprilRevenueOtherInput');
if (otherInputEl) {
  otherInputEl.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') addAprilRevenue();
  });
}
const locationInputEl = document.getElementById('aprilRevenueLocationInput');
if (locationInputEl) {
  locationInputEl.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') addAprilRevenue();
  });
}

if (document.getElementById('aprilRevenueSourceDropdown')) {
  setupSourceDropdown();
}
setupRevenueKindDropdown();
initRevenueDateInput();
if (window.CalendarPicker) {
  window.CalendarPicker.init();
}
window.applyRevenueDualProgress = applyDualProgress;
window.sumActualEstimatedForEntries = sumActualEstimated;
window.entryIsEstimatedRevenue = entryIsEstimated;
window.renderDashboardRevenueLine = function () {
  renderAprilRevenue(loadAprilRevenueEntries());
};

if (typeof window.refreshAprilMonthPage === 'function') {
  window.refreshAprilMonthPage();
} else {
  renderAprilRevenue(loadAprilRevenueEntries());
}

(function startMonthCountdownTicker() {
  if (window._monthCountdownTickerStarted) return;
  if (!document.getElementById('monthDaysCountdown')) return;
  window._monthCountdownTickerStarted = true;
  updateMonthCountdown();
  setInterval(updateMonthCountdown, 60000);
})();

function updateDashboardHabitStreaks() {
  if (!window.DailyHabits || typeof window.DailyHabits.getCurrentStreak !== 'function') return;
  const streakPairs = [
    ['dashboardStreakEmails', 'emails'],
    ['dashboardStreakDms', 'dms'],
    ['dashboardStreakVideos', 'videos'],
    ['dashboardStreakPnl', 'pnl']
  ];
  streakPairs.forEach(function (pair) {
    const el = document.getElementById(pair[0]);
    if (!el) return;
    const n = window.DailyHabits.getCurrentStreak(pair[1]);
    el.textContent = String(n);
    el.setAttribute(
      'title',
      n === 0
        ? 'No streak yet — complete consecutive days'
        : n === 1
          ? '1-day streak'
          : n + '-day streak'
    );
    el.setAttribute('aria-label', n === 0 ? 'No streak' : n === 1 ? '1 day streak' : n + ' day streak');
  });
}

function applyDashboardOutreachFromStore() {
  if (!window.DailyHabits) return;
  if (!document.getElementById('dashboardChecklist')) return;

  const pairs = [
    ['dashboardCheckEmails', 'emails'],
    ['dashboardCheckDms', 'dms'],
    ['dashboardCheckVideos', 'videos'],
    ['dashboardCheckPnl', 'pnl']
  ];
  const today = window.DailyHabits.localDateKey(new Date());
  const day = window.DailyHabits.getDay(today);
  pairs.forEach(function (pair) {
    const el = document.getElementById(pair[0]);
    if (!el) return;
    el.checked = !!day[pair[1]];
  });
  updateDashboardHabitStreaks();
}

function initDashboardOutreachChecklist() {
  if (!document.getElementById('dashboardChecklist')) return;
  if (!window.DailyHabits) return;

  const pairs = [
    ['dashboardCheckEmails', 'emails'],
    ['dashboardCheckDms', 'dms'],
    ['dashboardCheckVideos', 'videos'],
    ['dashboardCheckPnl', 'pnl']
  ];
  let today = window.DailyHabits.localDateKey(new Date());

  pairs.forEach(function (pair) {
    const el = document.getElementById(pair[0]);
    if (!el || el.dataset.habitBound === '1') return;
    el.dataset.habitBound = '1';
    el.addEventListener('change', function () {
      const dateKey = window.DailyHabits.localDateKey(new Date());
      window.DailyHabits.setHabit(dateKey, pair[1], el.checked);
      updateDashboardHabitStreaks();
    });
  });

  applyDashboardOutreachFromStore();

  window.addEventListener('pageshow', function () {
    applyDashboardOutreachFromStore();
  });

  setInterval(function () {
    const tk = window.DailyHabits.localDateKey(new Date());
    if (tk !== today) {
      today = tk;
      applyDashboardOutreachFromStore();
    }
  }, 60000);

  window.addEventListener('storage', function (e) {
    if (e.key === window.DailyHabits.STORAGE_KEY) applyDashboardOutreachFromStore();
  });
}

initDashboardOutreachChecklist();
