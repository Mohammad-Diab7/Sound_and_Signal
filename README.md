# Sound & Signal

Learn the electrical engineering behind audio with interactive demonstrations.

## Project Structure

- **index.html** — Home page with live tone generator
- **waves.html, filters.html** — Topic pages with interactive demos
- **css/style.css** — Complete design system and responsive layout
- **js/components.js** — Shared navbar and footer
- **js/background.js** — Animated oscilloscope background on every page
- **js/tone-generator.js** — Home page tone generator and scope
- **js/channel-previews.js** — Animated waveforms on the home page topic cards
- **js/waves.js** — Sound Waves page: Harmonic Builder
- **js/filters.js** — Filters page: Filter Lab
- **js/intro.js** — Home page intro readout typing effect
- **PRODUCT.md** — Product specification and design decisions
- **DESIGN.md** — Design system documentation

## Features

### Home Page
- **Live Tone Generator:** Web Audio API synthesis with frequency, volume, and waveform controls
- **Waveform Visualization:** Real-time oscilloscope view of the generated tone
- **Topic Grid:** 2 channel cards (CH1–CH2) linking to Sound Waves and Filters

### Design System
- **Retro Lab Oscilloscope Aesthetic:** Phosphor green on near-black with a cyan secondary accent and amber for deep dives, graticule grids and a live background
- **Soft Glow:** Interactive elements glow gently; page titles are three stacked neon layers; RUN buttons turn red while playing
- **Typography:** VT323 (headings and readouts), Share Tech Mono (labels and numbers), IBM Plex Sans (body)
- **Responsive Design:** Mobile, tablet, and desktop viewports
- **Accessibility:** Keyboard navigation, high contrast, reduced-motion support

## Technical Stack

- **HTML5** — Semantic markup
- **CSS3** — Custom properties, grid, flexbox, responsive media queries
- **Vanilla JavaScript (ES6+)** — No frameworks or build tools
- **Web Audio API** — Real-time sound synthesis and analysis
- **Canvas API** — Waveform visualization
- **Google Fonts** — VT323, Share Tech Mono, IBM Plex Sans

## For the Course TAs: How to View the Site

**Option 1 — Live site (easiest, nothing to install):**
Open https://mohammad-diab7.github.io/Sound_and_Signal/ in Chrome, Edge, Firefox or Safari.

**Option 2 — Run locally:**
1. Download the repo: green **Code** button → **Download ZIP** (or `git clone https://github.com/Mohammad-Diab7/Sound_and_Signal.git`)
2. Extract the ZIP
3. Double-click `index.html` (no server, build step or install needed)

**Using the site:**
1. On the home page click **RUN** on the tone generator to hear a sine wave (browsers require a click before audio can play)
2. Adjust frequency, volume, and waveform type in real time
3. Open **Sound Waves** (Harmonic Builder) and **Filters** (Filter Lab) from the topic cards or the navbar

Note: fonts load from Google Fonts, so an internet connection is needed for the intended look.

**Links:**
- Published site: https://mohammad-diab7.github.io/Sound_and_Signal/
- Repository: https://github.com/Mohammad-Diab7/Sound_and_Signal

## Browser Support

- Chrome/Edge 85+
- Firefox 78+
- Safari 14+
- Mobile Safari (iOS 14+)

All modern browsers with Web Audio API and Canvas support.

## Deployment

Hosted with GitHub Pages (Settings → Pages → Deploy from branch → `main` / root):
`https://mohammad-diab7.github.io/Sound_and_Signal/`

All files are static; no build process or server required.

## Tone Generator Controls

- **Waveform Type:** Sine, Square, Sawtooth, Triangle
- **Frequency:** 20–4000 Hz
- **Volume:** 0–100%
- **Run/Stop:** Toggle sound on/off
- **Waveform Display:** Real-time oscilloscope view

All audio is generated in-browser using Web Audio API. No external audio files or APIs.

## Design Principles

1. **Clarity scales.** Beginner explanations + optional deep-dive technical content.
2. **Demos teach.** Every interactive element builds understanding.
3. **Professional aesthetic.** Dark theme signals rigor and expertise.
4. **Friction disappears.** No install, no login, no plugins.
5. **Accessibility first.** Designed for all learners, all devices.

## License

Educational content. Built with VS Code + GitHub Copilot.

---

**Next Steps:**
- Accessibility audit
- Export/sharing functionality
