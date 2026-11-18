// Sound & Signal — Tone Generator (Web Audio API) with a triggered oscilloscope view

const WAVE_NAMES = {
  sine: 'SINE',
  square: 'SQUARE',
  sawtooth: 'SAWTOOTH',
  triangle: 'TRIANGLE'
};

// Fixed time base, like a real scope: the visible window is SCOPE_DIVS_X divisions of TIME/DIV.
// It only changes when the user picks another TIME/DIV; the frequency never rescales it.
const SCOPE_DIVS_X = 10;
const SCOPE_DIVS_Y = 8;

class ToneGenerator {
  constructor() {
    this.audioContext = null;
    this.oscillator = null;
    this.gainNode = null;
    this.analyser = null;
    this.timeData = null;
    this.isPlaying = false;
    this.frequency = 440; // A4 note
    this.waveType = 'sine';
    this.volume = 0.3;
    this.timeDivMs = 1; // TIME/DIV in ms
    this.scopeRaf = null;
  }

  init() {
    if (this.audioContext === null) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (this.analyser === null) {
      this.analyser = this.audioContext.createAnalyser();
      // 32768 samples is about 680 ms at 48 kHz, far more than the 50 ms (5 ms/div) maximum window
      this.analyser.fftSize = 32768;
      this.timeData = new Float32Array(this.analyser.fftSize);
    }
  }

  start() {
    if (this.isPlaying) return;

    this.init();

    // Browsers start the context suspended until a user gesture
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;

    this.oscillator = this.audioContext.createOscillator();
    this.oscillator.type = this.waveType;
    this.oscillator.frequency.value = this.frequency;

    // Short fade-in avoids a click
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.setValueAtTime(0, now);
    this.gainNode.gain.linearRampToValueAtTime(this.volume, now + 0.02);

    // The scope probes the raw oscillator, so the trace uses the full screen height at any volume.
    this.oscillator.connect(this.analyser);
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.oscillator.start(now);
    this.isPlaying = true;

    this.updatePlayButton();
    this.requestScopeFrame();
  }

  stop() {
    if (!this.isPlaying) return;

    const now = this.audioContext.currentTime;
    const osc = this.oscillator;
    const gain = this.gainNode;

    // Short fade-out avoids a click
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.03);
    osc.stop(now + 0.04);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };

    this.oscillator = null;
    this.gainNode = null;
    this.isPlaying = false;

    this.updatePlayButton();
    this.requestScopeFrame();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
  }

  setFrequency(freq) {
    this.frequency = freq;
    if (this.oscillator && this.isPlaying) {
      this.oscillator.frequency.setTargetAtTime(freq, this.audioContext.currentTime, 0.01);
    }
    this.updateScopeLabel();
  }

  setWaveType(type) {
    this.waveType = type;
    if (this.oscillator && this.isPlaying) {
      this.oscillator.type = type;
    }
    this.updateScopeLabel();
  }

  setVolume(vol) {
    this.volume = vol;
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(vol, this.audioContext.currentTime, 0.015);
    }
  }

  updatePlayButton() {
    const button = document.getElementById('playButton');
    if (button) {
      button.textContent = this.isPlaying ? 'STOP' : 'RUN';
      button.classList.toggle('is-running', this.isPlaying);
    }
  }

  updateScopeLabel() {
    const label = document.getElementById('scopeFreq');
    if (label) {
      label.textContent = `${Math.round(this.frequency)} Hz · ${WAVE_NAMES[this.waveType]}`;
    }
    const timeLabel = document.getElementById('scopeTimeDiv');
    if (timeLabel) {
      timeLabel.textContent = `${this.timeDivMs} ms/div`;
    }
    const periodLabel = document.getElementById('scopePeriod');
    if (periodLabel) {
      periodLabel.textContent = `T = ${(1000 / this.frequency).toFixed(2)} ms`;
    }
  }

  setTimeDiv(ms) {
    this.timeDivMs = ms;
    this.updateScopeLabel();
    this.requestScopeFrame();
  }

  // ---- Oscilloscope -------------------------------------------------------

  attachScope(canvasId) {
    this.scopeCanvas = document.getElementById(canvasId);
    if (!this.scopeCanvas) return;
    window.addEventListener('resize', () => this.requestScopeFrame());
    this.updateScopeLabel();
    this.requestScopeFrame();
  }

  // One render loop that runs only while playing; a stopped scope draws a single flat-line frame.
  requestScopeFrame() {
    if (this.scopeRaf !== null || !this.scopeCanvas) return;
    this.scopeRaf = requestAnimationFrame(() => {
      this.scopeRaf = null;
      this.renderScope();
      if (this.isPlaying) this.requestScopeFrame();
    });
  }

  renderScope() {
    const canvas = this.scopeCanvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const g = canvas.getContext('2d');
    this.drawGraticule(g, w, h, dpr);

    const mid = h / 2;
    const halfSpan = h * 0.42;
    const trace = new Path2D();
    const step = Math.max(1, Math.round(dpr));

    if (this.isPlaying && this.analyser) {
      this.analyser.getFloatTimeDomainData(this.timeData);
      const win = this.findTriggeredWindow();
      for (let x = 0; x <= w; x += step) {
        const pos = win.start + (x / w) * win.span;
        const y = mid - this.sampleAt(pos) * halfSpan;
        if (x === 0) trace.moveTo(x, y);
        else trace.lineTo(x, y);
      }
    } else {
      trace.moveTo(0, mid);
      trace.lineTo(w, mid);
    }

    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.globalAlpha = this.isPlaying ? 1 : 0.6;

    g.strokeStyle = 'rgba(57, 255, 106, 0.07)';
    g.lineWidth = 6 * dpr;
    g.stroke(trace);
    g.strokeStyle = 'rgba(57, 255, 106, 0.2)';
    g.lineWidth = 3.5 * dpr;
    g.stroke(trace);
    g.strokeStyle = '#7dff9b';
    g.lineWidth = 2 * dpr;
    g.stroke(trace);

    g.globalAlpha = 1;
  }

  drawGraticule(g, w, h, dpr) {
    g.fillStyle = '#050805';
    g.fillRect(0, 0, w, h);

    const dx = w / SCOPE_DIVS_X;
    const dy = h / SCOPE_DIVS_Y;
    const cx = w / 2;
    const cy = h / 2;
    const line = Math.max(1, Math.round(dpr));

    g.lineWidth = line;
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

  // Trigger: start the sweep at the most recent rising zero-crossing so the wave stands still.
  // Returns a fractional start index and the window span in samples (10 divisions of TIME/DIV).
  findTriggeredWindow() {
    const buf = this.timeData;
    const n = buf.length;
    const sampleRate = this.audioContext.sampleRate;
    const period = sampleRate / this.frequency;
    const span = Math.min((SCOPE_DIVS_X * this.timeDivMs * sampleRate) / 1000, n - 8);
    const last = Math.floor(n - span - 4);
    const first = Math.max(1, last - Math.ceil(period * 2));

    for (let i = last; i >= first; i--) {
      if (buf[i - 1] < 0 && buf[i] >= 0) {
        // Sub-sample interpolation keeps the trigger point steady at high pitches
        const frac = -buf[i - 1] / (buf[i] - buf[i - 1]);
        return { start: i - 1 + frac, span };
      }
    }
    return { start: Math.max(1, last), span };
  }

  // Catmull-Rom interpolation so a few samples per cycle still draw a smooth curve
  sampleAt(pos) {
    const buf = this.timeData;
    const n = buf.length;
    const i = Math.floor(pos);
    const f = pos - i;
    const p0 = buf[Math.max(i - 1, 0)];
    const p1 = buf[i];
    const p2 = buf[Math.min(i + 1, n - 1)];
    const p3 = buf[Math.min(i + 2, n - 1)];
    return p1 + 0.5 * f * (p2 - p0 + f * (2 * p0 - 5 * p1 + 4 * p2 - p3 + f * (3 * (p1 - p2) + p3 - p0)));
  }
}

