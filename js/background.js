// Sound & Signal — Alive background (fixed full-page canvas behind all content)
// Layers: oscilloscope grid, pulsing center glow, glowing sine traces, CRT scanlines.

(function () {
  const GREEN = '57, 255, 106';
  const AMBER = '255, 176, 0';
  const GRID_STEP = 60;
  const FRAME_MS = 1000 / 30; // slow motion; 30 fps is plenty and cheap

  // Frequency is expressed as cycles across the screen width.
  const TRACES = [
    { color: GREEN, cycles: 2.2, speed: 0.35, amp: 0.13, y: 0.30, alpha: 0.28, phase: 0.0, harmonic: 0.0 },
    { color: GREEN, cycles: 3.6, speed: -0.55, amp: 0.09, y: 0.52, alpha: 0.23, phase: 1.7, harmonic: 0.25 },
    { color: GREEN, cycles: 1.4, speed: 0.22, amp: 0.16, y: 0.74, alpha: 0.2, phase: 3.1, harmonic: 0.0 },
    { color: AMBER, cycles: 5.3, speed: 0.8, amp: 0.05, y: 0.42, alpha: 0.13, phase: 4.6, harmonic: 0.0 }
  ];

  const canvas = document.createElement('canvas');
  canvas.id = 'bgCanvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(canvas, document.body.firstChild);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0;
  let height = 0;
  let dpr = 1;
  let gridLayer = null;
  let scanlinePattern = null;
  let rafId = null;
  let lastDraw = 0;

  function buildGrid() {
    gridLayer = document.createElement('canvas');
    gridLayer.width = canvas.width;
    gridLayer.height = canvas.height;
    const g = gridLayer.getContext('2d');
    const step = GRID_STEP * dpr;
    const cx = Math.round(canvas.width / 2);
    const cy = Math.round(canvas.height / 2);

    g.lineWidth = 1;
    g.strokeStyle = `rgba(${GREEN}, 0.10)`;
    g.beginPath();
    for (let x = cx % step; x <= canvas.width; x += step) {
      g.moveTo(Math.round(x) + 0.5, 0);
      g.lineTo(Math.round(x) + 0.5, canvas.height);
    }
    for (let y = cy % step; y <= canvas.height; y += step) {
      g.moveTo(0, Math.round(y) + 0.5);
      g.lineTo(canvas.width, Math.round(y) + 0.5);
    }
    g.stroke();

    // Brighter center axes with small tick marks, like a real graticule
    g.strokeStyle = `rgba(${GREEN}, 0.2)`;
    g.beginPath();
    g.moveTo(cx + 0.5, 0);
    g.lineTo(cx + 0.5, canvas.height);
    g.moveTo(0, cy + 0.5);
    g.lineTo(canvas.width, cy + 0.5);
    const tick = step / 5;
    for (let x = cx % tick; x <= canvas.width; x += tick) {
      g.moveTo(Math.round(x) + 0.5, cy - 3 * dpr);
      g.lineTo(Math.round(x) + 0.5, cy + 3 * dpr);
    }
    for (let y = cy % tick; y <= canvas.height; y += tick) {
      g.moveTo(cx - 3 * dpr, Math.round(y) + 0.5);
      g.lineTo(cx + 3 * dpr, Math.round(y) + 0.5);
    }
    g.stroke();
  }

  function buildScanlines() {
    const tile = document.createElement('canvas');
    tile.width = 1;
    tile.height = Math.max(3, Math.round(3 * dpr));
    const t = tile.getContext('2d');
    t.fillStyle = 'rgba(0, 0, 0, 0.22)';
    t.fillRect(0, tile.height - Math.max(1, Math.round(dpr)), 1, Math.max(1, Math.round(dpr)));
    scanlinePattern = ctx.createPattern(tile, 'repeat');
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    buildGrid();
    buildScanlines();
    draw(performance.now());
  }

  function drawTrace(trace, t) {
    const w = canvas.width;
    const h = canvas.height;
    const amp = trace.amp * h;
    const cy = trace.y * h;
    const k = (Math.PI * 2 * trace.cycles) / w;
    const step = Math.max(4, Math.round(5 * dpr));

    ctx.beginPath();
    for (let x = 0; x <= w + step; x += step) {
      const a = k * x + trace.phase + t * trace.speed;
      const y = cy + amp * (Math.sin(a) + trace.harmonic * Math.sin(a * 2.7 + 0.8));
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    // Soft halo pass, then the thin bright line
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4 * dpr;
    ctx.strokeStyle = `rgba(${trace.color}, ${trace.alpha * 0.11})`;
    ctx.stroke();
    ctx.lineWidth = 1.6 * dpr;
    ctx.strokeStyle = `rgba(${trace.color}, ${trace.alpha})`;
    ctx.stroke();
  }

  function draw(now) {
    const t = motionQuery.matches ? 0 : now / 1000;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#050805';
    ctx.fillRect(0, 0, w, h);

    // Slow pulsing radial glow in the center
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.6);
    const radius = Math.max(w, h) * (0.5 + 0.08 * pulse);
    const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, radius);
    glow.addColorStop(0, `rgba(${GREEN}, ${0.035 + 0.04 * pulse})`);
    glow.addColorStop(1, `rgba(${GREEN}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.drawImage(gridLayer, 0, 0);

    for (const trace of TRACES) drawTrace(trace, t);

    // CRT scanlines on top
    ctx.fillStyle = scanlinePattern;
    ctx.fillRect(0, 0, w, h);
  }

  function loop(now) {
    rafId = requestAnimationFrame(loop);
    if (now - lastDraw < FRAME_MS) return;
    lastDraw = now;
    draw(now);
  }

  function sync() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (motionQuery.matches) {
      draw(0);
    } else {
      rafId = requestAnimationFrame(loop);
    }
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 100);
  });

  if (motionQuery.addEventListener) {
    motionQuery.addEventListener('change', sync);
  } else if (motionQuery.addListener) {
    motionQuery.addListener(sync);
  }

  resize();
  sync();
})();
