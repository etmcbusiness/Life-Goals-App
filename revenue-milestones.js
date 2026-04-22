/**
 * Plays a sound each time lifetime actual (non-estimated) revenue crosses a new $1,000 tier.
 * Sound: localStorage key revenueMilestoneSoundDataUrl (data URL) if set, else ./revenue-milestone-user.mp3,
 * else a short built-in beep. No UI — put revenue-milestone-user.mp3 next to the HTML files to customize.
 */
(function (global) {
  const STORAGE_DATA_URL = 'revenueMilestoneSoundDataUrl';
  const MILESTONE_STEP = 1000;
  const USER_MP3 = 'revenue-milestone-user.mp3';
  const STAGGER_MS = 220;
  const MAX_BURST = 50;

  function sumActualRevenue(entries) {
    if (!Array.isArray(entries)) return 0;
    let s = 0;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e || e.revenueKind === 'estimated') continue;
      const amt = Number(e.amount);
      if (Number.isFinite(amt) && amt > 0) s += amt;
    }
    return s;
  }

  function countMilestonesCrossed(oldSum, newSum) {
    if (newSum <= oldSum) return 0;
    const oldTier = Math.floor(oldSum / MILESTONE_STEP);
    const newTier = Math.floor(newSum / MILESTONE_STEP);
    return Math.max(0, newTier - oldTier);
  }

  function playDefaultBeep() {
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.03);
    g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
    o.frequency.value = 920;
    o.type = 'sine';
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.15);
    global.setTimeout(function () {
      ctx.close().catch(function () {});
    }, 320);
  }

  function readStoredSoundDataUrl() {
    try {
      const u = localStorage.getItem(STORAGE_DATA_URL);
      return u && typeof u === 'string' && u.indexOf('data:') === 0 ? u : '';
    } catch (e) {
      return '';
    }
  }

  function playChosenSoundOnce() {
    const dataUrl = readStoredSoundDataUrl();
    if (dataUrl) {
      const a = new Audio(dataUrl);
      a.volume = 0.88;
      return a.play().catch(function () {
        return tryUserMp3OrBeep();
      });
    }
    return tryUserMp3OrBeep();
  }

  function tryUserMp3OrBeep() {
    const a = new Audio(USER_MP3);
    a.volume = 0.88;
    return a.play().catch(function () {
      playDefaultBeep();
    });
  }

  function playMilestoneSounds(count) {
    const n = Math.min(Math.max(0, Math.floor(count)), MAX_BURST);
    for (let i = 0; i < n; i++) {
      global.setTimeout(function () {
        playChosenSoundOnce();
      }, i * STAGGER_MS);
    }
  }

  function notifyRevenueEntriesChanged(prevEntries, nextEntries) {
    if (!Array.isArray(prevEntries) || !Array.isArray(nextEntries)) return;
    const oldSum = sumActualRevenue(prevEntries);
    const newSum = sumActualRevenue(nextEntries);
    const crossed = countMilestonesCrossed(oldSum, newSum);
    if (crossed > 0) playMilestoneSounds(crossed);
  }

  global.notifyRevenueEntriesChanged = notifyRevenueEntriesChanged;
})(window);
