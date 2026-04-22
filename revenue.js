const RevenueTracker = (function () {
  const MONTHLY_TARGET = 10000;
  const STORAGE_KEY = 'incomeTrackerData';

  function getCurrentMonthKey() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  }

  function formatCurrency(amount) {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
  }

  function formatMonthLabel(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return `// ${date.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}`;
  }

  function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function loadData() {
    const fallback = {
      currentMonth: getCurrentMonthKey(),
      entriesByMonth: {}
    };

    let data;
    try {
      data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || fallback;
    } catch (e) {
      data = fallback;
    }

    if (!data.entriesByMonth || typeof data.entriesByMonth !== 'object') {
      data.entriesByMonth = {};
    }

    const thisMonth = getCurrentMonthKey();
    if (data.currentMonth !== thisMonth) {
      data.currentMonth = thisMonth;
      saveData(data);
    }

    if (!Array.isArray(data.entriesByMonth[data.currentMonth])) {
      data.entriesByMonth[data.currentMonth] = [];
    }

    return data;
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getCurrentEntries(data) {
    return data.entriesByMonth[data.currentMonth] || [];
  }

  function getCurrentRevenue(data) {
    return getCurrentEntries(data).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  function renderRevenue(data) {
    const revenue = getCurrentRevenue(data);
    const percent = Math.min(100, Math.round((revenue / MONTHLY_TARGET) * 100));

    document.getElementById('revenueDisplay').textContent =
      `${formatCurrency(revenue)} / ${formatCurrency(MONTHLY_TARGET)}`;
    document.getElementById('revenuePercent').textContent = `${percent}%`;
    document.getElementById('revenueProgressFill').style.width = `${percent}%`;
    document.getElementById('headerRevenueProgressFill').style.width = `${percent}%`;
    document.getElementById('revenueMonthLabel').textContent = formatMonthLabel(data.currentMonth);
  }

  function renderIncomeLog(data) {
    const list = document.getElementById('incomeLogList');
    const entries = [...getCurrentEntries(data)].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    list.innerHTML = '';

    if (entries.length === 0) {
      const li = document.createElement('li');
      li.className = 'task-empty';
      li.textContent = 'No income logged this month.';
      list.appendChild(li);
      return;
    }

    entries.forEach((entry) => {
      const li = document.createElement('li');
      li.className = 'item-row';
      li.innerHTML = `
        <span class="item-text">${formatDate(entry.createdAt)} | ${entry.source} | ${formatCurrency(Number(entry.amount))}</span>
        <button class="remove-btn" data-entry-id="${entry.id}">✕</button>
      `;
      list.appendChild(li);
    });
  }

  function openModal() {
    document.getElementById('incomeModalOverlay').classList.add('active');
    document.getElementById('incomeAmount').focus();
  }

  function closeModal() {
    document.getElementById('incomeModalOverlay').classList.remove('active');
    document.getElementById('incomeAmount').value = '';
    document.getElementById('incomeSource').value = 'Residential Clean';
    document.getElementById('incomeNote').value = '';
  }

  function addIncomeEntry() {
    const amountInput = document.getElementById('incomeAmount');
    const sourceInput = document.getElementById('incomeSource');
    const noteInput = document.getElementById('incomeNote');

    const amount = Number(amountInput.value);
    const source = sourceInput.value;
    const note = noteInput.value.trim();

    if (!amount || amount <= 0) return;

    const data = loadData();
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      amount,
      source,
      note,
      createdAt: new Date().toISOString()
    };

    data.entriesByMonth[data.currentMonth].push(entry);
    saveData(data);
    renderRevenue(data);
    renderIncomeLog(data);
    closeModal();
  }

  function deleteIncomeEntry(entryId) {
    const data = loadData();
    const current = getCurrentEntries(data);
    data.entriesByMonth[data.currentMonth] = current.filter((item) => item.id !== entryId);
    saveData(data);
    renderRevenue(data);
    renderIncomeLog(data);
  }

  function initialize() {
    const data = loadData();
    renderRevenue(data);
    renderIncomeLog(data);

    document.getElementById('openIncomeModalBtn').addEventListener('click', openModal);
    document.getElementById('closeIncomeModalBtn').addEventListener('click', closeModal);
    document.getElementById('saveIncomeBtn').addEventListener('click', addIncomeEntry);

    document.getElementById('incomeLogList').addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains('remove-btn')) return;

      const entryId = target.getAttribute('data-entry-id');
      if (!entryId) return;
      deleteIncomeEntry(entryId);
    });
  }

  return { initialize };
})();

