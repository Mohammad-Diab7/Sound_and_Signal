// Channel Preview Waveforms (small animated previews on topic cards)

class ChannelPreview {
  constructor(canvasId, waveType = 'sine', frequency = 440) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.waveType = waveType;
    this.frequency = frequency;
    this.time = 0;
    this.animationId = null;
    this.drawWaveform();
  }

  drawWaveform() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerY = height / 2;

    // Clear canvas
    this.ctx.fillStyle = '#050805';
    this.ctx.fillRect(0, 0, width, height);

    // Draw grid
    this.ctx.strokeStyle = '#1d6b33';
    this.ctx.lineWidth = 0.5;
    const gridSpacing = width / 8;
    for (let i = 0; i <= width; i += gridSpacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, height);
      this.ctx.stroke();
    }

    // Draw waveform
    this.ctx.strokeStyle = '#39ff6a';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();

    const wavelength = width / 4;
    for (let x = 0; x < width; x++) {
      let y;
      const phase = (x / wavelength) * Math.PI * 2 + this.time;

      switch (this.waveType) {
        case 'sine':
          y = Math.sin(phase) * (height / 3);
          break;
        case 'square':
          y = Math.sin(phase) > 0 ? height / 3 : -height / 3;
          break;
        case 'sawtooth':
          const sawPhase = (phase / (Math.PI * 2)) % 1;
          y = (sawPhase * 2 - 1) * (height / 3);
          break;
        case 'triangle':
          const triPhase = (phase / (Math.PI * 2)) % 1;
          y = triPhase < 0.5 ? (triPhase * 4 - 1) * (height / 3) : (3 - triPhase * 4) * (height / 3);
          break;
        default:
          y = 0;
      }

      const screenY = centerY - y;
      if (x === 0) {
        this.ctx.moveTo(x, screenY);
      } else {
        this.ctx.lineTo(x, screenY);
      }
    }

    this.ctx.stroke();

    // Continue animation (static single frame when reduced motion is requested)
    this.time += 0.1;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.animationId = requestAnimationFrame(() => this.drawWaveform());
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

// Initialize all channel previews on page load
document.addEventListener('DOMContentLoaded', () => {
  // Only on home page
  if (document.body.getAttribute('data-page') === 'home') {
    new ChannelPreview('preview-ch1', 'sine', 440);
    new ChannelPreview('preview-ch2', 'sine', 880);
  }
});
