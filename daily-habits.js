/**
 * Daily habits (outreach + P&L): one row per calendar day (local).
 * Persists under the same key as the legacy flat object; migrates once to { version, days }.
 */
(function (global) {
  const STORAGE_KEY = 'dashboardOutreachChecks';

  const HABIT_META = [
    { id: 'emails', label: 'Send 100 Emails' },
    { id: 'dms', label: 'Send 100 DMS' },
    { id: 'videos', label: 'Post 5 Videos' },
    { id: 'pnl', label: 'Log P&L Entries' }
  ];

  function localDateKey(d) {
    d = d || new Date();
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  }

  function isLegacyFlat(raw) {
    if (!raw || typeof raw !== 'object') return false;
    if (raw.days && typeof raw.days === 'object') return false;
    return 'emails' in raw || 'dms' in raw || 'videos' in raw;
  }

  function normalizeStore(raw) {
    if (!raw || typeof raw !== 'object') return { version: 1, days: {} };
    if (raw.days && typeof raw.days === 'object' && !Array.isArray(raw.days)) {
      return { version: 1, days: { ...raw.days } };
    }
    if (isLegacyFlat(raw)) {
      const today = localDateKey(new Date());
      return {
        version: 1,
        days: {
          [today]: {
            emails: !!raw.emails,
            dms: !!raw.dms,
            videos: !!raw.videos,
            pnl: false
          }
        }
      };
    }
    return { version: 1, days: {} };
  }

  function loadStore() {
    try {
      const raw = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || '{}');
      const norm = normalizeStore(raw);
      if (isLegacyFlat(raw)) {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(norm));
      }
      return norm;
    } catch (e) {
      return { version: 1, days: {} };
    }
  }

  function saveStore(store) {
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function getDay(dateKey) {
    const store = loadStore();
    const row = store.days[dateKey];
    const out = {};
    HABIT_META.forEach(function (h) {
      out[h.id] = !!(row && row[h.id]);
    });
    return out;
  }

  function dayHasAnyChecked(cur) {
    for (let i = 0; i < HABIT_META.length; i++) {
      if (cur[HABIT_META[i].id]) return true;
    }
    return false;
  }

  function setHabit(dateKey, habitId, checked) {
    const store = loadStore();
    const cur = { ...getDay(dateKey), [habitId]: !!checked };
    if (!dayHasAnyChecked(cur)) {
      delete store.days[dateKey];
    } else {
      store.days[dateKey] = cur;
    }
    saveStore(store);
  }

  /**
   * Calendar month: done = days in that month where habit is checked; total = dim (full month).
   */
  /**
   * Consecutive calendar days (local): walk backward from **today** while checked.
   * If **today** is not checked yet, start from **yesterday** so the streak does not drop to 0
   * until there is a real gap (and backfilling a missed day on Analytics reconnects the run).
   */
  function getCurrentStreak(habitId) {
    const store = loadStore();
    function dayChecked(dateKey) {
      const row = store.days[dateKey];
      return !!(row && row[habitId]);
    }
    const d = new Date();
    if (!dayChecked(localDateKey(d))) {
      d.setDate(d.getDate() - 1);
    }
    let streak = 0;
    const maxDays = 366 * 25;
    for (let i = 0; i < maxDays; i++) {
      const key = localDateKey(d);
      if (!dayChecked(key)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function habitMonthProgress(monthKey, habitId) {
    const parts = monthKey.split('-');
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(y) || !Number.isFinite(m)) {
      return { done: 0, total: 0, pct: 0 };
    }
    const dim = new Date(y, m, 0).getDate();
    let done = 0;
    for (let day = 1; day <= dim; day++) {
      const dk = `${monthKey}-${String(day).padStart(2, '0')}`;
      if (getDay(dk)[habitId]) done++;
    }
    const pct = dim > 0 ? (done / dim) * 100 : 0;
    return { done, total: dim, pct };
  }

  global.DailyHabits = {
    STORAGE_KEY,
    HABIT_META,
    localDateKey,
    loadStore,
    getDay,
    setHabit,
    habitMonthProgress,
    getCurrentStreak
  };
})(window);
