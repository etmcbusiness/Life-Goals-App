/**
 * Dashboard: CASH MONEY opens revenue immediately; ~3s of dense $ rain runs in parallel (under scanlines,
 * pointer-events: none).
 */
(function () {
  const gate = document.getElementById('dashboardMoneyGate');
  const panel = document.getElementById('dashboardRevenuePanel');
  if (!gate || !panel) return;

  const TOTAL_MS = 3000;
  const FADE_IN_MS = 450;
  const FADE_OUT_MS = 550;
  /** Visual weight of falling $ (0–1); ~0.25 ≈ quarter strength vs original. */
  const GLYPH_OCCUPANCY = 0.25;

  function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  function overlayAlpha(elapsed) {
    if (elapsed < FADE_IN_MS) return easeOutQuad(elapsed / FADE_IN_MS);
    if (elapsed > TOTAL_MS - FADE_OUT_MS) {
      const u = (TOTAL_MS - elapsed) / FADE_OUT_MS;
      return easeOutQuad(Math.max(0, Math.min(1, u)));
    }
    return 1;
  }

  function openPanel() {
    gate.classList.add('hidden');
    panel.classList.remove('hidden');
    gate.setAttribute('aria-expanded', 'true');
    panel.removeAttribute('aria-hidden');
    const amt = document.getElementById('aprilRevenueInput');
    if (amt) {
      window.setTimeout(function () {
        amt.focus();
      }, 0);
    }
  }

  function playDollarMatrix() {
    const wrap = document.createElement('div');
    wrap.className = 'dashboard-matrix-overlay';
    wrap.setAttribute('aria-hidden', 'true');
    const canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
    document.body.insertBefore(wrap, document.body.firstChild);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      wrap.remove();
      return;
    }

    const MIN_COL_STRIDE = 12;
    const STREAMS_PER_STRIDE = 50;
    const MAX_STREAMS = 4000;
    const lineH = 12;
    const columns = [];

    function initColumns() {
      columns.length = 0;
      const w = Math.max(1, canvas.width);
      // Widen column bands when capped so rain still spans the full viewport (fixed stride + cap
      // used to pack all streams into ~960px on wide monitors).
      let stride = MIN_COL_STRIDE;
      let baseCols = Math.ceil(w / stride) + 2;
      while (baseCols * STREAMS_PER_STRIDE > MAX_STREAMS && stride < w) {
        stride += 1;
        baseCols = Math.ceil(w / stride) + 2;
      }
      baseCols = Math.max(1, baseCols);
      for (let i = 0; i < baseCols; i++) {
        for (let k = 0; k < STREAMS_PER_STRIDE; k++) {
          const slot = (k + 0.35) / STREAMS_PER_STRIDE;
          columns.push({
            x: i * stride + slot * stride * 0.98 + Math.random() * 0.35,
            y: Math.random() * canvas.height * 2.2 - canvas.height * 1.6,
            speed: 1.6 + Math.random() * 4.8,
            trail: 7 + Math.floor(Math.random() * 12)
          });
        }
      }
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initColumns();
    }

    resize();
    const onResize = function () {
      resize();
    };
    window.addEventListener('resize', onResize);

    const start = performance.now();
    let rafId = 0;

    function tick(now) {
      const elapsed = now - start;
      const alpha = overlayAlpha(elapsed);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.font = '11px "Share Tech Mono", monospace';
      ctx.textBaseline = 'top';

      const baseGlyph = 0.42 * alpha * GLYPH_OCCUPANCY;

      columns.forEach(function (c) {
        c.y += c.speed;
        if (c.y > canvas.height + c.trail * lineH) {
          c.y = -Math.random() * canvas.height * 1.4;
          c.speed = 1.6 + Math.random() * 4.8;
          c.trail = 7 + Math.floor(Math.random() * 12);
        }
        for (let i = 0; i < c.trail; i++) {
          const py = c.y - i * lineH;
          if (py < -lineH || py > canvas.height + lineH) continue;
          const head = i === 0;
          const tailT = i / Math.max(1, c.trail - 1);
          const dim = head ? 1 : 0.12 + (1 - tailT) * 0.88;
          const a = baseGlyph * dim * (head ? 1.35 : 1);
          if (head) {
            ctx.fillStyle = 'rgba(200,255,210,' + Math.min(0.85, a * 1.8) + ')';
            ctx.shadowColor = 'rgba(0,255,65,' + 0.45 * GLYPH_OCCUPANCY + ')';
            ctx.shadowBlur = 4 * alpha * GLYPH_OCCUPANCY;
          } else {
            ctx.fillStyle = 'rgba(0,255,65,' + a + ')';
            ctx.shadowBlur = 0;
          }
          ctx.fillText('$', c.x, py);
        }
        ctx.shadowBlur = 0;
      });

      if (elapsed >= TOTAL_MS) {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', onResize);
        wrap.remove();
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
  }

  gate.addEventListener('click', function () {
    if (gate.classList.contains('hidden') || gate.disabled) return;
    gate.disabled = true;
    openPanel();
    gate.disabled = false;
    playDollarMatrix();
  });

  window.dashboardMoneyAfterSave = function () {
    panel.classList.add('hidden');
    gate.classList.remove('hidden');
    gate.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
    const sourceDd = document.getElementById('aprilRevenueSourceDropdown');
    const kindDd = document.getElementById('aprilRevenueKindDropdown');
    if (sourceDd) sourceDd.classList.remove('open');
    if (kindDd) kindDd.classList.remove('open');
  };
})();
