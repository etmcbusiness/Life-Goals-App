const MONTH_TARGET = 10000;
const APRIL_REVENUE_KEY = 'aprilRevenueEntries';

function getMonthPageMonthKey() {
  const q = new URLSearchParams(location.search).get('month');
  if (q && /^\d{4}-\d{2}$/.test(q)) return q;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthKeyNeighbors(key) {
  const [y, m] = key.split('-').map(Number);
  const prevD = new Date(y, m - 1, 1);
  prevD.setMonth(prevD.getMonth() - 1);
  const prev = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;
  const nextD = new Date(y, m - 1, 1);
  nextD.setMonth(nextD.getMonth() + 1);
  const next = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}`;
  return { prev, next };
}

function formatMonthHeading(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
}

let editingIndex = null;

function loadAllEntries() {
  try {
    const entries = JSON.parse(localStorage.getItem(APRIL_REVENUE_KEY) || '[]');
    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    return [];
  }
}

function saveAllEntries(entries) {
  localStorage.setItem(APRIL_REVENUE_KEY, JSON.stringify(entries));
}

function formatCurrency(value) {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  });
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function isoToDateInputValue(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatEntryDate(entry) {
  if (entry.revenueDate && /^\d{4}-\d{2}-\d{2}$/.test(entry.revenueDate)) {
    const [y, m, d] = entry.revenueDate.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  return formatDate(entry.createdAt);
}

function entryRevenueDateIso(entry) {
  if (entry.revenueDate && /^\d{4}-\d{2}-\d{2}$/.test(entry.revenueDate)) {
    return entry.revenueDate;
  }
  const fallback = isoToDateInputValue(entry.createdAt);
  return fallback && /^\d{4}-\d{2}-\d{2}$/.test(fallback) ? fallback : '0000-00-00';
}

function entryCreatedTime(entry) {
  const t = entry.createdAt ? new Date(entry.createdAt).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

function renderMonthPage() {
  const monthKey = getMonthPageMonthKey();
  const heading = formatMonthHeading(monthKey);
  const titleEl = document.getElementById('monthPageTitle');
  if (titleEl) {
    titleEl.textContent = heading;
  }
  const stepEl = document.getElementById('monthPageStepLabel');
  if (stepEl) {
    const [y, m] = monthKey.split('-').map(Number);
    const monthLong = new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long' });
    stepEl.textContent = `${monthLong} Revenue Progress`;
  }
  const { prev, next } = monthKeyNeighbors(monthKey);
  const prevLink = document.getElementById('monthNavPrev');
  const nextLink = document.getElementById('monthNavNext');
  if (prevLink) prevLink.href = `month.html?month=${prev}`;
  if (nextLink) nextLink.href = `month.html?month=${next}`;

  const analyticsTitle = document.getElementById('monthPageAnalyticsMonthLabel');
  if (analyticsTitle) {
    analyticsTitle.textContent = `ANALYTICS · ${heading}`;
  }
  if (typeof window.renderAnalyticsForMonth === 'function' && window.MONTH_PAGE_ANALYTICS_IDS) {
    window.renderAnalyticsForMonth(monthKey, window.MONTH_PAGE_ANALYTICS_IDS);
  }

  const allEntries = loadAllEntries();
  const rows = allEntries
    .map(function (entry, index) {
      return { entry, index };
    })
    .filter(function (row) {
      return entryRevenueDateIso(row.entry).startsWith(monthKey);
    });

  const total = rows.reduce(function (sum, row) {
    return sum + Number(row.entry.amount || 0);
  }, 0);
  const percent = Math.min(100, Math.round((total / MONTH_TARGET) * 100));

  const totalLine = document.getElementById('monthTotalLine');
  if (totalLine) {
    const [y, m] = monthKey.split('-').map(Number);
    const label = new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    totalLine.textContent = `Total for ${label}: ${formatCurrency(total)}`;
  }
  const pctLine = document.getElementById('monthPercentLine');
  if (pctLine) {
    pctLine.textContent = `${percent}%`;
  }
  const monthEntryObjects = rows.map(function (row) {
    return row.entry;
  });
  if (typeof window.applyRevenueDualProgress === 'function') {
    window.applyRevenueDualProgress(
      'monthProgressDual',
      'monthProgressActual',
      'monthProgressEstimated',
      monthEntryObjects,
      MONTH_TARGET
    );
  }
  const madeLabel = document.getElementById('monthProgressMadeLabel');
  if (madeLabel) {
    madeLabel.textContent = formatCurrency(total);
  }

  let actualSum = 0;
  let combinedSum = 0;
  rows.forEach(function (row) {
    const amt = Number(row.entry.amount || 0);
    if (!Number.isFinite(amt)) return;
    combinedSum += amt;
    if (row.entry.revenueKind !== 'estimated') {
      actualSum += amt;
    }
  });
  const lineActual = document.getElementById('revenueLineTotalActual');
  const lineCombined = document.getElementById('revenueLineTotalCombined');
  if (lineActual) {
    lineActual.textContent = `Actual revenue this month: ${formatCurrency(actualSum)}`;
  }
  if (lineCombined) {
    lineCombined.textContent = `Actual + estimated this month: ${formatCurrency(combinedSum)}`;
  }

  if (typeof window.renderSideMenuMonths === 'function') {
    window.renderSideMenuMonths();
  }

  const list = document.getElementById('monthEntriesList');
  list.innerHTML = '';

  if (rows.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'task-empty';
    empty.textContent = `No revenue logged for ${heading} yet.`;
    list.appendChild(empty);
    return;
  }

  rows.sort(function (a, b) {
    const dateCmp = entryRevenueDateIso(b.entry).localeCompare(entryRevenueDateIso(a.entry));
    if (dateCmp !== 0) return dateCmp;
    return entryCreatedTime(b.entry) - entryCreatedTime(a.entry);
  });

  rows.forEach(function ({ entry, index }) {
    const li = document.createElement('li');
    li.className =
      entry.revenueKind === 'estimated' ? 'item-row item-row--estimated' : 'item-row';
    const sourceLabel = entry.source || entry.note || 'Unknown Source';
    const locationLabel = entry.location || 'No Location';
    li.innerHTML =
      '<span class="item-text">' +
      formatEntryDate(entry) +
      ' | ' +
      formatCurrency(Number(entry.amount || 0)) +
      ' | ' +
      sourceLabel +
      ' | ' +
      locationLabel +
      '</span>' +
      '<div class="item-actions">' +
      '<button class="edit-btn" data-index="' +
      index +
      '">✎</button>' +
      '<button class="remove-btn" data-index="' +
      index +
      '">✕</button>' +
      '</div>';
    list.appendChild(li);
  });
}

function openMonthEditModal(index) {
  const entries = loadAllEntries();
  const entry = entries[index];
  if (!entry) return;

  editingIndex = index;
  document.getElementById('monthEditAmountInput').value = Number(entry.amount || 0);
  const hiddenDate = document.getElementById('monthEditRevenueDateInput');
  const displayDate = document.getElementById('monthEditRevenueDateDisplay');
  hiddenDate.value =
    entry.revenueDate && /^\d{4}-\d{2}-\d{2}$/.test(entry.revenueDate)
      ? entry.revenueDate
      : isoToDateInputValue(entry.createdAt);
  if (window.CalendarPicker && displayDate) {
    window.CalendarPicker.syncDisplay(hiddenDate, displayDate);
  }
  document.getElementById('monthEditLocationInput').value = entry.location || '';

  const sourceDd = document.getElementById('monthEditRevenueSourceDropdown');
  const kindDd = document.getElementById('monthEditRevenueKindDropdown');
  if (sourceDd) sourceDd.classList.remove('open');
  if (kindDd) kindDd.classList.remove('open');

  const rawSource = (entry.source || entry.note || '').trim();
  const sourceLabel = document.getElementById('monthEditRevenueSourceLabel');
  const otherWrapper = document.getElementById('monthEditRevenueOtherWrapper');
  const otherInput = document.getElementById('monthEditRevenueOtherInput');
  let sel = '';
  if (rawSource === 'Janitorial Cleaning' || rawSource === 'Window Cleaning') {
    sel = rawSource;
    if (otherWrapper) otherWrapper.classList.add('hidden');
    if (otherInput) otherInput.value = '';
  } else {
    sel = 'Other';
    if (otherWrapper) otherWrapper.classList.remove('hidden');
    if (otherInput) otherInput.value = rawSource;
  }
  window._editMonthSelectedSource = sel;
  if (sourceLabel) {
    sourceLabel.textContent = sel || 'Select revenue source';
  }

  const kindLabel = document.getElementById('monthEditRevenueKindLabel');
  const editKind = entry.revenueKind === 'estimated' ? 'estimated' : 'actual';
  const kindOption = document.querySelector(
    '#monthEditRevenueKindOptions .custom-dropdown-option[data-value="' + editKind + '"]'
  );
  if (kindLabel) {
    kindLabel.textContent = kindOption ? kindOption.textContent.trim() : 'Revenue Type';
  }
  window._editMonthRevenueKind = editKind;
  document.getElementById('monthEditModalOverlay').classList.add('active');
}

function closeMonthEditModal() {
  editingIndex = null;
  document.getElementById('monthEditModalOverlay').classList.remove('active');
  const sourceDd = document.getElementById('monthEditRevenueSourceDropdown');
  const kindDd = document.getElementById('monthEditRevenueKindDropdown');
  if (sourceDd) sourceDd.classList.remove('open');
  if (kindDd) kindDd.classList.remove('open');
  if (window.CalendarPicker) {
    window.CalendarPicker.close();
  }
}

function saveMonthEditedEntry() {
  if (editingIndex === null) return;

  const amount = Number(document.getElementById('monthEditAmountInput').value);
  const revenueDate = document.getElementById('monthEditRevenueDateInput').value;
  const otherInput = document.getElementById('monthEditRevenueOtherInput');
  const otherText = otherInput ? otherInput.value.trim() : '';
  const srcPick = window._editMonthSelectedSource || '';
  const source = srcPick === 'Other' ? otherText : srcPick;
  const location = document.getElementById('monthEditLocationInput').value.trim();

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !revenueDate ||
    !srcPick ||
    source.length === 0 ||
    location.length === 0
  ) {
    return;
  }
  if (srcPick === 'Other' && otherText.length === 0) {
    return;
  }

  const entries = loadAllEntries();
  if (!entries[editingIndex]) return;

  const revenueKind = window._editMonthRevenueKind === 'estimated' ? 'estimated' : 'actual';

  const entriesBefore = entries.slice();
  entries[editingIndex] = {
    ...entries[editingIndex],
    amount,
    source,
    location,
    revenueDate,
    revenueKind
  };

  saveAllEntries(entries);
  if (typeof window.notifyRevenueEntriesChanged === 'function') {
    window.notifyRevenueEntriesChanged(entriesBefore, entries);
  }
  closeMonthEditModal();
  renderMonthPage();
  if (typeof window.renderDashboardRevenueLine === 'function') {
    window.renderDashboardRevenueLine();
  }
}

function deleteMonthEntry(index) {
  const entries = loadAllEntries();
  if (!entries[index]) return;

  const entriesBefore = entries.slice();
  entries.splice(index, 1);
  saveAllEntries(entries);
  if (typeof window.notifyRevenueEntriesChanged === 'function') {
    window.notifyRevenueEntriesChanged(entriesBefore, entries);
  }
  renderMonthPage();
  if (typeof window.renderDashboardRevenueLine === 'function') {
    window.renderDashboardRevenueLine();
  }
}

document.getElementById('monthEntriesList').addEventListener('click', function (event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const indexAttr = target.getAttribute('data-index');
  if (indexAttr === null) return;
  const index = Number(indexAttr);
  if (Number.isNaN(index)) return;

  if (target.classList.contains('edit-btn')) {
    openMonthEditModal(index);
  } else if (target.classList.contains('remove-btn')) {
    deleteMonthEntry(index);
  }
});

document.getElementById('saveMonthEditEntryBtn').addEventListener('click', saveMonthEditedEntry);
document.getElementById('cancelMonthEditEntryBtn').addEventListener('click', closeMonthEditModal);

function bindMonthEditRevenueDropdownDocumentClose() {
  if (window._monthEditRevDdDocCloseBound) return;
  window._monthEditRevDdDocCloseBound = true;
  document.addEventListener('click', function (event) {
    const t = event.target;
    const sourceDd = document.getElementById('monthEditRevenueSourceDropdown');
    const kindDd = document.getElementById('monthEditRevenueKindDropdown');
    if (sourceDd && !sourceDd.contains(t)) sourceDd.classList.remove('open');
    if (kindDd && !kindDd.contains(t)) kindDd.classList.remove('open');
  });
}

function handleMonthEditSourceChange() {
  const otherWrapper = document.getElementById('monthEditRevenueOtherWrapper');
  const otherInput = document.getElementById('monthEditRevenueOtherInput');
  if (!otherWrapper || !otherInput) return;
  if (window._editMonthSelectedSource === 'Other') {
    otherWrapper.classList.remove('hidden');
    otherInput.focus();
  } else {
    otherWrapper.classList.add('hidden');
    otherInput.value = '';
  }
}

function setupMonthEditSourceDropdown() {
  const dropdown = document.getElementById('monthEditRevenueSourceDropdown');
  const trigger = document.getElementById('monthEditRevenueSourceTrigger');
  const label = document.getElementById('monthEditRevenueSourceLabel');
  const options = document.getElementById('monthEditRevenueSourceOptions');
  if (!dropdown || !trigger || !label || !options) return;

  if (window._monthEditSourceDropdownBound) return;
  window._monthEditSourceDropdownBound = true;

  trigger.addEventListener('click', function () {
    const kindDd = document.getElementById('monthEditRevenueKindDropdown');
    if (kindDd) kindDd.classList.remove('open');
    dropdown.classList.toggle('open');
  });

  options.querySelectorAll('.custom-dropdown-option').forEach(function (optionBtn) {
    optionBtn.addEventListener('click', function () {
      window._editMonthSelectedSource = optionBtn.getAttribute('data-value') || '';
      label.textContent = optionBtn.textContent.trim() || 'Select revenue source';
      dropdown.classList.remove('open');
      handleMonthEditSourceChange();
    });
  });

  bindMonthEditRevenueDropdownDocumentClose();
}

function setupMonthEditRevenueKindDropdown() {
  const dropdown = document.getElementById('monthEditRevenueKindDropdown');
  const trigger = document.getElementById('monthEditRevenueKindTrigger');
  const label = document.getElementById('monthEditRevenueKindLabel');
  const options = document.getElementById('monthEditRevenueKindOptions');
  if (!dropdown || !trigger || !label || !options) return;

  if (window._monthEditKindDropdownBound) return;
  window._monthEditKindDropdownBound = true;

  trigger.addEventListener('click', function () {
    const sourceDd = document.getElementById('monthEditRevenueSourceDropdown');
    if (sourceDd) sourceDd.classList.remove('open');
    dropdown.classList.toggle('open');
  });

  options.querySelectorAll('.custom-dropdown-option').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const v = btn.getAttribute('data-value') || 'actual';
      window._editMonthRevenueKind = v;
      label.textContent = btn.textContent.trim() || 'Revenue Type';
      dropdown.classList.remove('open');
    });
  });

  bindMonthEditRevenueDropdownDocumentClose();
}

setupMonthEditSourceDropdown();
setupMonthEditRevenueKindDropdown();

window.addEventListener('storage', function (e) {
  if (e.key === APRIL_REVENUE_KEY) {
    renderMonthPage();
    return;
  }
  if (window.DailyHabits && e.key === window.DailyHabits.STORAGE_KEY) {
    renderMonthPage();
  }
});

window.refreshMonthPage = renderMonthPage;
