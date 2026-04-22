(function () {
  function injectTerminalCalendarSkin() {
    if (document.getElementById('terminal-calendar-skin')) return;
    const style = document.createElement('style');
    style.id = 'terminal-calendar-skin';
    style.textContent = `
#calendarPanelOverlay:not(.hidden) {
  inset: 0 !important;
  background: rgba(0, 0, 0, 0.55) !important;
  z-index: 249 !important;
}
#calendarPanel:not(.hidden) {
  z-index: 250 !important;
}
#calendarPanel {
  forced-colors-adjust: none;
  background-color: #0a0a0a !important;
  background-image: none !important;
  color: #00ff41 !important;
}
#calendarPanel * {
  forced-colors-adjust: none;
}
#calendarPanel .calendar-panel-header {
  border-bottom-color: rgba(0, 255, 65, 0.25) !important;
}
#calendarPanel .calendar-month-label,
#calendarPanel .calendar-weekdays,
#calendarPanel .calendar-weekdays span {
  color: #00cc33 !important;
}
#calendarPanel button {
  -webkit-appearance: none !important;
  appearance: none !important;
  background-image: none !important;
  text-shadow: none !important;
}
#calendarPanel button.calendar-nav-btn,
#calendarPanel button.calendar-close-btn {
  background-color: rgba(0, 255, 65, 0.08) !important;
  color: #00ff41 !important;
  border: 1px solid #00cc33 !important;
  box-shadow: 0 0 8px rgba(0, 255, 65, 0.35) !important;
}
#calendarPanel button.calendar-nav-btn:hover,
#calendarPanel button.calendar-close-btn:hover {
  background-color: rgba(0, 255, 65, 0.15) !important;
  border-color: #00ff41 !important;
  color: #00ff41 !important;
}
#calendarPanel button.calendar-day {
  background-color: rgba(0, 255, 65, 0.07) !important;
  color: #00ff41 !important;
  border: 1px solid #00cc33 !important;
}
#calendarPanel button.calendar-day:hover {
  background-color: rgba(0, 255, 65, 0.14) !important;
  border-color: #00ff41 !important;
  color: #00ff41 !important;
}
#calendarPanel button.calendar-day-selected {
  background-color: rgba(0, 255, 65, 0.22) !important;
  border-color: #00ff41 !important;
  color: #00ff41 !important;
}
#calendarPanel button.calendar-day-today {
  border-color: #00ff41 !important;
  box-shadow: inset 0 0 10px rgba(0, 255, 65, 0.2) !important;
}
#calendarPanel button:focus {
  outline: none !important;
}
#calendarPanel button:focus-visible {
  box-shadow: 0 0 0 2px #00ff41, 0 0 16px rgba(0, 255, 65, 0.45) !important;
}
`;
    document.head.appendChild(style);
  }

  injectTerminalCalendarSkin();

  const MONTH_NAMES = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  let panelBuilt = false;
  let overlayEl;
  let panelEl;
  let gridEl;
  let monthLabelEl;
  let activeState = null;
  let viewYear;
  let viewMonth;
  let resizeHandler = null;

  function detachResize() {
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }
  }

  function getActiveEditModalBox() {
    return document.getElementById('aprilEditModalBox') || document.getElementById('monthEditModalBox');
  }

  function syncCalendarToModalBox() {
    const box = getActiveEditModalBox();
    if (!box || !panelEl.classList.contains('calendar-panel--over-modal')) return;
    const r = box.getBoundingClientRect();
    panelEl.style.top = `${r.top}px`;
    panelEl.style.left = `${r.left}px`;
    panelEl.style.width = `${r.width}px`;
    panelEl.style.height = `${r.height}px`;
  }

  function applyCenterLayout() {
    detachResize();
    panelEl.classList.remove('calendar-panel--over-modal');
    panelEl.style.cssText = '';
    if (overlayEl) overlayEl.classList.remove('hidden');
  }

  function applyEditModalLayout() {
    const modal =
      document.getElementById('aprilEditModalOverlay') || document.getElementById('monthEditModalOverlay');
    const box = document.getElementById('aprilEditModalBox') || document.getElementById('monthEditModalBox');
    if (!modal || !modal.classList.contains('active') || !box) {
      return false;
    }
    detachResize();
    panelEl.classList.add('calendar-panel--over-modal');
    overlayEl.classList.add('hidden');
    panelEl.style.position = 'fixed';
    panelEl.style.transform = 'none';
    panelEl.style.zIndex = '250';
    panelEl.style.boxSizing = 'border-box';
    syncCalendarToModalBox();
    resizeHandler = function () {
      syncCalendarToModalBox();
    };
    window.addEventListener('resize', resizeHandler);
    return true;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function isoFromYmd(y, m, d) {
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  function parseIso(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return { y, m, d };
  }

  function formatDisplay(iso) {
    const p = parseIso(iso);
    if (!p) return '';
    const dt = new Date(p.y, p.m - 1, p.d);
    return dt.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).toUpperCase();
  }

  function todayIsoLocal() {
    const d = new Date();
    return isoFromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  function syncDisplay(hiddenEl, displayEl) {
    if (!displayEl || !hiddenEl) return;
    displayEl.value = formatDisplay(hiddenEl.value) || '';
  }

  function ensurePanel() {
    if (panelBuilt) return;

    overlayEl = document.createElement('div');
    overlayEl.id = 'calendarPanelOverlay';
    overlayEl.className = 'calendar-panel-overlay hidden';
    overlayEl.addEventListener('click', close);

    panelEl = document.createElement('div');
    panelEl.id = 'calendarPanel';
    panelEl.className = 'calendar-panel hidden';
    panelEl.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    panelEl.innerHTML = `
      <div class="calendar-panel-header">
        <button type="button" class="calendar-nav-btn" id="calendarPrevMonth" aria-label="Previous month">◀</button>
        <p class="calendar-month-label" id="calendarMonthLabel"></p>
        <button type="button" class="calendar-nav-btn" id="calendarNextMonth" aria-label="Next month">▶</button>
        <button type="button" class="calendar-close-btn" id="calendarCloseBtn" aria-label="Close">✕</button>
      </div>
      <div class="calendar-weekdays">
        <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
      </div>
      <div class="calendar-grid" id="calendarGrid"></div>
    `;

    document.body.appendChild(overlayEl);
    document.body.appendChild(panelEl);

    gridEl = document.getElementById('calendarGrid');
    monthLabelEl = document.getElementById('calendarMonthLabel');

    document.getElementById('calendarPrevMonth').addEventListener('click', function () {
      viewMonth -= 1;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear -= 1;
      }
      renderGrid();
    });
    document.getElementById('calendarNextMonth').addEventListener('click', function () {
      viewMonth += 1;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear += 1;
      }
      renderGrid();
    });
    document.getElementById('calendarCloseBtn').addEventListener('click', close);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && activeState) close();
    });

    panelBuilt = true;
  }

  function daysInMonth(y, m) {
    return new Date(y, m + 1, 0).getDate();
  }

  function startWeekday(y, m) {
    return new Date(y, m, 1).getDay();
  }

  function renderGrid() {
    if (!activeState) return;
    monthLabelEl.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    gridEl.innerHTML = '';

    const dim = daysInMonth(viewYear, viewMonth);
    const start = startWeekday(viewYear, viewMonth);
    const selected = parseIso(activeState.hiddenEl.value);
    const today = parseIso(todayIsoLocal());

    for (let i = 0; i < start; i += 1) {
      const cell = document.createElement('div');
      cell.className = 'calendar-cell calendar-cell-empty';
      gridEl.appendChild(cell);
    }

    for (let day = 1; day <= dim; day += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'calendar-cell calendar-day';
      cell.textContent = String(day);

      const isSelected =
        selected && selected.y === viewYear && selected.m === viewMonth + 1 && selected.d === day;
      const isToday =
        today && today.y === viewYear && today.m === viewMonth + 1 && today.d === day;

      if (isSelected) cell.classList.add('calendar-day-selected');
      if (isToday) cell.classList.add('calendar-day-today');

      cell.addEventListener('click', function () {
        const iso = isoFromYmd(viewYear, viewMonth + 1, day);
        activeState.hiddenEl.value = iso;
        syncDisplay(activeState.hiddenEl, activeState.displayEl);
        close();
      });

      gridEl.appendChild(cell);
    }
  }

  function open(hiddenEl, displayEl, layoutMode) {
    ensurePanel();
    activeState = { hiddenEl, displayEl };

    const sideMenu = document.getElementById('sideMenu');
    const sideOverlay = document.getElementById('sideMenuOverlay');
    if (sideMenu && sideMenu.classList.contains('open')) {
      sideMenu.classList.remove('open');
      if (sideOverlay) sideOverlay.classList.remove('active');
    }

    const current = parseIso(hiddenEl.value) || parseIso(todayIsoLocal());
    viewYear = current.y;
    viewMonth = current.m - 1;

    if (layoutMode === 'editModal') {
      if (!applyEditModalLayout()) {
        applyCenterLayout();
      }
    } else {
      applyCenterLayout();
    }

    panelEl.classList.remove('hidden');
    renderGrid();

    if (layoutMode === 'editModal' && panelEl.classList.contains('calendar-panel--over-modal')) {
      requestAnimationFrame(function () {
        requestAnimationFrame(syncCalendarToModalBox);
      });
    }
  }

  function close() {
    detachResize();
    if (panelEl) {
      panelEl.classList.remove('calendar-panel--over-modal');
      panelEl.style.cssText = '';
      panelEl.classList.add('hidden');
    }
    if (overlayEl) overlayEl.classList.add('hidden');
    activeState = null;
  }

  function bind(triggerId, hiddenId, displayId, layoutMode) {
    const trigger = document.getElementById(triggerId);
    const hidden = document.getElementById(hiddenId);
    const display = document.getElementById(displayId);
    if (!trigger || !hidden || !display) return;
    if (trigger.dataset.calendarPickerBound === '1') return;
    trigger.dataset.calendarPickerBound = '1';

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      open(hidden, display, layoutMode);
    });
  }

  window.CalendarPicker = {
    init: function () {
      bind('aprilRevenueDateTrigger', 'aprilRevenueDateInput', 'aprilRevenueDateDisplay', 'center');
      bind('monthRevenueDateTrigger', 'monthRevenueDateInput', 'monthRevenueDateDisplay', 'center');
      bind('editRevenueDateTrigger', 'editRevenueDateInput', 'editRevenueDateDisplay', 'editModal');
      bind('monthEditRevenueDateTrigger', 'monthEditRevenueDateInput', 'monthEditRevenueDateDisplay', 'editModal');
    },
    syncDisplay: syncDisplay,
    close: close
  };
})();
