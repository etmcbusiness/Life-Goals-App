const MONTH_PAGE_STORAGE_KEY = 'aprilRevenueEntries';
let monthSelectedSource = '';
let monthSelectedKind = 'actual';

function getMonthPageMonthKey() {
  const q = new URLSearchParams(location.search).get('month');
  if (q && /^\d{4}-\d{2}$/.test(q)) return q;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getTodayISODateLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function initMonthRevenueDateInput() {
  const hidden = document.getElementById('monthRevenueDateInput');
  const display = document.getElementById('monthRevenueDateDisplay');
  if (!hidden) return;
  const key = getMonthPageMonthKey();
  const today = getTodayISODateLocal();
  hidden.value = today.startsWith(key) ? today : `${key}-01`;
  if (window.CalendarPicker && display) {
    window.CalendarPicker.syncDisplay(hidden, display);
  }
}

function loadEntries() {
  try {
    const entries = JSON.parse(localStorage.getItem(MONTH_PAGE_STORAGE_KEY) || '[]');
    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(MONTH_PAGE_STORAGE_KEY, JSON.stringify(entries));
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

function bindMonthRevenueDropdownDocumentClose() {
  if (window._monthRevenueDropdownDocCloseBound) return;
  window._monthRevenueDropdownDocCloseBound = true;
  document.addEventListener('click', function (event) {
    const t = event.target;
    const sourceDd = document.getElementById('monthRevenueSourceDropdown');
    const kindDd = document.getElementById('monthRevenueKindDropdown');
    if (sourceDd && !sourceDd.contains(t)) sourceDd.classList.remove('open');
    if (kindDd && !kindDd.contains(t)) kindDd.classList.remove('open');
  });
}

function addMonthRevenue() {
  const amountInput = document.getElementById('monthRevenueInput');
  const dateInput = document.getElementById('monthRevenueDateInput');
  const sourceLabel = document.getElementById('monthRevenueSourceLabel');
  const kindLabel = document.getElementById('monthRevenueKindLabel');
  const otherWrapper = document.getElementById('monthRevenueOtherWrapper');
  const otherInput = document.getElementById('monthRevenueOtherInput');
  const locationInput = document.getElementById('monthRevenueLocationInput');

  const amount = Number(amountInput.value);
  const revenueDate = dateInput ? dateInput.value : '';
  const otherSource = otherInput.value.trim();
  const location = locationInput.value.trim();
  const source = monthSelectedSource === 'Other' ? otherSource : monthSelectedSource;

  if (!Number.isFinite(amount) || amount <= 0 || monthSelectedSource.length === 0) {
    return;
  }
  if (!revenueDate) {
    return;
  }

  if (monthSelectedSource === 'Other' && otherSource.length === 0) {
    return;
  }
  if (location.length === 0) {
    return;
  }

  const entries = loadEntries();
  const entriesBefore = entries.slice();
  entries.push({
    amount,
    source,
    location,
    revenueDate,
    revenueKind: monthSelectedKind,
    createdAt: new Date().toISOString()
  });

  saveEntries(entries);
  if (typeof window.notifyRevenueEntriesChanged === 'function') {
    window.notifyRevenueEntriesChanged(entriesBefore, entries);
  }
  if (typeof window.refreshMonthPage === 'function') {
    window.refreshMonthPage();
  }
  if (typeof window.renderSideMenuMonths === 'function') {
    window.renderSideMenuMonths();
  }
  if (typeof window.renderDashboardRevenueLine === 'function') {
    window.renderDashboardRevenueLine();
  }

  amountInput.value = '';
  if (dateInput) {
    initMonthRevenueDateInput();
  }
  monthSelectedSource = '';
  monthSelectedKind = 'actual';
  sourceLabel.textContent = 'Select revenue source';
  if (kindLabel) kindLabel.textContent = 'Revenue Type';
  otherInput.value = '';
  locationInput.value = '';
  otherWrapper.classList.add('hidden');
}

function handleMonthSourceChange() {
  const otherWrapper = document.getElementById('monthRevenueOtherWrapper');
  const otherInput = document.getElementById('monthRevenueOtherInput');

  if (monthSelectedSource === 'Other') {
    otherWrapper.classList.remove('hidden');
    otherInput.focus();
  } else {
    otherWrapper.classList.add('hidden');
    otherInput.value = '';
  }
}

function setupMonthSourceDropdown() {
  const dropdown = document.getElementById('monthRevenueSourceDropdown');
  const trigger = document.getElementById('monthRevenueSourceTrigger');
  const label = document.getElementById('monthRevenueSourceLabel');
  const options = document.getElementById('monthRevenueSourceOptions');
  if (!dropdown || !trigger || !label || !options) return;

  trigger.addEventListener('click', function () {
    const kindDd = document.getElementById('monthRevenueKindDropdown');
    if (kindDd) kindDd.classList.remove('open');
    dropdown.classList.toggle('open');
  });

  options.querySelectorAll('.custom-dropdown-option').forEach(function (optionBtn) {
    optionBtn.addEventListener('click', function () {
      monthSelectedSource = optionBtn.getAttribute('data-value') || '';
      label.textContent = monthSelectedSource || 'Select revenue source';
      dropdown.classList.remove('open');
      handleMonthSourceChange();
    });
  });

  bindMonthRevenueDropdownDocumentClose();
}

function setupMonthRevenueKindDropdown() {
  const dropdown = document.getElementById('monthRevenueKindDropdown');
  const trigger = document.getElementById('monthRevenueKindTrigger');
  const label = document.getElementById('monthRevenueKindLabel');
  const options = document.getElementById('monthRevenueKindOptions');
  if (!dropdown || !trigger || !label || !options) return;

  trigger.addEventListener('click', function () {
    const sourceDd = document.getElementById('monthRevenueSourceDropdown');
    if (sourceDd) sourceDd.classList.remove('open');
    dropdown.classList.toggle('open');
  });

  options.querySelectorAll('.custom-dropdown-option').forEach(function (optionBtn) {
    optionBtn.addEventListener('click', function () {
      monthSelectedKind = optionBtn.getAttribute('data-value') || 'actual';
      label.textContent = optionBtn.textContent.trim() || 'Revenue Type';
      dropdown.classList.remove('open');
    });
  });

  bindMonthRevenueDropdownDocumentClose();
}

window.applyRevenueDualProgress = applyDualProgress;

const monthEnterBtn = document.getElementById('monthRevenueEnterBtn');
if (monthEnterBtn) {
  monthEnterBtn.addEventListener('click', addMonthRevenue);
}
const monthRevenueInput = document.getElementById('monthRevenueInput');
if (monthRevenueInput) {
  monthRevenueInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') addMonthRevenue();
  });
}
const monthOtherInput = document.getElementById('monthRevenueOtherInput');
if (monthOtherInput) {
  monthOtherInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') addMonthRevenue();
  });
}
const monthLocationInput = document.getElementById('monthRevenueLocationInput');
if (monthLocationInput) {
  monthLocationInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') addMonthRevenue();
  });
}

setupMonthSourceDropdown();
setupMonthRevenueKindDropdown();
initMonthRevenueDateInput();
if (window.CalendarPicker) {
  window.CalendarPicker.init();
}
if (typeof window.refreshMonthPage === 'function') {
  window.refreshMonthPage();
}
