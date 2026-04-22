const APRIL_TARGET = 10000;
const APRIL_REVENUE_KEY = 'aprilRevenueEntries';
/** April calendar page = April of the current year (revenueDate prefix). */
function getAprilPageMonthKey() {
  return `${new Date().getFullYear()}-04`;
}
let editingIndex = null;

function loadAprilEntries() {
  try {
    const entries = JSON.parse(localStorage.getItem(APRIL_REVENUE_KEY) || '[]');
    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    return [];
  }
}

function saveAprilEntries(entries) {
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

/** ISO date string for sorting (revenue calendar date, else logged-at day). */
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

function renderAprilPage() {
  const monthKey = getAprilPageMonthKey();
  const year = monthKey.slice(0, 4);
  const allEntries = loadAprilEntries();
  const entries = allEntries
    .map((entry, index) => ({ entry, index }))
    .filter(function (row) {
      return entryRevenueDateIso(row.entry).startsWith(monthKey);
    });
  const total = entries.reduce(function (sum, row) {
    return sum + Number(row.entry.amount || 0);
  }, 0);
  const percent = Math.min(100, Math.round((total / APRIL_TARGET) * 100));

  document.getElementById('aprilPercentLine').textContent = `${percent}%`;
  const monthEntryObjects = entries.map(function (row) {
    return row.entry;
  });
  if (typeof window.applyRevenueDualProgress === 'function') {
    window.applyRevenueDualProgress(
      'aprilProgressDual',
      'aprilProgressActual',
      'aprilProgressEstimated',
      monthEntryObjects,
      APRIL_TARGET
    );
  }
  const madeLabel = document.getElementById('aprilProgressMadeLabel');
  if (madeLabel) {
    madeLabel.textContent = formatCurrency(total);
  }
  let actualSum = 0;
  let combinedSum = 0;
  entries.forEach(function (row) {
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

  const list = document.getElementById('aprilEntriesList');
  list.innerHTML = '';

  if (entries.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'task-empty';
    empty.textContent = `No revenue logged for April ${year} yet.`;
    list.appendChild(empty);
    return;
  }

  entries.sort(function (a, b) {
    const dateCmp = entryRevenueDateIso(b.entry).localeCompare(entryRevenueDateIso(a.entry));
    if (dateCmp !== 0) return dateCmp;
    return entryCreatedTime(b.entry) - entryCreatedTime(a.entry);
  });

  entries.forEach(({ entry, index }) => {
    const li = document.createElement('li');
    li.className =
      entry.revenueKind === 'estimated' ? 'item-row item-row--estimated' : 'item-row';
    const sourceLabel = entry.source || entry.note || 'Unknown Source';
    const locationLabel = entry.location || 'No Location';
    li.innerHTML = `
      <span class="item-text">${formatEntryDate(entry)} | ${formatCurrency(Number(entry.amount || 0))} | ${sourceLabel} | ${locationLabel}</span>
      <div class="item-actions">
        <button class="edit-btn" data-index="${index}">✎</button>
        <button class="remove-btn" data-index="${index}">✕</button>
      </div>
    `;
    list.appendChild(li);
  });
}

function openEditModal(index) {
  const entries = loadAprilEntries();
  const entry = entries[index];
  if (!entry) return;

  editingIndex = index;
  document.getElementById('editAmountInput').value = Number(entry.amount || 0);
  const hiddenDate = document.getElementById('editRevenueDateInput');
  const displayDate = document.getElementById('editRevenueDateDisplay');
  hiddenDate.value =
    entry.revenueDate && /^\d{4}-\d{2}-\d{2}$/.test(entry.revenueDate)
      ? entry.revenueDate
      : isoToDateInputValue(entry.createdAt);
  if (window.CalendarPicker && displayDate) {
    window.CalendarPicker.syncDisplay(hiddenDate, displayDate);
  }
  document.getElementById('editLocationInput').value = entry.location || '';

  const sourceDd = document.getElementById('editRevenueSourceDropdown');
  const kindDd = document.getElementById('editRevenueKindDropdown');
  if (sourceDd) sourceDd.classList.remove('open');
  if (kindDd) kindDd.classList.remove('open');

  const rawSource = (entry.source || entry.note || '').trim();
  const sourceLabel = document.getElementById('editRevenueSourceLabel');
  const otherWrapper = document.getElementById('editRevenueOtherWrapper');
  const otherInput = document.getElementById('editRevenueOtherInput');
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
  window._editAprilSelectedSource = sel;
  if (sourceLabel) {
    sourceLabel.textContent = sel || 'Select revenue source';
  }

  const kindLabel = document.getElementById('editRevenueKindLabel');
  const editKind = entry.revenueKind === 'estimated' ? 'estimated' : 'actual';
  const kindOption = document.querySelector(
    '#editRevenueKindOptions .custom-dropdown-option[data-value="' + editKind + '"]'
  );
  if (kindLabel) {
    kindLabel.textContent = kindOption ? kindOption.textContent.trim() : 'Revenue Type';
  }
  window._editAprilRevenueKind = editKind;
  document.getElementById('aprilEditModalOverlay').classList.add('active');
}

function closeEditModal() {
  editingIndex = null;
  document.getElementById('aprilEditModalOverlay').classList.remove('active');
  const sourceDd = document.getElementById('editRevenueSourceDropdown');
  const kindDd = document.getElementById('editRevenueKindDropdown');
  if (sourceDd) sourceDd.classList.remove('open');
  if (kindDd) kindDd.classList.remove('open');
  if (window.CalendarPicker) {
    window.CalendarPicker.close();
  }
}

function saveEditedEntry() {
  if (editingIndex === null) return;

  const amount = Number(document.getElementById('editAmountInput').value);
  const revenueDate = document.getElementById('editRevenueDateInput').value;
  const otherInput = document.getElementById('editRevenueOtherInput');
  const otherText = otherInput ? otherInput.value.trim() : '';
  const srcPick = window._editAprilSelectedSource || '';
  const source = srcPick === 'Other' ? otherText : srcPick;
  const location = document.getElementById('editLocationInput').value.trim();

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

  const entries = loadAprilEntries();
  if (!entries[editingIndex]) return;

  const revenueKind = window._editAprilRevenueKind === 'estimated' ? 'estimated' : 'actual';

  const entriesBefore = entries.slice();
  entries[editingIndex] = {
    ...entries[editingIndex],
    amount,
    source,
    location,
    revenueDate,
    revenueKind
  };

  saveAprilEntries(entries);
  if (typeof window.notifyRevenueEntriesChanged === 'function') {
    window.notifyRevenueEntriesChanged(entriesBefore, entries);
  }
  closeEditModal();
  renderAprilPage();
  if (typeof window.renderDashboardRevenueLine === 'function') {
    window.renderDashboardRevenueLine();
  }
}

function deleteEntry(index) {
  const entries = loadAprilEntries();
  if (!entries[index]) return;

  const entriesBefore = entries.slice();
  entries.splice(index, 1);
  saveAprilEntries(entries);
  if (typeof window.notifyRevenueEntriesChanged === 'function') {
    window.notifyRevenueEntriesChanged(entriesBefore, entries);
  }
  renderAprilPage();
  if (typeof window.renderDashboardRevenueLine === 'function') {
    window.renderDashboardRevenueLine();
  }
}

document.getElementById('aprilEntriesList').addEventListener('click', function (event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const indexAttr = target.getAttribute('data-index');
  if (indexAttr === null) return;
  const index = Number(indexAttr);
  if (Number.isNaN(index)) return;

  if (target.classList.contains('edit-btn')) {
    openEditModal(index);
  } else if (target.classList.contains('remove-btn')) {
    deleteEntry(index);
  }
});

document.getElementById('saveEditEntryBtn').addEventListener('click', saveEditedEntry);
document.getElementById('cancelEditEntryBtn').addEventListener('click', closeEditModal);

function bindAprilEditRevenueDropdownDocumentClose() {
  if (window._aprilEditRevDdDocCloseBound) return;
  window._aprilEditRevDdDocCloseBound = true;
  document.addEventListener('click', function (event) {
    const t = event.target;
    const sourceDd = document.getElementById('editRevenueSourceDropdown');
    const kindDd = document.getElementById('editRevenueKindDropdown');
    if (sourceDd && !sourceDd.contains(t)) sourceDd.classList.remove('open');
    if (kindDd && !kindDd.contains(t)) kindDd.classList.remove('open');
  });
}

function handleAprilEditSourceChange() {
  const otherWrapper = document.getElementById('editRevenueOtherWrapper');
  const otherInput = document.getElementById('editRevenueOtherInput');
  if (!otherWrapper || !otherInput) return;
  if (window._editAprilSelectedSource === 'Other') {
    otherWrapper.classList.remove('hidden');
    otherInput.focus();
  } else {
    otherWrapper.classList.add('hidden');
    otherInput.value = '';
  }
}

function setupEditSourceDropdown() {
  const dropdown = document.getElementById('editRevenueSourceDropdown');
  const trigger = document.getElementById('editRevenueSourceTrigger');
  const label = document.getElementById('editRevenueSourceLabel');
  const options = document.getElementById('editRevenueSourceOptions');
  if (!dropdown || !trigger || !label || !options) return;

  if (window._editAprilSourceDropdownBound) return;
  window._editAprilSourceDropdownBound = true;

  trigger.addEventListener('click', function () {
    const kindDd = document.getElementById('editRevenueKindDropdown');
    if (kindDd) kindDd.classList.remove('open');
    dropdown.classList.toggle('open');
  });

  options.querySelectorAll('.custom-dropdown-option').forEach(function (optionBtn) {
    optionBtn.addEventListener('click', function () {
      window._editAprilSelectedSource = optionBtn.getAttribute('data-value') || '';
      label.textContent = optionBtn.textContent.trim() || 'Select revenue source';
      dropdown.classList.remove('open');
      handleAprilEditSourceChange();
    });
  });

  bindAprilEditRevenueDropdownDocumentClose();
}

function setupEditRevenueKindDropdown() {
  const dropdown = document.getElementById('editRevenueKindDropdown');
  const trigger = document.getElementById('editRevenueKindTrigger');
  const label = document.getElementById('editRevenueKindLabel');
  const options = document.getElementById('editRevenueKindOptions');
  if (!dropdown || !trigger || !label || !options) return;

  if (window._editAprilKindDropdownBound) return;
  window._editAprilKindDropdownBound = true;

  trigger.addEventListener('click', function () {
    const sourceDd = document.getElementById('editRevenueSourceDropdown');
    if (sourceDd) sourceDd.classList.remove('open');
    dropdown.classList.toggle('open');
  });

  options.querySelectorAll('.custom-dropdown-option').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const v = btn.getAttribute('data-value') || 'actual';
      window._editAprilRevenueKind = v;
      label.textContent = btn.textContent.trim() || 'Revenue Type';
      dropdown.classList.remove('open');
    });
  });

  bindAprilEditRevenueDropdownDocumentClose();
}

setupEditSourceDropdown();
setupEditRevenueKindDropdown();

window.refreshAprilMonthPage = renderAprilPage;

