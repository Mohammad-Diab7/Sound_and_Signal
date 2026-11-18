// Sound & Signal — Filters page: Filter Lab
// One filter state drives four things: the Bode plot, the scope, the harmonic spectrum and the sound.
// The displays read BiquadFilterNode.getFrequencyResponse from a mirror of the audio filter cascade.

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const bodeCanvas = $('bodeCanvas');
  const scopeCanvas = $('filterScope');
  const specCanvas = $('filterSpectrum');
  if (!bodeCanvas || !scopeCanvas || !specCanvas) return;

  const F_MIN = 20;
  const F_MAX = 20000;
  const DB_MIN = -60;
  const DB_3 = -3.0103;
  const SAMPLE_RATE = 48000;
  const F0 = 220; // fundamental of the square and sawtooth sources
  const NH = 80; // harmonics in the source waveform (17.6 kHz at 220 Hz). Above this the browser's own oscillator band-limiting differs from the math.
  const SPEC_N = 50; // harmonics drawn in the spectrum
  const MAX_STAGES = 4; // 4 second-order stages = 8th order
  const SCOPE_PERIODS = 2;
  const NOISE_MS = 10;
  const SCOPE_DIVS_X = 10;
  const SCOPE_DIVS_Y = 8;
  const FADE = 0.03; // seconds; crossfades and start/stop ramps
  const TWO_PI = Math.PI * 2;
  const MINUS = '\u2212';
  const TYPE_NAMES = { lowpass: 'LOW-PASS', highpass: 'HIGH-PASS', bandpass: 'BAND-PASS' };

  // Sine-series coefficients b_n of each periodic source (same as the Sound Waves page)
  const SOURCES = {
    square: {
      label: 'SQUARE',
      periodic: true,
      coeff: (n) => (n % 2 === 1 ? 4 / (Math.PI * n) : 0),
      target: (ph) => (Math.sin(ph) >= 0 ? 1 : -1)
    },
    sawtooth: {
      label: 'SAWTOOTH',
      periodic: true,
      coeff: (n) => (n % 2 === 1 ? 1 : -1) * 2 / (Math.PI * n),
      target: (ph) => (((ph + Math.PI) % TWO_PI) - Math.PI) / Math.PI
    },
    noise: { label: 'WHITE NOISE', periodic: false }
  };

  // Butterworth Q of each second-order stage: -3 dB at fc for every order, flattest passband
  const butterworthQ = (order) =>
    Array.from({ length: order / 2 }, (_, k) => 1 / (2 * Math.cos(((2 * k + 1) * Math.PI) / (2 * order))));

  const el = {
    source: $('sourceSelect'),
    vol: $('filterVolume'),
    volOut: $('filterVolumeOut'),
    play: $('filterPlay'),
    bypass: $('bypassBtn'),
    bypassStatus: $('bypassStatus'),
    typeButtons: Array.from(document.querySelectorAll('[data-type]')),
    cutoff: $('cutoff'),
    cutoffOut: $('cutoffOut'),
    order: $('orderSelect'),
    q: $('qSlider'),
    qOut: $('qOut'),
    rcR: $('rcR'),
    rcRUnit: $('rcRUnit'),
    rcC: $('rcC'),
    rcCUnit: $('rcCUnit'),
    rcFcOut: $('rcFcOut'),
    rcSet: $('rcSet'),
    rcNote: $('rcNote'),
    bodeInfo: $('bodeInfo'),
    bodeSlope: $('bodeSlope'),
    bodeState: $('bodeState'),
    scopeSource: $('scopeSource'),
    scopeWindow: $('scopeWindow'),
    legendOut: $('legendOut'),
    specNote: $('specNote'),
    specHint: $('specHint'),
    specBox: $('filterSpectrumBox'),
    tip: $('filterTip'),
    live: $('filterLive')
  };

  const state = {
    source: el.source.value,
    type: 'lowpass',
    order: parseInt(el.order.value, 10),
    cutoff: 1000,
    q: parseFloat(el.q.value),
    volume: parseFloat(el.vol.value),
    bypass: false
  };

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  const OfflineCtor = window.OfflineAudioContext || window.webkitOfflineAudioContext;

  // ---- Formatting and mappings --------------------------------------------

  const posToHz = (v) => F_MIN * Math.pow(F_MAX / F_MIN, v / 1000);
  const hzToPos = (f) => Math.round((1000 * Math.log(f / F_MIN)) / Math.log(F_MAX / F_MIN));
  const trimNum = (s) => (s.indexOf('.') >= 0 ? s.replace(/0+$/, '').replace(/\.$/, '') : s);

  function fmtHz(f) {
    if (f >= 1e6) return `${(f / 1e6).toPrecision(3)} MHz`;
    if (f >= 10000) return `${(f / 1000).toFixed(1)} kHz`;
    if (f >= 1000) return `${(f / 1000).toFixed(2)} kHz`;
    if (f < 100) return `${f.toFixed(1)} Hz`;
    return `${Math.round(f)} Hz`;
  }

  function fmtValue(v) {
    if (v < 0.0005) return '≈ 0';
    return v >= 0.01 ? trimNum(v.toFixed(3)) : String(+v.toPrecision(2));
  }

  function fmtDb(db) {
    if (db < -100) return `below ${MINUS}100`;
    return trimNum(db.toFixed(1)).replace('-', MINUS);
  }

  // ---- Filter model (shared by the displays and the audio) ------------------

  // Settings of second-order stage i; stages beyond the order are 0 dB peaking filters (an exact bypass)
  function stageSpec(i) {
    if (i >= state.order / 2) return { type: 'peaking', frequency: 1000, q: 1, gain: 0 };
    if (state.type === 'bandpass') return { type: 'bandpass', frequency: state.cutoff, q: state.q, gain: 0 };
    // Low-pass and high-pass Q is in dB in Web Audio
    return { type: state.type, frequency: state.cutoff, q: 20 * Math.log10(butterworthQ(state.order)[i]), gain: 0 };
  }

  function applySpec(node, spec) {
    node.frequency.cancelScheduledValues(0);
    node.Q.cancelScheduledValues(0);
    node.type = spec.type;
    node.frequency.value = spec.frequency;
    node.Q.value = spec.q;
    node.gain.value = spec.gain;
  }

  // A mirror of the cascade on an offline context. It never makes sound, so the displays
  // work before RUN without starting a real AudioContext.
  let mirrorCtx = null;
  let mirrorRate = 0;
  let mirrorStages = [];

  function mirror() {
    const rate = audio.ctx ? audio.ctx.sampleRate : SAMPLE_RATE;
    if (!mirrorCtx || mirrorRate !== rate) {
      mirrorCtx = new OfflineCtor(1, 1, rate);
      mirrorRate = rate;
      mirrorStages = Array.from({ length: MAX_STAGES }, () => mirrorCtx.createBiquadFilter());
    }
    return mirrorStages;
  }

  // Gain and phase of the whole cascade at the given frequencies
  function cascade(freqs) {
    const stages = mirror();
    const mag = new Float32Array(freqs.length).fill(1);
    const phase = new Float32Array(freqs.length);
    const m = new Float32Array(freqs.length);
    const p = new Float32Array(freqs.length);
    for (let i = 0; i < state.order / 2; i++) {
      applySpec(stages[i], stageSpec(i));
      stages[i].getFrequencyResponse(freqs, m, p);
      for (let j = 0; j < freqs.length; j++) {
        mag[j] *= m[j];
        phase[j] += p[j];
      }
    }
    return { mag, phase };
  }

  const BODE_POINTS = 320;
  const BODE_FREQS = Float32Array.from({ length: BODE_POINTS }, (_, j) => F_MIN * Math.pow(F_MAX / F_MIN, j / (BODE_POINTS - 1)));
  const HARM_FREQS = Float32Array.from({ length: NH }, (_, j) => (j + 1) * F0);

  // Results the draw functions read
  const model = { bode: null, atCutoff: 1, harm: null, terms: [] };

  function recompute() {
    model.bode = cascade(BODE_FREQS);
    model.atCutoff = cascade(new Float32Array([state.cutoff])).mag[0];

    const src = SOURCES[state.source];
    model.harm = src.periodic ? cascade(HARM_FREQS) : null;
    model.terms = [];
    if (src.periodic) {
      for (let n = 1; n <= NH; n++) {
        const b = src.coeff(n);
        if (b === 0) continue;
        // What is heard: each harmonic scaled and shifted by the filter (or untouched when bypassed)
        model.terms.push([n, state.bypass ? b : b * model.harm.mag[n - 1], state.bypass ? 0 : model.harm.phase[n - 1]]);
      }
    }
  }

  // ---- Audio ----------------------------------------------------------------

  class Chain {
    constructor(ctx, input, dest) {
      this.stages = Array.from({ length: MAX_STAGES }, () => ctx.createBiquadFilter());
      this.out = ctx.createGain();
      this.out.gain.value = 0;
      input.connect(this.stages[0]);
      this.stages.forEach((s, i) => {
        if (i > 0) this.stages[i - 1].connect(s);
      });
      this.stages[MAX_STAGES - 1].connect(this.out);
      this.out.connect(dest);
    }

    // Immediate: set everything. Smooth: glide the active stages' cutoff and Q.
    configure(smoothFrom) {
      this.stages.forEach((node, i) => {
        const spec = stageSpec(i);
        if (smoothFrom === undefined) {
          applySpec(node, spec);
        } else if (i < state.order / 2) {
          node.frequency.setTargetAtTime(spec.frequency, smoothFrom, 0.02);
          node.Q.setTargetAtTime(spec.q, smoothFrom, 0.02);
        }
      });
    }
  }

  const audio = {
    ctx: null,
    master: null,
    bus: null,
    dry: null,
    wet: null,
    mix: null,
    inAn: null,
    outAn: null,
    chains: [],
    active: 0,
    voice: null,
    noiseBuffer: null,
    running: false,

    level() {
      return state.volume * 0.6; // headroom for resonant filters and Gibbs overshoot
    },

    ensure() {
      if (this.ctx) return this.ctx;
      let ctx;
      try {
        ctx = new AudioCtor({ sampleRate: SAMPLE_RATE });
      } catch (e) {
        ctx = new AudioCtor();
      }
      this.ctx = ctx;

      this.master = ctx.createGain();
      this.master.gain.value = this.level();
      this.master.connect(ctx.destination);

      this.mix = ctx.createGain();
      this.mix.connect(this.master);
      this.dry = ctx.createGain();
      this.dry.gain.value = state.bypass ? 1 : 0;
      this.dry.connect(this.mix);
      this.wet = ctx.createGain();
      this.wet.gain.value = state.bypass ? 0 : 1;
      this.wet.connect(this.mix);

      this.bus = ctx.createGain();
      this.bus.connect(this.dry);

      // Taps before the volume control, used by the noise scope
      this.inAn = ctx.createAnalyser();
      this.outAn = ctx.createAnalyser();
      this.inAn.fftSize = 2048;
      this.outAn.fftSize = 2048;
      this.bus.connect(this.inAn);
      this.mix.connect(this.outAn);

      this.chains = [new Chain(ctx, this.bus, this.wet), new Chain(ctx, this.bus, this.wet)];
      this.chains[0].configure();
      this.chains[0].out.gain.value = 1;
      this.chains[1].configure();
      return ctx;
    },

    makeSource() {
      const ctx = this.ctx;
      if (state.source === 'noise') {
        if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== ctx.sampleRate) {
          const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
          this.noiseBuffer = buf;
        }
        const node = ctx.createBufferSource();
        node.buffer = this.noiseBuffer;
        node.loop = true;
        return node;
      }
      // Same coefficients as the scope and spectrum use, so what you hear is what you see
      const src = SOURCES[state.source];
      const real = new Float32Array(NH + 1);
      const imag = new Float32Array(NH + 1);
      for (let n = 1; n <= NH; n++) imag[n] = src.coeff(n);
      const osc = ctx.createOscillator();
      osc.setPeriodicWave(ctx.createPeriodicWave(real, imag, { disableNormalization: true }));
      osc.frequency.value = F0;
      return osc;
    },

    spawn() {
      const ctx = this.ctx;
      const t = ctx.currentTime;
      const node = this.makeSource();
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1, t + FADE);
      node.connect(env);
      env.connect(this.bus);
      node.start(t);
      const voice = { node, env };
      node.onended = () => {
        node.disconnect();
        env.disconnect();
      };
      return voice;
    },

    retire(voice) {
      const t = this.ctx.currentTime;
      const g = voice.env.gain;
      const now = g.value;
      g.cancelScheduledValues(t);
      g.setValueAtTime(now, t);
      g.linearRampToValueAtTime(0, t + FADE);
      voice.node.stop(t + FADE + 0.02);
    },

    start() {
      const ctx = this.ensure();
      if (ctx.state === 'suspended') ctx.resume();
      this.voice = this.spawn();
      this.running = true;
    },

    stop() {
      if (!this.running) return;
      this.retire(this.voice);
      this.voice = null;
      this.running = false;
    },

    swapSource() {
      if (!this.running) return;
      const old = this.voice;
      this.voice = this.spawn();
      if (old) this.retire(old);
    },

    // Type or order changed: crossfade to the idle chain set up with the new stages (click-free)
    swapChain() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const from = this.chains[this.active];
      const to = this.chains[1 - this.active];
      to.configure();
      [[from, 0], [to, 1]].forEach(([chain, target]) => {
        const g = chain.out.gain;
        const now = g.value;
        g.cancelScheduledValues(t);
        g.setValueAtTime(now, t);
        g.linearRampToValueAtTime(target, t + FADE);
      });
      this.active = 1 - this.active;
    },

    // Cutoff or Q changed: glide
    glide() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.chains.forEach((chain) => chain.configure(t));
    },

    setVolume() {
      if (this.ctx) this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.02);
    },

    setBypass() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.dry.gain.setTargetAtTime(state.bypass ? 1 : 0, t, 0.01);
      this.wet.gain.setTargetAtTime(state.bypass ? 0 : 1, t, 0.01);
    }
  };

  // ---- Canvas helpers -------------------------------------------------------

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

  const glowStroke = (g, path, dpr, alpha) => {
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = `rgba(57, 255, 106, ${0.07 * alpha})`;
    g.lineWidth = 6 * dpr;
    g.stroke(path);
    g.strokeStyle = `rgba(57, 255, 106, ${0.2 * alpha})`;
    g.lineWidth = 3.5 * dpr;
    g.stroke(path);
    g.strokeStyle = `rgba(125, 255, 155, ${alpha})`;
    g.lineWidth = 2 * dpr;
    g.stroke(path);
  };

  // ---- Bode plot ------------------------------------------------------------

  function drawBode() {
    const c = prepare(bodeCanvas);
    if (!c || !model.bode) return;
    const { g, w, h, dpr } = c;
    const padL = 40 * dpr;
    const padR = 14 * dpr;
    const padT = 16 * dpr;
    const padB = 24 * dpr;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const base = padT + plotH;
    const line = Math.max(1, Math.round(dpr));
    const xOf = (f) => padL + (Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN)) * plotW;
    const yOf = (db) => padT + (Math.min(0, Math.max(DB_MIN, db)) / DB_MIN) * plotH;

    g.fillStyle = '#050805';
    g.fillRect(0, 0, w, h);
    g.lineWidth = line;

    // Vertical grid: decades are brighter and labeled
    const majors = [[20, '20'], [100, '100'], [1000, '1k'], [10000, '10k'], [20000, '20k']];
    g.strokeStyle = 'rgba(29, 107, 51, 0.3)';
    g.beginPath();
    [50, 200, 500, 2000, 5000].forEach((f) => {
      const x = Math.round(xOf(f)) + 0.5;
      g.moveTo(x, padT);
      g.lineTo(x, base);
    });
    g.stroke();
    g.strokeStyle = 'rgba(29, 107, 51, 0.7)';
    g.beginPath();
    majors.forEach(([f]) => {
      const x = Math.round(xOf(f)) + 0.5;
      g.moveTo(x, padT);
      g.lineTo(x, base);
    });
    g.stroke();

    // Horizontal grid every 10 dB; labels every 20 dB
    g.font = `${10 * dpr}px "Share Tech Mono", monospace`;
    g.fillStyle = '#7fa88a';
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    for (let db = 0; db >= DB_MIN; db -= 10) {
      const y = Math.round(yOf(db)) + 0.5;
      g.strokeStyle = db % 20 === 0 ? 'rgba(29, 107, 51, 0.7)' : 'rgba(29, 107, 51, 0.3)';
      g.beginPath();
      g.moveTo(padL, y);
      g.lineTo(w - padR, y);
      g.stroke();
      if (db % 20 === 0) g.fillText(db === 0 ? '0 dB' : MINUS + Math.abs(db), padL - 6 * dpr, y);
    }

    g.textAlign = 'center';
    g.textBaseline = 'top';
    majors.forEach(([f, label]) => {
      const tw = g.measureText(label).width;
      const x = Math.min(Math.max(xOf(f), padL + tw / 2), w - padR - tw / 2 + 4 * dpr);
      g.fillText(label, x, base + 7 * dpr);
    });

    // Response curve
    const db = Array.from(model.bode.mag, (m) => 20 * Math.log10(Math.max(m, 1e-6)));
    const curve = new Path2D();
    BODE_FREQS.forEach((f, j) => {
      const x = xOf(f);
      const y = yOf(db[j]);
      if (j === 0) curve.moveTo(x, y);
      else curve.lineTo(x, y);
    });

    if (state.bypass) {
      // The filter is out of the path: dim reference curve, flat line is what you hear
      g.setLineDash([]);
      g.strokeStyle = 'rgba(57, 255, 106, 0.25)';
      g.lineWidth = 1.5 * dpr;
      g.stroke(curve);
      const flat = new Path2D();
      flat.moveTo(padL, yOf(0));
      flat.lineTo(w - padR, yOf(0));
      glowStroke(g, flat, dpr, 1);
    } else {
      glowStroke(g, curve, dpr, 1);
    }

    // fc marker (dashed amber) and the -3 dB level with its crossing points
    const fcX = xOf(state.cutoff);
    const y3 = yOf(DB_3);
    g.save();
    g.strokeStyle = 'rgba(255, 176, 0, 0.35)';
    g.lineWidth = line;
    g.setLineDash([2 * dpr, 4 * dpr]);
    g.beginPath();
    g.moveTo(padL, Math.round(y3) + 0.5);
    g.lineTo(w - padR, Math.round(y3) + 0.5);
    g.stroke();
    g.strokeStyle = 'rgba(255, 176, 0, 0.95)';
    g.lineWidth = 1.5 * dpr;
    g.setLineDash([7 * dpr, 5 * dpr]);
    g.beginPath();
    g.moveTo(fcX, padT);
    g.lineTo(fcX, base);
    g.stroke();
    g.restore();

    const marks = [];
    if (state.type === 'bandpass') {
      for (let j = 1; j < BODE_POINTS; j++) {
        if ((db[j - 1] - DB_3) * (db[j] - DB_3) < 0) {
          const t = (DB_3 - db[j - 1]) / (db[j] - db[j - 1]);
          marks.push(BODE_FREQS[j - 1] * Math.pow(BODE_FREQS[j] / BODE_FREQS[j - 1], t));
        }
      }
      if (marks.length > 2) marks.splice(1, marks.length - 2);
    } else {
      marks.push(state.cutoff);
    }

    if (!state.bypass) {
      g.fillStyle = '#ffb000';
      marks.forEach((f) => {
        g.beginPath();
        g.arc(xOf(f), y3, 4 * dpr, 0, TWO_PI);
        g.fill();
      });
      if (marks.length) {
        const mx = xOf(marks[0]);
        const right = mx < w * 0.7;
        g.font = `${10 * dpr}px "Share Tech Mono", monospace`;
        g.textAlign = right ? 'left' : 'right';
        g.textBaseline = 'top';
        g.fillText(MINUS + '3 dB', mx + (right ? 8 : -8) * dpr, y3 + 6 * dpr);
      }
    }

    const fcLabel = `${state.type === 'bandpass' ? 'center' : 'fc'} ${fmtHz(state.cutoff)}`;
    g.font = `${10 * dpr}px "Share Tech Mono", monospace`;
    g.fillStyle = '#ffb000';
    g.textBaseline = 'top';
    const labelRight = fcX < w * 0.72;
    g.textAlign = labelRight ? 'left' : 'right';
    g.fillText(fcLabel, fcX + (labelRight ? 6 : -6) * dpr, padT + 4 * dpr);
  }

  // ---- Scope ----------------------------------------------------------------

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

  const noiseIn = new Float32Array(2048);
  const noiseOut = new Float32Array(2048);

  function drawScope() {
    const c = prepare(scopeCanvas);
    if (!c) return;
    const { g, w, h, dpr } = c;
    drawGraticule(g, w, h, dpr);

    const src = SOURCES[state.source];
    const mid = h / 2;
    const unit = (h / SCOPE_DIVS_Y) * 3; // amplitude 1 = 3 divisions
    const step = Math.max(1, Math.round(dpr));
    const input = new Path2D();
    const output = new Path2D();

    if (src.periodic) {
      // Steady state: ideal input, and the output as the sum of the filtered harmonics
      const terms = model.terms;
      for (let x = 0; x <= w; x += step) {
        const ph = ((x + 0.5) / w) * SCOPE_PERIODS * TWO_PI;
        let s = 0;
        for (let i = 0; i < terms.length; i++) s += terms[i][1] * Math.sin(terms[i][0] * ph + terms[i][2]);
        const yi = mid - src.target(ph) * unit;
        const yo = mid - s * unit;
        if (x === 0) {
          input.moveTo(x, yi);
          output.moveTo(x, yo);
        } else {
          input.lineTo(x, yi);
          output.lineTo(x, yo);
        }
      }
    } else if (audio.running && audio.ctx) {
      // Noise has no fixed shape, so show the live signal: the latest 10 ms from the analysers
      audio.inAn.getFloatTimeDomainData(noiseIn);
      audio.outAn.getFloatTimeDomainData(noiseOut);
      const need = Math.round((NOISE_MS / 1000) * audio.ctx.sampleRate);
      const off = noiseIn.length - need;
      for (let x = 0; x <= w; x += step) {
        const idx = off + Math.min(need - 1, Math.floor((x / w) * need));
        const yi = mid - noiseIn[idx] * unit;
        const yo = mid - noiseOut[idx] * unit;
        if (x === 0) {
          input.moveTo(x, yi);
          output.moveTo(x, yo);
        } else {
          input.lineTo(x, yi);
          output.lineTo(x, yo);
        }
      }
    } else {
      input.moveTo(0, mid);
      input.lineTo(w, mid);
      output.moveTo(0, mid);
      output.lineTo(w, mid);
    }

    glowStroke(g, output, dpr, 1);
    g.lineCap = 'butt';
    g.setLineDash([7 * dpr, 6 * dpr]);
    g.strokeStyle = 'rgba(255, 176, 0, 0.85)';
    g.lineWidth = 1.5 * dpr;
    g.stroke(input);
    g.setLineDash([]);

    if (!src.periodic && !audio.running) {
      g.font = `${11 * dpr}px "Share Tech Mono", monospace`;
      g.fillStyle = '#7fa88a';
      g.textAlign = 'center';
      g.textBaseline = 'bottom';
      g.fillText('Press RUN to see the noise', w / 2, mid - 10 * dpr);
    }
  }

  // Noise moves, so the scope redraws every frame while it plays (once per change under reduced motion)
  let scopeRaf = null;
  function scopeFrame() {
    scopeRaf = null;
    drawScope();
    if (audio.running && state.source === 'noise' && !motionQuery.matches) scopeRaf = requestAnimationFrame(scopeFrame);
  }

  function refreshNoiseScope() {
    if (state.source !== 'noise' || !audio.running) return;
    if (motionQuery.matches) setTimeout(drawScope, 150);
    else if (scopeRaf === null) scopeRaf = requestAnimationFrame(scopeFrame);
  }

  // ---- Spectrum -------------------------------------------------------------

  function partialList() {
    const src = SOURCES[state.source];
    const list = [];
    if (!src.periodic) return list;
    for (let n = 1; n <= SPEC_N; n++) if (src.coeff(n) !== 0) list.push(n);
    return list;
  }

  const gainAt = (n) => (state.bypass || !model.harm ? 1 : model.harm.mag[n - 1]);

  function specGeometry(w, h, dpr) {
    const padL = 38 * dpr;
    const padR = 10 * dpr;
    const padT = 12 * dpr;
    const padB = 22 * dpr;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    return { padL, padR, padT, padB, plotW, plotH, base: padT + plotH, slot: plotW / SPEC_N };
  }

  let inspectN = null; // harmonic number under hover, tap or keyboard

  function drawSpectrum() {
    const c = prepare(specCanvas);
    if (!c) return;
    const { g, w, h, dpr } = c;
    const { padL, padR, padT, plotH, base, slot } = specGeometry(w, h, dpr);
    const line = Math.max(1, Math.round(dpr));

    g.fillStyle = '#050805';
    g.fillRect(0, 0, w, h);

    if (!SOURCES[state.source].periodic) {
      g.font = `${11 * dpr}px "Share Tech Mono", monospace`;
      g.fillStyle = '#7fa88a';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('White noise has energy at every frequency,', w / 2, h / 2 - 9 * dpr);
      g.fillText('so there are no harmonic bars to show.', w / 2, h / 2 + 9 * dpr);
      return;
    }

    // Y axis: relative amplitude, input fundamental = 1
    g.lineWidth = line;
    g.font = `${10 * dpr}px "Share Tech Mono", monospace`;
    g.fillStyle = '#7fa88a';
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    [[1, '1.0'], [0.5, '0.5'], [0, '0']].forEach(([f, label]) => {
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
    g.moveTo(Math.round(padL) + 0.5, padT);
    g.lineTo(Math.round(padL) + 0.5, base);
    g.stroke();

    const partials = partialList();
    const barW = Math.max(2 * dpr, Math.min(slot * 0.6, 14 * dpr));
    const oddOnly = state.source === 'square';

    if (inspectN !== null) {
      const cx = padL + (inspectN - 0.5) * slot;
      const half = (slot * (oddOnly ? 2 : 1)) / 2;
      g.fillStyle = 'rgba(57, 255, 106, 0.09)';
      g.fillRect(cx - half, padT - 4 * dpr, half * 2, plotH + 4 * dpr);
    }

    partials.forEach((n) => {
      const x = padL + (n - 0.5) * slot;
      const inH = (1 / n) * plotH; // relative to the input fundamental
      const outH = Math.max((1 / n) * gainAt(n) * plotH, 0);

      g.strokeStyle = 'rgba(57, 255, 106, 0.55)';
      g.beginPath();
      g.moveTo(Math.round(x) + 0.5, base);
      g.lineTo(Math.round(x) + 0.5, base + 4 * dpr);
      g.stroke();

      // Input: dim outline
      g.strokeStyle = 'rgba(29, 107, 51, 0.95)';
      g.strokeRect(Math.round(x - barW / 2) + 0.5, base - inH, barW, inH);

      // Output: bright bar (a hairline at the base when the filter removes it)
      if (outH > 0.4 * dpr) {
        g.fillStyle = 'rgba(34, 211, 238, 0.1)';
        g.fillRect(x - barW / 2 - 1 * dpr, base - outH - 1 * dpr, barW + 2 * dpr, outH + 1 * dpr);
        g.fillStyle = '#22d3ee';
        g.fillRect(x - barW / 2, base - outH, barW, outH);
        g.fillStyle = '#c9f6ff';
        g.fillRect(x - barW / 2, base - outH, barW, Math.min(2 * dpr, outH));
      }

      if (n === inspectN) {
        g.strokeStyle = '#c9f6ff';
        g.strokeRect(Math.round(x - barW / 2 - 2 * dpr) + 0.5, base - inH - 2 * dpr, barW + 4 * dpr, inH + 2 * dpr);
      }
    });

    // Frequency labels at n·f0, spaced so they never overlap
    let stepN = Math.ceil(64 / (slot / dpr));
    if (oddOnly && stepN % 2 === 1) stepN++;
    g.font = `${11 * dpr}px "Share Tech Mono", monospace`;
    g.fillStyle = '#7fa88a';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    for (let n = 1; n <= SPEC_N; n += stepN) {
      const x = padL + (n - 0.5) * slot;
      const text = n * F0 + (n === 1 ? ' Hz' : '');
      const tw = g.measureText(text).width;
      g.fillText(text, Math.min(Math.max(x - tw / 2, padL), w - tw - 2 * dpr), base + 7 * dpr);
    }
  }

  // ---- Spectrum inspection: hover, tap, or arrow keys -------------------------

  function tipText(n) {
    const rel = 1 / n;
    const gain = gainAt(n);
    const filt = state.bypass ? 'filter bypassed' : `filter gain ${fmtValue(gain)} = ${fmtDb(20 * Math.log10(Math.max(gain, 1e-9)))} dB`;
    return `n = ${n} · ${n * F0} Hz · input ${fmtValue(rel)} · output ${fmtValue(rel * gain)} (${filt})`;
  }

  function renderTip() {
    const tip = el.tip;
    if (inspectN === null) {
      tip.hidden = true;
      return;
    }
    tip.textContent = tipText(inspectN);
    tip.hidden = false;
    const rect = el.specBox.getBoundingClientRect();
    const geo = specGeometry(rect.width, rect.height, 1);
    const x = geo.padL + (inspectN - 0.5) * geo.slot;
    const left = Math.min(x - tip.offsetWidth / 2, rect.width - tip.offsetWidth);
    tip.style.left = `${Math.max(0, left)}px`;
  }

  function selectPartial(n, announce) {
    inspectN = n;
    renderTip();
    drawSpectrum();
    if (announce) el.live.textContent = tipText(n);
  }

  function clearPartial() {
    if (inspectN === null) return;
    inspectN = null;
    renderTip();
    drawSpectrum();
  }

  function partialAt(clientX) {
    const list = partialList();
    if (!list.length) return null;
    const rect = el.specBox.getBoundingClientRect();
    const geo = specGeometry(rect.width, rect.height, 1);
    let best = list[0];
    let bestDist = Infinity;
    list.forEach((n) => {
      const dist = Math.abs(clientX - rect.left - (geo.padL + (n - 0.5) * geo.slot));
      if (dist < bestDist) {
        bestDist = dist;
        best = n;
      }
    });
    return best;
  }

  el.specBox.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const n = partialAt(e.clientX);
    if (n !== null && n !== inspectN) selectPartial(n, false);
  });

  el.specBox.addEventListener('pointerdown', (e) => {
    const n = partialAt(e.clientX);
    if (n !== null) selectPartial(n, false);
  });

  el.specBox.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'touch' && document.activeElement !== el.specBox) clearPartial();
  });

  document.addEventListener('pointerdown', (e) => {
    if (!el.specBox.contains(e.target)) clearPartial();
  });

  el.specBox.addEventListener('focus', () => {
    const list = partialList();
    if (list.length) selectPartial(inspectN === null ? list[0] : inspectN, true);
  });

  el.specBox.addEventListener('blur', clearPartial);

  el.specBox.addEventListener('keydown', (e) => {
    const list = partialList();
    if (!list.length) return;
    let i = inspectN === null ? 0 : Math.max(0, list.indexOf(inspectN));
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') i = Math.min(list.length - 1, i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') i = Math.max(0, i - 1);
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = list.length - 1;
    else if (e.key === 'Escape') {
      clearPartial();
      return;
    } else return;
    e.preventDefault();
    selectPartial(list[i], true);
  });

  // ---- Readouts and drawing ---------------------------------------------------

  function updateReadouts() {
    const src = SOURCES[state.source];
    const isBand = state.type === 'bandpass';

    el.cutoffOut.textContent = fmtHz(state.cutoff);
    el.qOut.textContent = `Q = ${state.q.toFixed(1)}`;
    el.volOut.textContent = `${Math.round(state.volume * 100)}%`;
    el.cutoff.setAttribute('aria-valuetext', `${fmtHz(state.cutoff).replace('kHz', 'kilohertz').replace('Hz', 'hertz')}`);
    el.q.setAttribute('aria-valuetext', `Q ${state.q.toFixed(1)}`);
    el.vol.setAttribute('aria-valuetext', `${Math.round(state.volume * 100)} percent`);

    el.bodeInfo.textContent = `${TYPE_NAMES[state.type]} · ${isBand ? 'center' : 'fc'} ${fmtHz(state.cutoff)}${isBand ? ' · Q ' + state.q.toFixed(1) : ''} · order ${state.order}`;
    el.bodeSlope.textContent = isBand
      ? `Skirts: ${MINUS}${3 * state.order} dB/octave each side`
      : `Roll-off: ${MINUS}${6 * state.order} dB/octave (${MINUS}${20 * state.order} dB/decade)`;
    el.bodeState.textContent = state.bypass ? 'BYPASSED: flat line is what you hear' : '';

    el.scopeSource.textContent = src.periodic ? `${F0} Hz · ${src.label}` : src.label;
    el.scopeWindow.textContent = src.periodic
      ? `${SCOPE_PERIODS} periods · ${((SCOPE_PERIODS * 1000) / F0).toFixed(2)} ms`
      : `${NOISE_MS} ms window`;
    el.legendOut.textContent = state.bypass ? 'output (bypassed, same as input)' : 'output';
    el.specNote.textContent = src.periodic ? 'harmonics at n·f0' : 'periodic sources only';
    el.specHint.hidden = !src.periodic;

    el.bypassStatus.textContent = state.bypass
      ? 'Filter bypassed: you hear the original sound.'
      : 'Filter in the signal path.';
    el.bypass.setAttribute('aria-pressed', String(state.bypass));

    el.specBox.setAttribute('tabindex', src.periodic ? '0' : '-1');
    el.specBox.setAttribute('aria-label', src.periodic
      ? 'Harmonic amplitudes before and after the filter. Use the left and right arrow keys to inspect each harmonic.'
      : 'No harmonic bars for white noise');

    const filterName = `${TYPE_NAMES[state.type].toLowerCase()} filter, ${isBand ? 'center' : 'cutoff'} ${fmtHz(state.cutoff)}, order ${state.order}`;
    bodeCanvas.setAttribute('aria-label', `Bode magnitude plot of a ${filterName}. ${el.bodeSlope.textContent}.`);
    scopeCanvas.setAttribute('aria-label', `Oscilloscope view: input as a dashed amber line and output as a green trace for a ${src.label.toLowerCase()} through a ${filterName}`);
    specCanvas.setAttribute('aria-label', src.periodic
      ? `Bar chart of harmonic amplitudes: input outlines and output bars for a ${src.label.toLowerCase()} through a ${filterName}`
      : 'No harmonic bars for white noise');
    renderTip();
  }

  function drawAll() {
    drawBode();
    drawScope();
    drawSpectrum();
    refreshNoiseScope();
  }

  let drawPending = false;
  function requestDraw() {
    if (drawPending) return;
    drawPending = true;
    requestAnimationFrame(() => {
      drawPending = false;
      recompute();
      drawAll();
    });
  }

  // ---- Controls ----------------------------------------------------------------

  function setType(type) {
    state.type = type;
    el.typeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === type)));
    el.q.disabled = type !== 'bandpass';
    audio.swapChain();
    updateReadouts();
    requestDraw();
  }

  el.typeButtons.forEach((b) => b.addEventListener('click', () => setType(b.dataset.type)));

  el.order.addEventListener('change', () => {
    state.order = parseInt(el.order.value, 10);
    audio.swapChain();
    updateReadouts();
    requestDraw();
  });

  function setCutoff(hz) {
    state.cutoff = Math.min(F_MAX, Math.max(F_MIN, hz));
    audio.glide();
    updateReadouts();
    requestDraw();
  }

  el.cutoff.addEventListener('input', () => setCutoff(posToHz(parseFloat(el.cutoff.value))));

  el.q.addEventListener('input', () => {
    state.q = parseFloat(el.q.value);
    audio.glide();
    updateReadouts();
    requestDraw();
  });

  el.vol.addEventListener('input', () => {
    state.volume = parseFloat(el.vol.value);
    audio.setVolume();
    updateReadouts();
  });

  el.source.addEventListener('change', () => {
    state.source = el.source.value;
    inspectN = null;
    el.live.textContent = '';
    audio.swapSource();
    updateReadouts();
    requestDraw();
  });

  el.bypass.addEventListener('click', () => {
    state.bypass = !state.bypass;
    audio.setBypass();
    updateReadouts();
    requestDraw();
  });

  if (!AudioCtor) {
    el.play.disabled = true;
    el.play.title = 'Web Audio is not available in this browser';
  }

  function updatePlayButton() {
    el.play.textContent = audio.running ? 'STOP' : 'RUN';
    el.play.classList.toggle('is-running', audio.running);
  }

  // Silent until the user presses RUN: the AudioContext is only created inside this click
  el.play.addEventListener('click', () => {
    if (audio.running) audio.stop();
    else audio.start();
    updatePlayButton();
    drawScope();
    refreshNoiseScope();
  });

  // ---- RC calculator --------------------------------------------------------------

  function rcCutoff() {
    const r = parseFloat(el.rcR.value) * parseFloat(el.rcRUnit.value);
    const c = parseFloat(el.rcC.value) * parseFloat(el.rcCUnit.value);
    if (!(r > 0 && c > 0) || !isFinite(r * c)) return null;
    return 1 / (TWO_PI * r * c);
  }

  const DEFAULT_RC_NOTE = el.rcNote.textContent;

  function updateRc() {
    const fc = rcCutoff();
    el.rcSet.disabled = fc === null;
    if (fc === null) {
      el.rcFcOut.textContent = '—';
      el.rcNote.textContent = 'Enter a resistance and a capacitance above zero.';
      return;
    }
    el.rcFcOut.textContent = fmtHz(fc);
    el.rcNote.textContent = fc < F_MIN || fc > F_MAX
      ? 'Outside 20 Hz to 20 kHz: SET CUTOFF will clamp the value.'
      : DEFAULT_RC_NOTE;
  }

  ['input', 'change'].forEach((evt) => {
    [el.rcR, el.rcC, el.rcRUnit, el.rcCUnit].forEach((node) => node.addEventListener(evt, updateRc));
  });

  el.rcSet.addEventListener('click', () => {
    const fc = rcCutoff();
    if (fc === null) return;
    const applied = Math.min(F_MAX, Math.max(F_MIN, fc));
    el.cutoff.value = String(hzToPos(applied));
    setCutoff(applied);
    el.rcNote.textContent = applied === fc
      ? `Cutoff set to ${fmtHz(applied)}.`
      : `Cutoff set to ${fmtHz(applied)} (clamped from ${fmtHz(fc)}).`;
  });

  // ---- Start ----------------------------------------------------------------------

  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => requestDraw());
    [bodeCanvas, scopeCanvas, specCanvas].forEach((cv) => ro.observe(cv));
  } else {
    window.addEventListener('resize', requestDraw);
  }

  if (motionQuery.addEventListener) {
    motionQuery.addEventListener('change', () => {
      if (!motionQuery.matches) refreshNoiseScope();
    });
  }

  updateRc();
  updateReadouts();
  updatePlayButton();
  recompute();
  drawAll();
  // Redraw once the label font is available
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawAll);
})();
