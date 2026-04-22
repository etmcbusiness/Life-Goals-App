const menuOpenBtn = document.getElementById('menuOpenBtn');
const menuCloseBtn = document.getElementById('menuCloseBtn');
const sideMenu = document.getElementById('sideMenu');
const sideMenuOverlay = document.getElementById('sideMenuOverlay');

const REVENUE_STORAGE_KEY = 'aprilRevenueEntries';

function getCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function setSideMenuCurrentMonthLink() {
  const link = document.getElementById('sideMenuCurrentMonthLink');
  if (!link) return;
  link.href = `month.html?month=${getCurrentMonthKey()}`;
}

function loadRevenueEntries() {
  try {
    const raw = localStorage.getItem(REVENUE_STORAGE_KEY);
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
  const d = new Date(entry.createdAt);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function sumRevenueForMonth(entries, monthKey) {
  return entries.reduce(function (sum, entry) {
    if (entryMonthKey(entry) === monthKey) {
      return sum + Number(entry.amount || 0);
    }
    return sum;
  }, 0);
}

function formatMenuCurrency(value) {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  });
}

function renderSideMenuMonths() {
  const nav = document.getElementById('sideMenuMonths');
  const label = document.getElementById('sideMenuMonthsLabel');
  if (!nav) return;

  const year = new Date().getFullYear();
  if (label) {
    label.textContent = `MONTHS · ${year}`;
  }

  const entries = loadRevenueEntries();
  nav.innerHTML = '';

  for (let m = 1; m <= 12; m += 1) {
    const monthKey = `${year}-${String(m).padStart(2, '0')}`;
    const total = sumRevenueForMonth(entries, monthKey);
    const monthDate = new Date(year, m - 1, 1);
    const name = monthDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();

    const row = document.createElement('a');
    row.className = 'side-menu-month-row';
    row.href = `month.html?month=${monthKey}`;
    row.setAttribute('aria-label', `${name} ${year}, ${formatMenuCurrency(total)}`);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'side-menu-month-name';
    nameSpan.textContent = name;

    const revSpan = document.createElement('span');
    revSpan.className = 'side-menu-month-rev';
    revSpan.textContent = formatMenuCurrency(total);

    row.appendChild(nameSpan);
    row.appendChild(revSpan);
    nav.appendChild(row);
  }
}

function openMenu() {
  sideMenu.classList.add('open');
  sideMenuOverlay.classList.add('active');
  setSideMenuCurrentMonthLink();
  renderSideMenuMonths();
}

function closeMenu() {
  sideMenu.classList.remove('open');
  sideMenuOverlay.classList.remove('active');
}

if (menuOpenBtn && menuCloseBtn && sideMenu && sideMenuOverlay) {
  menuOpenBtn.addEventListener('click', openMenu);
  menuCloseBtn.addEventListener('click', closeMenu);
  sideMenuOverlay.addEventListener('click', closeMenu);
}

window.renderSideMenuMonths = renderSideMenuMonths;
setSideMenuCurrentMonthLink();
renderSideMenuMonths();