// Initialize tone generator on page load
let toneGen = null;

document.addEventListener('DOMContentLoaded', () => {
  const playButton = document.getElementById('playButton');
  const frequencySlider = document.getElementById('frequency');
  const volumeSlider = document.getElementById('volume');
  const waveTypeSelect = document.getElementById('waveType');
  const timeDivSelect = document.getElementById('timeDiv');
  const frequencyDisplay = document.getElementById('frequencyDisplay');
  const volumeDisplay = document.getElementById('volumeDisplay');

  // Only initialize if tone generator elements exist on page
  if (!playButton && !frequencySlider) return;

  toneGen = new ToneGenerator();

  // Sync the generator with whatever the controls show on load
  if (frequencySlider) toneGen.frequency = parseFloat(frequencySlider.value);
  if (volumeSlider) toneGen.volume = parseFloat(volumeSlider.value);
  if (waveTypeSelect) toneGen.waveType = waveTypeSelect.value;
  if (timeDivSelect) toneGen.timeDivMs = parseFloat(timeDivSelect.value);

  toneGen.attachScope('waveformCanvas');
  toneGen.updatePlayButton();

  if (playButton) {
    playButton.addEventListener('click', () => toneGen.togglePlay());
  }

  if (frequencySlider) {
    frequencySlider.addEventListener('input', (e) => {
      const freq = parseFloat(e.target.value);
      toneGen.setFrequency(freq);
      if (frequencyDisplay) {
        frequencyDisplay.textContent = Math.round(freq) + ' Hz';
      }
    });
    if (frequencyDisplay) {
      frequencyDisplay.textContent = Math.round(toneGen.frequency) + ' Hz';
    }
  }

  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      toneGen.setVolume(vol);
      if (volumeDisplay) {
        volumeDisplay.textContent = Math.round(vol * 100) + '%';
      }
    });
    if (volumeDisplay) {
      volumeDisplay.textContent = Math.round(toneGen.volume * 100) + '%';
    }
  }

  if (waveTypeSelect) {
    waveTypeSelect.addEventListener('change', (e) => {
      toneGen.setWaveType(e.target.value);
    });
  }

  if (timeDivSelect) {
    timeDivSelect.addEventListener('change', (e) => {
      toneGen.setTimeDiv(parseFloat(e.target.value));
    });
  }
});
