// Sound & Signal — Sound Waves page: Harmonic Builder
// Scope: ideal wave (dashed amber) vs. partial Fourier sum (glowing green).
// Audio: the same partial sum, played through a Web Audio PeriodicWave.

(function () {
  'use strict';

  const scopeCanvas = document.getElementById('harmonicScope');
  const spectrumCanvas = document.getElementById('spectrumCanvas');
  if (!scopeCanvas || !spectrumCanvas) return;

  const MAX_N = 25;
  const SCOPE_PERIODS = 2;
  const SCOPE_DIVS_X = 10;
  const SCOPE_DIVS_Y = 8;
  const TWO_PI = Math.PI * 2;
  const SPEC_DB_FLOOR = -60; // bottom of the dB axis
  const MINUS = '\u2212';
  const FADE = 0.03; // seconds; crossfade between waves and start/stop ramps

  // k = 1, 2, 3… counts the sine terms of each series.
  const WAVES = {
    square: {
      name: 'SQUARE',
      oddOnly: true,
      harmonic: (k) => 2 * k - 1,
      coeff: (k) => 4 / (Math.PI * (2 * k - 1)),
      target: (ph) => (Math.sin(ph) >= 0 ? 1 : -1)
    },
    sawtooth: {
      name: 'SAWTOOTH',
      oddOnly: false,
      harmonic: (k) => k,
      coeff: (k) => (k % 2 === 1 ? 1 : -1) * 2 / (Math.PI * k),
      target: (ph) => (((ph + Math.PI) % TWO_PI) - Math.PI) / Math.PI
    },
    triangle: {
      name: 'TRIANGLE',
      oddOnly: true,
      harmonic: (k) => 2 * k - 1,
      coeff: (k) => (k % 2 === 1 ? 1 : -1) * 8 / (Math.PI * Math.PI * (2 * k - 1) * (2 * k - 1)),
      target: (ph) => (2 / Math.PI) * Math.asin(Math.sin(ph))
    }
  };

  const el = {
    wave: document.getElementById('targetWave'),
    n: document.getElementById('harmonics'),
    nOut: document.getElementById('harmonicsOut'),
    freq: document.getElementById('fundamental'),
    freqOut: document.getElementById('fundamentalOut'),
    vol: document.getElementById('builderVolume'),
    volOut: document.getElementById('builderVolumeOut'),
    play: document.getElementById('builderPlay'),
    harmonicReadout: document.getElementById('harmonicReadout'),
    waveReadout: document.getElementById('waveReadout'),
    periodReadout: document.getElementById('periodReadout'),
    spectrumTop: document.getElementById('spectrumTop'),
    specLinear: document.getElementById('specLinear'),
    specDb: document.getElementById('specDb'),
    specDisplay: document.getElementById('spectrumDisplay'),
    specTip: document.getElementById('spectrumTip'),
    specLive: document.getElementById('spectrumLive')
  };

  const state = {
    wave: el.wave.value,
    n: parseInt(el.n.value, 10),
    freq: parseFloat(el.freq.value),
    volume: parseFloat(el.vol.value),
    scale: 'linear' // spectrum y-axis: 'linear' or 'db'
  };

  // Harmonic (term index k) being inspected by hover, tap or keyboard; null when none
  let inspect = null;

  // Displayed weight of each sine term (0 = absent, 1 = fully added). It eases toward its
  // target so adding a harmonic fades it in; the audio uses the whole-number state.
  const weights = new Float32Array(MAX_N + 1);
  for (let k = 1; k <= state.n; k++) weights[k] = 1;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---- Audio --------------------------------------------------------------

  const AudioCtor = window.AudioContext || window.webkitAudioContext;

  const audio = {
    ctx: null,
    master: null,
    voices: new Set(),
    current: null,
    running: false,

    ensure() {
      if (!this.ctx) {
        this.ctx = new AudioCtor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.ctx.destination);
      }
      return this.ctx;
    },

    // Headroom: the partial sum can overshoot 1.0 (Gibbs), so the master level tops out at 0.8
    level() {
      return state.volume * 0.8;
    },

    // Exactly the sum on screen: the first N sine terms, un-normalized
    makeWave() {
      const wave = WAVES[state.wave];
      const top = wave.harmonic(state.n);
      const real = new Float32Array(top + 1);
      const imag = new Float32Array(top + 1);
      for (let k = 1; k <= state.n; k++) imag[wave.harmonic(k)] = wave.coeff(k);
      return this.ctx.createPeriodicWave(real, imag, { disableNormalization: true });
    },

    spawn() {
      const ctx = this.ctx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.setPeriodicWave(this.makeWave());
      osc.frequency.value = state.freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(1, t + FADE);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);

      const voice = { osc, gain };
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
        this.voices.delete(voice);
      };
      this.voices.add(voice);
      return voice;
    },

    retire(voice) {
      const t = this.ctx.currentTime;
      const g = voice.gain.gain;
      const now = g.value;
      g.cancelScheduledValues(t);
      g.setValueAtTime(now, t);
      g.linearRampToValueAtTime(0, t + FADE);
      voice.osc.stop(t + FADE + 0.02);
    },

    start() {
      const ctx = this.ensure();
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      const g = this.master.gain;
      const now = g.value;
      g.cancelScheduledValues(t);
      g.setValueAtTime(now, t);
      g.linearRampToValueAtTime(this.level(), t + 0.025);
      this.current = this.spawn();
      this.running = true;
    },

    stop() {
      if (!this.running) return;
      const t = this.ctx.currentTime;
      const g = this.master.gain;
      const now = g.value;
      g.cancelScheduledValues(t);
      g.setValueAtTime(now, t);
      g.linearRampToValueAtTime(0, t + FADE);
      this.retire(this.current);
      this.current = null;
      this.running = false;
    },

    // New coefficients: crossfade to a fresh voice so the change is click-free
    swapWave() {
      if (!this.running) return;
      const old = this.current;
      this.current = this.spawn();
      if (old) this.retire(old);
    },

    setFrequency(f) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.voices.forEach((v) => v.osc.frequency.setTargetAtTime(f, t, 0.015));
    },

    setVolume() {
      if (!this.running) return;
      this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.02);
    }
  };

  // Dragging a slider fires many events; swap at most about every 40 ms
  let swapTimer = null;
  let lastSwap = 0;
  function scheduleSwap() {
    if (!audio.running || swapTimer !== null) return;
    const wait = Math.max(0, 40 - (performance.now() - lastSwap));
    swapTimer = setTimeout(() => {
      swapTimer = null;
      lastSwap = performance.now();
      audio.swapWave();
    }, wait);
  }

  // ---- Drawing ------------------------------------------------------------

  function prepare(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return null;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { g: canvas.getContext('2d'), w, h, dpr };
  }

  function drawGraticule(g, w, h, dpr) {
    g.fillStyle = '#050805';
    g.fillRect(0, 0, w, h);

    const dx = w / SCOPE_DIVS_X;
    const dy = h / SCOPE_DIVS_Y;
    const cx = w / 2;
    const cy = h / 2;
    g.lineWidth = Math.max(1, Math.round(dpr));

    g.strokeStyle = 'rgba(29, 107, 51, 0.6)';
    g.beginPath();
    for (let i = 1; i < SCOPE_DIVS_X; i++) {
      const x = Math.round(i * dx) + 0.5;
      g.moveTo(x, 0);
      g.lineTo(x, h);
    }
    for (let j = 1; j < SCOPE_DIVS_Y; j++) {
      const y = Math.round(j * dy) + 0.5;
      g.moveTo(0, y);
      g.lineTo(w, y);
    }
    g.stroke();

    // Center axes with minor ticks (5 per division)
    g.strokeStyle = 'rgba(57, 255, 106, 0.4)';
    g.beginPath();
    g.moveTo(Math.round(cx) + 0.5, 0);
    g.lineTo(Math.round(cx) + 0.5, h);
    g.moveTo(0, Math.round(cy) + 0.5);
    g.lineTo(w, Math.round(cy) + 0.5);
    const tick = 4 * dpr;
    for (let i = 0; i <= SCOPE_DIVS_X * 5; i++) {
      const x = Math.round((i * dx) / 5) + 0.5;
      g.moveTo(x, cy - tick);
      g.lineTo(x, cy + tick);
    }
    for (let j = 0; j <= SCOPE_DIVS_Y * 5; j++) {
      const y = Math.round((j * dy) / 5) + 0.5;
      g.moveTo(cx - tick, y);
      g.lineTo(cx + tick, y);
    }
    g.stroke();
  }

  function drawScope() {
    const c = prepare(scopeCanvas);
    if (!c) return;
    const { g, w, h, dpr } = c;
    drawGraticule(g, w, h, dpr);

    const wave = WAVES[state.wave];
    const mid = h / 2;
    const unit = (h / SCOPE_DIVS_Y) * 3; // amplitude 1 = 3 divisions, so the 1.18 Gibbs peak still fits
    const step = Math.max(1, Math.round(dpr));

    const parts = [];
    for (let k = 1; k <= MAX_N; k++) {
      if (weights[k] > 0.001) parts.push([wave.harmonic(k), wave.coeff(k) * weights[k]]);
    }

    const target = new Path2D();
    const sum = new Path2D();
    for (let x = 0; x <= w; x += step) {
      const ph = ((x + 0.5) / w) * SCOPE_PERIODS * TWO_PI;
      const ty = mid - wave.target(ph) * unit;
      let s = 0;
      for (let i = 0; i < parts.length; i++) s += parts[i][1] * Math.sin(parts[i][0] * ph);
      const sy = mid - s * unit;
      if (x === 0) {
        target.moveTo(x, ty);
        sum.moveTo(x, sy);
      } else {
        target.lineTo(x, ty);
        sum.lineTo(x, sy);
      }
    }

    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(57, 255, 106, 0.07)';
    g.lineWidth = 6 * dpr;
    g.stroke(sum);
    g.strokeStyle = 'rgba(57, 255, 106, 0.2)';
    g.lineWidth = 3.5 * dpr;
    g.stroke(sum);
    g.strokeStyle = '#7dff9b';
    g.lineWidth = 2 * dpr;
    g.stroke(sum);

    // Target on top, so it stays visible where the sum converges onto it
    g.lineCap = 'butt';
    g.setLineDash([7 * dpr, 6 * dpr]);
    g.strokeStyle = 'rgba(255, 176, 0, 0.95)';
    g.lineWidth = 1.5 * dpr;
    g.stroke(target);
    g.setLineDash([]);
  }

  // ---- Spectrum chart -----------------------------------------------------

  // Amplitudes are relative to the fundamental (fundamental = 1), so every wave starts at the top
  function partial(k) {
    const wave = WAVES[state.wave];
    const n = wave.harmonic(k);
    const b = wave.coeff(k);
    const rel = Math.abs(b) / Math.abs(wave.coeff(1));
    return { k, n, b, rel, hz: n * state.freq, db: 20 * Math.log10(rel) };
  }

  const trimNum = (s) => (s.indexOf('.') >= 0 ? s.replace(/0+$/, '').replace(/\.$/, '') : s);

  function fmtDb(db, decimals) {
    const s = trimNum(db.toFixed(decimals)).replace('-', MINUS);
    return s === MINUS + '0' ? '0' : s;
  }

  // Exact bar value for the tooltip (keeps significant digits for the tiny triangle partials)
  const fmtRelFull = (v) => (v >= 0.01 ? trimNum(v.toFixed(3)) : String(+v.toPrecision(2)));

  function fmtCoeff(b) {
    const a = Math.abs(b);
    return (b < 0 ? MINUS : '') + (a >= 0.01 ? a.toFixed(3) : a.toFixed(4));
  }

  // The closed form for b_n, with its sign
  function coeffFormula(p) {
    if (state.wave === 'square') return p.n === 1 ? '4/π' : `4/(${p.n}π)`;
    if (state.wave === 'sawtooth') return (p.n % 2 === 0 ? MINUS : '') + (p.n === 1 ? '2/π' : `2/(${p.n}π)`);
    return (p.k % 2 === 0 ? MINUS : '') + (p.n === 1 ? '8/π²' : `8/(${p.n * p.n}π²)`);
  }

  function tipText(k) {
    const p = partial(k);
    let text = `n = ${p.n} · ${Math.round(p.hz)} Hz · amplitude ${fmtRelFull(p.rel)}`;
    if (state.scale === 'db') text += ` = ${fmtDb(p.db, 1)} dB`;
    text += ` (b_n = ${coeffFormula(p)} ≈ ${fmtCoeff(p.b)}${p.b < 0 ? '; negative sign' : ''})`;
    return text;
  }

  function spectrumGeometry(w, h, dpr) {
    const padL = 38 * dpr; // y-axis labels
    const padR = 10 * dpr;
    const padTop = 20 * dpr; // room for the label above the tallest bar
    const labelH = 20 * dpr; // x-axis labels
    const plotW = w - padL - padR;
    const plotH = h - padTop - labelH;
    const top = WAVES[state.wave].harmonic(MAX_N); // x-axis runs to the highest harmonic the slider can reach
    return { padL, padR, padTop, labelH, plotW, plotH, base: padTop + plotH, top, slot: plotW / top };
  }

  // Bar height as a fraction of the plot height
  function barFraction(rel) {
    if (state.scale !== 'db') return rel;
    const db = 20 * Math.log10(rel);
    return Math.min(1, Math.max(0, (db - SPEC_DB_FLOOR) / -SPEC_DB_FLOOR));
  }

  function drawSpectrum() {
    const c = prepare(spectrumCanvas);
    if (!c) return;
    const { g, w, h, dpr } = c;
    const wave = WAVES[state.wave];
    const db = state.scale === 'db';

    const { padL, padR, padTop, plotW, plotH, base, top, slot } = spectrumGeometry(w, h, dpr);
    const barW = Math.max(2 * dpr, Math.min(slot * 0.6, 14 * dpr));
    const line = Math.max(1, Math.round(dpr));

    g.fillStyle = '#050805';
    g.fillRect(0, 0, w, h);

    // Y axis: faint grid lines with labels (the bottom line is the baseline)
    const ticks = db
      ? [[1, '0 dB'], [2 / 3, MINUS + '20'], [1 / 3, MINUS + '40'], [0, MINUS + '60']]
      : [[1, '1.0'], [0.5, '0.5'], [0, '0']];
    g.lineWidth = line;
    g.font = `${10 * dpr}px "Share Tech Mono", monospace`;
    g.fillStyle = '#7fa88a';
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    ticks.forEach(([f, label]) => {
      const y = Math.round(base - plotH * f) + 0.5;
      g.strokeStyle = f === 0 ? 'rgba(29, 107, 51, 0.95)' : 'rgba(29, 107, 51, 0.35)';
      g.beginPath();
      g.moveTo(padL, y);
      g.lineTo(w - padR, y);
      g.stroke();
      g.fillText(label, padL - 6 * dpr, y);
    });
    g.strokeStyle = 'rgba(29, 107, 51, 0.6)';
    g.beginPath();
    g.moveTo(Math.round(padL) + 0.5, padTop);
    g.lineTo(Math.round(padL) + 0.5, base);
    g.stroke();

    // Column highlight behind the inspected bar
    if (inspect !== null) {
      const cx = padL + (wave.harmonic(inspect) - 0.5) * slot;
      const half = (slot * (wave.oddOnly ? 2 : 1)) / 2;
      g.fillStyle = 'rgba(57, 255, 106, 0.09)';
      g.fillRect(cx - half, padTop - 4 * dpr, half * 2, plotH + 4 * dpr);
    }

    const bars = [];
    for (let k = 1; k <= MAX_N; k++) {
      const n = wave.harmonic(k);
      const x = padL + (n - 0.5) * slot;
      const rel = Math.abs(wave.coeff(k)) / Math.abs(wave.coeff(1));
      const full = barFraction(rel) * plotH;
      const wgt = weights[k];
      let barTop = base;

      // Tick at n·f0 on the axis
      g.strokeStyle = 'rgba(57, 255, 106, 0.55)';
      g.beginPath();
      g.moveTo(Math.round(x) + 0.5, base);
      g.lineTo(Math.round(x) + 0.5, base + 4 * dpr);
      g.stroke();

      // Ghost outline: where the missing harmonics would stand
      if (wgt < 0.999 && full >= 1) {
        g.strokeStyle = `rgba(29, 107, 51, ${0.95 * (1 - wgt)})`;
        g.strokeRect(Math.round(x - barW / 2) + 0.5, base - full, barW, full);
      }

      if (wgt > 0.02) {
        const bh = Math.max(full * wgt, 1.5 * dpr);
        barTop = base - bh;
        g.fillStyle = 'rgba(34, 211, 238, 0.1)';
        g.fillRect(x - barW / 2 - 1 * dpr, base - bh - 1 * dpr, barW + 2 * dpr, bh + 1 * dpr);
        g.fillStyle = '#22d3ee';
        g.fillRect(x - barW / 2, base - bh, barW, bh);
        g.fillStyle = '#c9f6ff';
        g.fillRect(x - barW / 2, base - bh, barW, Math.min(2 * dpr, bh));
        bars.push({ k, x, barTop, rel, wgt });
      }

      if (k === inspect) {
        const ringH = Math.max(full, 3 * dpr);
        g.strokeStyle = '#c9f6ff';
        g.lineWidth = line;
        g.strokeRect(Math.round(x - barW / 2 - 2 * dpr) + 0.5, base - ringH - 2 * dpr, barW + 4 * dpr, ringH + 2 * dpr);
      }
    }

    drawBarLabels(g, bars, { dpr, slot, padL, w, db, oddOnly: wave.oddOnly });

    // Frequency labels (Hz) at n·f0, spaced so they never overlap
    const spacing = slot / dpr;
    let stepN = Math.ceil(64 / spacing);
    if (wave.oddOnly && stepN % 2 === 1) stepN++;
    g.font = `${11 * dpr}px "Share Tech Mono", monospace`;
    g.fillStyle = '#7fa88a';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    for (let n = 1; n <= top; n += stepN) {
      const x = padL + (n - 0.5) * slot;
      const text = Math.round(n * state.freq) + (n === 1 ? ' Hz' : '');
      const tw = g.measureText(text).width;
      const tx = Math.min(Math.max(x - tw / 2, padL), w - tw - 2 * dpr);
      g.fillText(text, tx, base + 7 * dpr);
    }
  }

  // Value above each included bar. Picks the roomiest layout that fits, and hides the labels
  // when the bars are too narrow (the tooltip shows the value instead):
  // one row, then two staggered rows; fewer decimals before giving up.
  function drawBarLabels(g, bars, o) {
    const { dpr, slot, padL, w, db, oddOnly } = o;
    g.font = `${10 * dpr}px "Share Tech Mono", monospace`;

    const samples = db ? ['\u221219.1', '\u221219'] : ['0.333', '0.33'];
    const decimals = db ? [1, 0] : [3, 2];
    const spacing = slot * (oddOnly ? 2 : 1); // distance between neighboring bars
    let plan = null;
    search:
    for (const stagger of [false, true]) {
      for (let i = 0; i < 2; i++) {
        if (g.measureText(samples[i]).width + 3 * dpr <= spacing * (stagger ? 2 : 1)) {
          plan = { dec: decimals[i], stagger };
          break search;
        }
      }
    }
    if (!plan) return;

    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    bars.forEach((b) => {
      const text = db ? fmtDb(20 * Math.log10(b.rel), plan.dec) : trimNum(b.rel.toFixed(plan.dec));
      const tw = g.measureText(text).width;
      const raise = plan.stagger && b.k % 2 === 0 ? 11 * dpr : 0;
      const x = Math.min(Math.max(b.x, padL + tw / 2), w - tw / 2 - 2 * dpr);
      const y = Math.max(b.barTop - 3 * dpr - raise, 11 * dpr);
      g.fillStyle = `rgba(125, 232, 252, ${Math.min(1, b.wgt)})`;
      g.fillText(text, x, y);
    });
  }

  function draw() {
    drawScope();
    drawSpectrum();
  }

  // Ease the displayed weights toward their targets; a single frame when nothing is moving
  let rafId = null;
  let lastFrame = 0;

  function stepWeights(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    const a = 1 - Math.exp(-dt / 0.07);
    let moving = false;
    for (let k = 1; k <= MAX_N; k++) {
      const goal = k <= state.n ? 1 : 0;
      const diff = goal - weights[k];
      if (Math.abs(diff) > 0.002) {
        weights[k] += diff * a;
        moving = true;
      } else {
        weights[k] = goal;
      }
    }
    draw();
    rafId = moving ? requestAnimationFrame(stepWeights) : null;
  }

  function requestRender() {
    if (motionQuery.matches) {
      for (let k = 1; k <= MAX_N; k++) weights[k] = k <= state.n ? 1 : 0;
      draw();
      return;
    }
    if (rafId === null) {
      lastFrame = performance.now();
      rafId = requestAnimationFrame(stepWeights);
    }
  }

  // ---- Readouts and controls ---------------------------------------------

  function updateReadouts() {
    const wave = WAVES[state.wave];
    const highest = wave.harmonic(state.n);
    const period = 1000 / state.freq;

    el.harmonicReadout.textContent = `N = ${state.n} harmonic${state.n === 1 ? '' : 's'}`;
    el.waveReadout.textContent = `${Math.round(state.freq)} Hz · ${wave.name}`;
    el.periodReadout.textContent = `${SCOPE_PERIODS} periods · T = ${period.toFixed(2)} ms`;
    el.spectrumTop.textContent = `Highest: ${highest === 1 ? 'f0' : highest + '·f0'} = ${Math.round(highest * state.freq)} Hz${highest * state.freq > 20000 ? ' (above hearing)' : ''}`;

    el.nOut.textContent = `N = ${state.n}`;
    el.freqOut.textContent = `${Math.round(state.freq)} Hz`;
    el.volOut.textContent = `${Math.round(state.volume * 100)}%`;

    el.n.setAttribute('aria-valuetext', `${state.n} harmonic${state.n === 1 ? '' : 's'}`);
    el.freq.setAttribute('aria-valuetext', `${Math.round(state.freq)} hertz`);
    el.vol.setAttribute('aria-valuetext', `${Math.round(state.volume * 100)} percent`);

    const label = `${wave.name.toLowerCase()} wave at ${Math.round(state.freq)} hertz: ideal wave as a dashed amber line, sum of the first ${state.n} harmonic${state.n === 1 ? '' : 's'} as a green trace`;
    scopeCanvas.setAttribute('aria-label', `Oscilloscope view of a ${label}`);
    spectrumCanvas.setAttribute('aria-label', `Bar chart of relative harmonic amplitudes (${state.scale === 'db' ? 'dB' : 'linear'} scale) for ${state.n} harmonic${state.n === 1 ? '' : 's'} of a ${wave.name.toLowerCase()} wave, highest at ${Math.round(highest * state.freq)} hertz`);
    renderTip();
  }

  function refresh() {
    updateReadouts();
    requestRender();
    scheduleSwap();
  }

  function updatePlayButton() {
    el.play.textContent = audio.running ? 'STOP' : 'RUN';
    el.play.classList.toggle('is-running', audio.running);
  }

  el.wave.addEventListener('change', () => {
    state.wave = el.wave.value;
    refresh();
  });

  el.n.addEventListener('input', () => {
    state.n = parseInt(el.n.value, 10);
    refresh();
  });

  el.freq.addEventListener('input', () => {
    state.freq = parseFloat(el.freq.value);
    updateReadouts();
    requestRender();
    audio.setFrequency(state.freq);
  });

  el.vol.addEventListener('input', () => {
    state.volume = parseFloat(el.vol.value);
    updateReadouts();
    audio.setVolume();
  });

  // ---- Spectrum inspection: hover, tap, or arrow keys -----------------------

  function renderTip() {
    const tip = el.specTip;
    if (inspect === null) {
      tip.hidden = true;
      return;
    }
    tip.textContent = tipText(inspect);
    tip.hidden = false;
    const rect = el.specDisplay.getBoundingClientRect();
    const geo = spectrumGeometry(rect.width, rect.height, 1);
    const x = geo.padL + (WAVES[state.wave].harmonic(inspect) - 0.5) * geo.slot;
    const left = Math.min(x - tip.offsetWidth / 2, rect.width - tip.offsetWidth);
    tip.style.left = `${Math.max(0, left)}px`;
  }

  function selectPartial(k, announce) {
    inspect = k;
    renderTip();
    drawSpectrum();
    if (announce) el.specLive.textContent = tipText(k);
  }

  function clearPartial() {
    if (inspect === null) return;
    inspect = null;
    renderTip();
    drawSpectrum();
  }

  // The bar nearest to the pointer, so the narrow bars are easy to hit
  function partialAt(clientX) {
    const rect = el.specDisplay.getBoundingClientRect();
    const geo = spectrumGeometry(rect.width, rect.height, 1);
    const wave = WAVES[state.wave];
    let best = 1;
    let bestDist = Infinity;
    for (let k = 1; k <= MAX_N; k++) {
      const dist = Math.abs(clientX - rect.left - (geo.padL + (wave.harmonic(k) - 0.5) * geo.slot));
      if (dist < bestDist) {
        bestDist = dist;
        best = k;
      }
    }
    return best;
  }

  el.specDisplay.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const k = partialAt(e.clientX);
    if (k !== inspect) selectPartial(k, false);
  });

  el.specDisplay.addEventListener('pointerdown', (e) => {
    selectPartial(partialAt(e.clientX), false);
  });

  el.specDisplay.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'touch' && document.activeElement !== el.specDisplay) clearPartial();
  });

  document.addEventListener('pointerdown', (e) => {
    if (!el.specDisplay.contains(e.target)) clearPartial();
  });

  el.specDisplay.addEventListener('focus', () => {
    selectPartial(inspect === null ? 1 : inspect, true);
  });

  el.specDisplay.addEventListener('blur', clearPartial);

  el.specDisplay.addEventListener('keydown', (e) => {
    let k = inspect === null ? 1 : inspect;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') k = Math.min(MAX_N, k + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') k = Math.max(1, k - 1);
    else if (e.key === 'Home') k = 1;
    else if (e.key === 'End') k = MAX_N;
    else if (e.key === 'Escape') {
      clearPartial();
      return;
    } else return;
    e.preventDefault();
    selectPartial(k, true);
  });

  function setScale(scale) {
    state.scale = scale;
    el.specLinear.setAttribute('aria-pressed', String(scale === 'linear'));
    el.specDb.setAttribute('aria-pressed', String(scale === 'db'));
    updateReadouts();
    drawSpectrum();
  }

  el.specLinear.addEventListener('click', () => setScale('linear'));
  el.specDb.addEventListener('click', () => setScale('db'));

  if (!AudioCtor) {
    el.play.disabled = true;
    el.play.title = 'Web Audio is not available in this browser';
  }

  // Silent until the user presses RUN: audio is only created inside this click
  el.play.addEventListener('click', () => {
    if (audio.running) {
      clearTimeout(swapTimer);
      swapTimer = null;
      audio.stop();
    } else {
      audio.start();
    }
    updatePlayButton();
  });

  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => requestRender());
    ro.observe(scopeCanvas);
    ro.observe(spectrumCanvas);
  } else {
    window.addEventListener('resize', requestRender);
  }

  if (motionQuery.addEventListener) motionQuery.addEventListener('change', requestRender);

  updateReadouts();
  updatePlayButton();
  draw();
  // Redraw once the label font is available
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
})();
