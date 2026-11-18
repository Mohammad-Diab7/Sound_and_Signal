# Design

<!-- impeccable:design-schema 1 -->

**Sound & Signal** is an educational audio engineering website with a retro lab oscilloscope aesthetic. Inspired by vintage test equipment (1970s–1980s), the design uses phosphor green traces on near-black panels, subtle graticule grids, and channel labels to create an immersive learning environment that feels like operating a real instrument.

## Visual System

### Palette

**Retro Lab Oscilloscope:**
- `--bg-primary: #050805` — Near-black, lab oscilloscope background (darker than standard black, has green undertone)
- `--bg-panel: #0c120c` — Panel surfaces (slightly raised from background, dark green tint)
- `--accent-phosphor: #39ff6a` — Phosphor green, the main color: title layers, oscilloscope traces, borders, the RUN button, the background canvas, outlined controls
- `--accent-cyan: #22d3ee` — Cyan, the secondary accent: the active navbar button, section headings (`h2`/`h3`), spectrum and harmonic bars (and their labels and legend swatch), slider thumbs, link hover, and the home intro readout. Never used for traces
- `--accent-stop: #ff4d5e` with `--stop-ink: #1a0306` — Red, used only for the STOP state of a RUN/STOP toggle (see Buttons)
- `--accent-grid: #1d6b33` — Dim green: graticule gridlines, borders, secondary dividers
- `--accent-amber: #ffb000` — Amber: deep-dive box borders and titles, warnings, and the dashed target/reference lines in scopes
- `--text-primary: #d6f5dc` — Light green text (body paragraphs, main content)
- `--text-secondary: #7fa88a` — Muted green text (secondary labels, metadata, descriptions)

**Visual Effects (soft glow: every glow was cut to about half its original radius and opacity, so text stays crisp):**
- `--glow-phosphor: 0 0 4px rgba(57, 255, 106, 0.2), 0 0 8px rgba(57, 255, 106, 0.1)` — Phosphor green glow (active traces, hover states)
- `--glow-phosphor-strong` — three-layer green glow (5 / 12 / 24px, used on hover and focus)
- `--glow-neon-box` — outer + inner green glow (3 / 8px outer, 4px inner) for outlined neon elements (nav buttons, selects, card hover)
- `--glow-text: 0 0 3px rgba(57, 255, 106, 0.33)` — default link and label glow
- `--glow-cyan`, `--glow-cyan-strong`, `--glow-cyan-text` — the same glows in cyan (active nav button, headings, slider thumbs, link hover)
- `--glow-stop: 0 0 4px rgba(255, 77, 94, 0.3), 0 0 10px rgba(255, 77, 94, 0.15)` — soft red glow of the STOP button
- `--glow-amber` / `--glow-amber-box` — amber glow (3 / 9px outer, 5px inner) for deep-dive boxes
- **Canvas glow** follows the same rule: trace halos are 6px at 7% and 3.5px at 20% under the 2px core line; bar halos are 1px; the background's trace halo is 4px and its center pulse peaks at about 0.075 alpha
- `--bg-panel-glass: rgba(12, 18, 12, 0.86)` — translucent panel fill (nav, footer, scope bezel, front panel, cards, deep-dive) so the background canvas faintly shows through. No blur.
- **Scanlines:** drawn on the background canvas (see "Alive background"), not as a CSS overlay on content, so text is never striped
- **Graticule grid:** 60px spacing, dim green, drawn on the background canvas; the scope screen draws its own 10×8 graticule

### Typography

**Display Font:** VT323 (Google Fonts) — Regular weight (400)
- Used for big headings, readouts, oscilloscope labels (CH1, CH2, 440 Hz, etc.)
- Monospaced, boxy character reminiscent of old CRT displays
- Must be used at 1.5rem+ for readability (small sizes become jagged)
- Letter-spacing: normal to slight increase (0.05em) for clarity

**Technical Font:** Share Tech Mono (Google Fonts) — Regular weight (400)
- Used for navigation buttons, control labels, numbers, frequency/volume readouts
- Lowercase monospaced font, very compact and technical-looking
- Font size: 0.65rem–0.85rem for button labels, 1rem–1.25rem for readouts
- Case: Uppercase with letter-spacing 0.08em for nav/labels; normal case for readouts

**Body Font:** IBM Plex Sans (Google Fonts) — 400 weight (regular), 600 (emphasis)
- Used for paragraph text, descriptions, deep-dive content
- Must remain readable (no extreme sizing); avoid letting it become too technical
- Clean, neutral tone suitable for educational material
- Line height: 1.6 for readability

**Sizing & Hierarchy:**
- Display (h1 / VT323): 3rem, used sparingly (site name, page headers)
- Large heading (h2 / VT323): 1.75rem, used for section titles ("CHANNELS"), page headers
- Medium heading (h3 / VT323): 1.25rem, subsection titles
- Body: 1rem (16px), 1.6 line-height, max 75ch measure
- Small text (labels / Share Tech Mono): 0.75rem, uppercase, letter-spacing 0.08em
- Readout text (Share Tech Mono): 1rem–1.5rem, monospaced numbers in phosphor green

### Spacing & Rhythm

**Scale:**
- `--space-xs: 0.5rem`
- `--space-sm: 1rem`
- `--space-md: 1.5rem`
- `--space-lg: 2rem`
- `--space-xl: 3rem`

**Principle:** Tight groups (related controls), generous separation (between instrument panels). Channels have padding and spacing that feels "contained" on a panel.

### Borders & Outlines

**Style:** Thin, crisp borders (1px–3px) in phosphor green or dim green
- No rounded corners (oscilloscopes are angular)
- Straight lines and right angles throughout
- Active/focus states add a glow, not thicker borders

**Phosphor Glow Effect:**
- Everything neon glows softly: nav buttons, links, slider thumbs and tracks, the RUN/STOP button, scope trace, deep-dive borders (amber)
- Achieved via layered `box-shadow` / `text-shadow` using the glow tokens above
- Outlined neon elements get an outer **and** inner glow (`--glow-neon-box`); filled elements (active nav button, RUN, STOP) get a soft outer glow only
- Glow is the only depth cue; no blur filters, no decorative gradients on content (the single exception is the pulsing center glow on the background canvas)
- Headings and the intro readout carry only a faint 3px text glow so they stay sharp

## Neon Title

Every page starts with one neon title, set in VT323 uppercase, large (home: `clamp(3.25rem, 11vw, 7rem)`, page headers: `clamp(2.75rem, 8vw, 5.5rem)`).

Markup: `<h1 class="neon-title" data-text="TITLE">TITLE</h1>`. The back and middle layers are `::before` / `::after` reading `data-text` (hidden from screen readers with the `/ ""` alt-text syntax), so the heading is announced once.

| Layer | Source | Color | Offset | Glow |
|-------|--------|-------|--------|------|
| Back | `::before` | `#39ff6a` | 10px / 10px | green glow (4 / 11 / 23 / 40px at 50 / 50 / 42 / 25%) |
| Middle | `::after` | `#a4ff7a` | 5px / 5px | lighter green glow (3 / 9px) |
| Front | element | `#ffffff` | none | white glow (2 / 6px) plus a faint green halo (12 / 22px) |

- Offsets scale with `--neon-off` (10px; 6px under 600px wide)
- Front layer flickers occasionally (`neon-flicker`, 8s loop: two quick dips near 20% and one near 53%); it animates only `color` and `text-shadow` of the front layer, never opacity, so the back layers stay lit
- Home page: title, then the tagline "Real-time Signal Analysis Lab" beneath it. Topic pages: title, then a one-sentence `.page-lede` beneath it. No eyebrow/kicker above the title
- `prefers-reduced-motion: reduce` turns the flicker off

## Alive Background

`js/background.js` injects `<canvas id="bgCanvas">` as the first child of `<body>` on **every page** (include the script on every new page). It is `position: fixed; inset: 0; z-index: -1; pointer-events: none`, so content scrolls over a stationary scene.

Draw order, bottom to top:
1. Near-black fill `#050805`
2. Slow pulsing radial green glow at the center (alpha about 0.035 to 0.075, period about 10s)
3. Oscilloscope grid: 60px cells at 10% green, brighter center axes with tick marks (pre-rendered, redrawn only on resize)
4. Four glowing sine traces: three green, one faint amber (`TRACES` array: cycles across width, speed, amplitude, vertical position, alpha). Each is a 4px low-alpha halo pass plus a 1.6px line. Alpha stays at or below 0.28 so text remains readable
5. Faint CRT scanlines (1px dark line every 3px, 22% black) on top

Rules:
- Throttled to about 30fps, device pixel ratio capped at 1.5, no `shadowBlur`
- `prefers-reduced-motion: reduce` draws one static frame (time = 0); the preference is watched live
- Panels use `--bg-panel-glass` so the scene shows faintly through them; keep panel text on `--text-primary` / `--text-secondary` only

## Components & Patterns

### Navigation Bar

**Instrument Strip Aesthetic:**
- Translucent panel background (`--bg-panel-glass`), 2px dim-green bottom border
- Logo on left as a small bordered label ("♪ Sound & Signal", Share Tech Mono, uppercase)
- Page links are channel buttons: Share Tech Mono 0.65rem uppercase, phosphor green text with text glow, 1px phosphor green border, outer + inner glow
- Hover: faint green fill, white text, soft glow
- Active page: filled **cyan** (`#22d3ee`), dark text, soft cyan glow (`--glow-cyan-strong`)
- Responsive: links wrap to extra rows on mobile

### Footer

- Dark panel background, thin phosphor green top border (1px)
- Site name on left (small label), "Built with VS Code + GitHub Copilot" on right (very small, muted text)
- No personal names or info; purely branding and attribution
- Responsive: Full width

### Buttons (RUN/STOP, Main Controls)

**Styling:**
- Default (and every RUN button): phosphor green (`#39ff6a`) fill, `#050805` text, uppercase, 2px border in the same green, soft outer glow
- **RUN/STOP toggles switch color together with the label.** While the label reads "STOP" the button carries `.is-running`: red `#ff4d5e` fill and border, dark text `#1a0306`, soft red glow (`--glow-stop`). Back to "RUN" it returns to green. Scripts toggle `.is-running` in the same function that sets the text, so color and label can never disagree
- **No amber buttons.** Amber is reserved for deep-dive boxes, warnings and dashed reference lines
- The tone generator, Harmonic Builder and Filter Lab each have a **single toggle button**: "RUN" when stopped, "STOP" when playing
- Font: Share Tech Mono, 0.75rem (1rem and 48px tall for the RUN/STOP button), letter-spacing 0.05em, bold

**States:**
- Default: soft green glow
- Hover: `--glow-phosphor-strong` (red STOP: a slightly stronger soft red), 1px lift
- Active/Pressed: no lift
- Disabled: muted dim green, no glow, not clickable

**Transitions:**
- Color, glow, shadow: 100ms linear
- Transform (lift): 100ms linear

### Tone Generator Panel

**Layout:**
- Oscilloscope screen (left): bezel `.scope-screen` (3px phosphor border, `--glow-phosphor` plus inset glow) containing a header row and a full-size canvas
  - Header: "CH1" on the left; on the right the live readout `440 Hz · SINE` (frequency and waveform type, updated as controls change)
  - Footer row under the screen: bottom-left the current time base (`1 ms/div`), bottom-right the period of the set tone (`T = 2.27 ms`, 2 decimals). Readouts keep their written case (`text-transform: none`) so units read "ms" and "Hz", never "MS"/"HZ"
  - Canvas fills `.waveform-display` (min-height 300px desktop, 240px at 768px, 200px at 480px) and is resized to its CSS box times DPR (capped at 2)

- Front panel controls (right): Flex column, padding, phosphor green border (3px)
  - Sections separated by thin dim-green dividers
  - Each control has a label (Share Tech Mono, small, uppercase) and value readout (VT323, larger, phosphor green)
  - Waveform selector: Dropdown (styled with phosphor green border and text)
  - TIME/DIV selector (directly under WAVEFORM): `0.1, 0.2, 0.5, 1, 2, 5 ms/div`, default 1 ms/div. Same glowing select style as WAVEFORM (all `select` elements carry a resting `--glow-neon-box` and `--glow-phosphor-strong` on hover/focus)
  - Frequency slider: 20 to 4000 Hz, readout `440 Hz`
  - Volume slider: readout as percentage (`30%`)
  - RUN/STOP: single full-width toggle button
  - Slider thumbs are 16×22px **cyan** blocks with a soft cyan glow (3 / 8 / 16px); the track stays green with a faint glow

**Scope display (real time-domain oscilloscope):**
- Source: `AnalyserNode.getFloatTimeDomainData` (fftSize 32768, about 680 ms at 48 kHz, far more than the 50 ms maximum window). The analyser taps the raw oscillator before the volume node, so the trace uses most of the screen height at any volume
- One continuous trace across the full width, vertically centered, amplitude 42% of the screen height each side of center
- **Trigger:** the sweep starts at a rising zero-crossing (sub-sample interpolated) so the wave stands still
- **Time base (fixed, manual):** 10 horizontal divisions, so the visible window is `10 × TIME/DIV` (converted to samples with `audioContext.sampleRate`). It changes **only** when the user changes the TIME/DIV selector, never automatically and never when the frequency changes. Consequence: the number of cycles on screen follows the frequency (at 1 ms/div, 440 Hz shows about 4.4 cycles and 2650 Hz about 26.5)
- Samples are Catmull-Rom interpolated so high pitches (few samples per cycle) draw smooth
- Graticule: 10×8 divisions in dim green, brighter center axes with 5 ticks per division
- Trace: three stacked strokes (6px at 7%, 3.5px at 20%, 2px `#7dff9b`) for a soft phosphor glow
- Stopped: a single flat line across the middle at 60% alpha. The render loop runs only while playing
- The rest of the site stays silent until the user clicks RUN (no autoplay); start and stop use a 20 to 30ms gain ramp to avoid clicks

### Channel Cards (Topic Grid)

**Styling:**
- Label: "CH1", "CH2", etc. in VT323, phosphor green, uppercase
- Border: 2px phosphor green
- Background: Panel color (#0c120c)
- Padding: 1.5rem

**Content:**
- Title: "Sound Waves", etc. in IBM Plex Sans, 1.25rem, white/light text
- Description: Body text in secondary color
- Canvas preview: Small (250×60px), shows animated waveform in phosphor green on panel background
- Link: "→ EXPLORE" or "→ TEST" in phosphor green, Share Tech Mono, small

**States:**
- Default: Crisp border
- Hover: Glow, slight lift (translateY -4px), link text brightens
- Active (current page): Border or background tint may brighten

### Deep-Dive Callout

**Styling (Very Important):**
- **NOT a colored background box**
- Translucent dark panel background (`--bg-panel-glass`), 2px amber border on all sides, 4px amber left edge
- **Amber glow:** `--glow-amber-box` (outer and inner amber glow) on the box, plus an amber text glow on the title
- No fill color; content appears on the panel background

**Content:**
- Title: VT323, uppercase, 1.25rem, **amber (#ffb000)** with amber text glow
- Body text: IBM Plex Sans, primary text color, normal line height
- Code/formulas: Share Tech Mono, inline or in block, phosphor green
- Code blocks: near-black background (`--bg-primary`), monospace

**Example:**
```
┌─────────────────────────────────────────────┐
│█ DEEP DIVE: RMS VOLTAGE                    │
│                                              │
│ The root-mean-square (RMS) value of a sine │
│ wave is: V_rms = V_peak / √2               │
│                                              │
│ This means a 1 kHz sine wave at ±5V peak   │
│ has an RMS of 3.54V.                       │
└─────────────────────────────────────────────┘
```

### Page Header

Every topic page = navbar, `<header class="page-header">` (neon title + `.page-lede`), content, footer, and the background canvas.

- Site pages: Home, Sound Waves, Filters
- Neon title carries the page name (Sound Waves, Filters & Equalizers)
- A page that is not built yet uses the placeholder panel (`.coming-soon .container`): translucent panel, 2px phosphor border with `--glow-neon-box`, VT323 "COMING SOON" heading, one line of body text, min-height 40vh

### Topic Page Pattern (built on the Sound Waves page)

Order: navbar, neon `page-header`, interactive demo, lesson sections, footer. Scripts on every page: `js/background.js`, the page's own script, `js/components.js`.

- **Demo section** (`.section.demo`): `.section-heading` (VT323, `clamp(2rem, 4vw, 2.75rem)`, text glow), one `.demo-intro` sentence, then the home-page pairing: `.hero-container` with a `.scope-screen` on the left and a `.front-panel` on the right. Controls use `<label class="control-label" for>` and `<output class="control-value" aria-live="off">`; sliders get `aria-valuetext`. Canvases use `.scope-canvas` (absolutely fills `.waveform-display` or `.spectrum-display`) and carry `role="img"` with a live-updated `aria-label`. Audio is created only inside the RUN click
- **Scope conventions:** 10×8 graticule; trace is three stacked strokes (6px at 7%, 3.5px at 20%, 2px `#7dff9b`). The ideal/target reference is a **dashed amber** 1.5px line drawn on top of the green trace. A `.scope-footer` legend names both lines in words as well as styles, so color is never the only cue
- **Spectrum chart** (`.spectrum-display`, 150px, inside `.spectrum-wrap`): bars at their true frequencies on a fixed x-axis, with Hz labels at n·f0 spaced at least 64px apart. Amplitudes are **relative to the fundamental (fundamental = 1)**, so the first bar always reaches the top. Faint outlines ("ghosts") mark harmonics not yet added
  - **Y axis:** labels on the left with faint horizontal grid lines: `0 / 0.5 / 1.0` in linear mode, `0 dB / −20 / −40 / −60` in dB mode (dB = 20·log10(relative amplitude), floor −60 dB). A `.seg-toggle` (`LINEAR` / `dB`, `aria-pressed`) in the chart header switches it
  - **Bar labels:** the relative value above each included bar, 10px Share Tech Mono in cyan, like the bars (`1`, `0.333`, `0.2`; dB mode uses 0–1 decimals). The renderer picks the roomiest layout that fits (one row, then two staggered rows, fewer decimals before that) and hides the labels when bars are too narrow; the tooltip still gives every value
  - **Inspect:** hover (nearest bar wins), tap, or focus the chart and use ← → / Home / End; Escape clears. The inspected bar gets a column highlight and a ring, and `.spectrum-tip` shows `n = 3 · 660 Hz · amplitude 0.333 (b_n = 4/(3π) ≈ 0.424)`. The formula follows the wave (square `4/(nπ)` odd n; sawtooth `2/(nπ)`, negative for even n; triangle `8/(n²π²)` odd n, negative for n = 3, 7, 11…). The magnitude is the bar value; a negative `b_n` is marked "negative sign". In dB mode the tooltip adds `= −9.5 dB`. Keyboard selection is also announced through a polite `.sr-only` live region
- **Lesson section** (`.section > .lesson`): two columns above 1024px, text on the left (`.lesson-text`, VT323 cyan `h2` with a faint cyan text glow, body at 60ch) and the deep dive beside it; one column below. Do not wrap a `.section` in `.container` (it double-pads and misaligns with the page header)
- **Terms list** (`dl.terms`): each row is a VT323 phosphor term and a body-font definition, separated by dim-green rules. Not boxed cards
- **Collapsible deep dive:** `<details class="deep-dive"><summary class="deep-dive-title">Deep dive: topic</summary>…</details>`, closed by default. The summary shows an amber `+` / `−` box before the title, has an amber focus ring, and is native-keyboard operable (Enter / Space)
- **Formulas:** `<pre class="formula">` in Share Tech Mono with plain Unicode math (π, Σ, λ, −, ∞) and `_{}` / `^{}` for sub/superscripts; no math library. Label each formula with `<p class="formula-label">`. Long formulas scroll horizontally inside the block rather than wrapping
- **Click-free audio:** changing a waveform's coefficients crossfades to a fresh oscillator over 30 ms (throttled to about 40 ms between swaps); frequency and volume use `setTargetAtTime`; start and stop ramp the master gain. Use `createPeriodicWave(..., { disableNormalization: true })` when the audio must equal the plotted sum
- **Reduced motion:** the scope's harmonic fade-in eases over about 70 ms normally and snaps instantly under `prefers-reduced-motion: reduce`

### Filter Lab (Filters page)

A demo with four linked outputs driven by one filter state: Bode plot, scope, harmonic spectrum, and sound. The layout is the same hero pairing (displays left in one `.scope-screen`, controls right), but the right column is a `.panel-stack` of three `.front-panel`s (Source, Filter, RC calculator) and the left display stretches to match.

- **Source:** square or sawtooth at 220 Hz, or white noise. Silent until RUN. `BYPASS` is a `.toggle-btn` (outlined, `aria-pressed`, filled when on) that crossfades dry and wet paths; its status line says whether the filter is in the path
- **Filter:** type is a three-button `.seg-toggle.seg-wide`; CUTOFF is a log slider (0–1000 steps over 20 Hz to 20 kHz) with a kHz readout; ORDER 2 / 4 / 8 is 1 / 2 / 4 cascaded second-order stages; Q is enabled only for band-pass (`input:disabled` is dimmed). Stages are Butterworth, so every order is exactly −3 dB at fc; unused stages are 0 dB peaking filters, an exact bypass
- **RC calculator:** R (Ω, kΩ) and C (nF, µF) number inputs (`.rc-field`, glowing like the selects) with a live fc = 1/(2πRC) readout and SET CUTOFF, which clamps to 20 Hz to 20 kHz and says so in a polite status line. Invalid input disables the button
- **Bode plot:** log frequency axis 20 Hz to 20 kHz (labels 20, 100, 1k, 10k, 20k; minor lines at 50, 200, 500, 2k, 5k) and a 0 to −60 dB axis (labels every 20 dB, grid every 10). The curve is `BiquadFilterNode.getFrequencyResponse` multiplied through the whole cascade. An amber dashed vertical line marks fc, a dotted amber line marks −3 dB, and amber dots mark where the curve crosses it (one for low/high-pass, two band edges for band-pass). Bypassed: a dim reference curve with a bright flat line
- **Mirror chain:** the displays read an identical cascade on an `OfflineAudioContext`, so they work before RUN and no `AudioContext` exists until the RUN click. The live context is created at 48 kHz so both use the same coefficients
- **Scope:** fixed time base. Periodic sources show 2 periods: ideal input as a dashed amber line, output as the glowing green sum of harmonics scaled and phase-shifted by the filter (`y(t) = Σ b_n·|H(n·f0)|·sin(nω0t + ∠H)`), which is the exact steady state of the audio chain. Noise shows the latest 10 ms from `AnalyserNode`s tapped before the volume control, redrawn every frame while playing and once per change under `prefers-reduced-motion`
- **Spectrum:** bars at n·f0 up to n = 50, relative to the input fundamental. Input is a dim outline, output (input × |H(n·f0)|) is a bright **cyan** bar. Hover, tap, or ← → / Home / End / Escape shows `n = 5 · 1100 Hz · input 0.2 · output 0.113 (filter gain 0.564 = −5 dB)`. Noise has no harmonics, so the chart says so and drops out of the tab order
- **Harmonic cap:** the source has 80 harmonics (17.6 kHz at 220 Hz). Above that the browser's oscillator band-limiting differs from the math, so the model would stop matching what is heard
- **Click-free sound:** cutoff and Q glide with `setTargetAtTime`; changing type or order crossfades between two preconfigured chains over 30 ms; changing source crossfades voices; volume and bypass use `setTargetAtTime`

### Home Intro

Between the home title/tagline and the oscilloscope hero sits `.intro`: a dark semi-transparent panel (`rgba(5, 8, 5, 0.8)`, 1px `#1d4d2c` border, `--space-md` padding, max 68ch) so the background traces never run behind the text. Inside it, a cyan scope-readout line, then normal body paragraphs in the voice of the product ("Every sound you've ever heard was, at some point, just a signal…", "Not here.", the call to press RUN that points to filters, and the sine-wave warning).

- **Readout:** `SIGNAL DETECTED_` in Share Tech Mono (`clamp(1.4rem, 3vw, 1.85rem)`), cyan `#22d3ee`, 0.14em tracking, faint cyan text glow. `js/intro.js` types it out once, letter by letter (400 ms delay, 75 ms per letter) with a solid underscore cursor, then the cursor blinks (`cursor-blink`, 1 s steps)
- **No-JS and screen readers:** the full text is already in the HTML; a `.sr-only` copy is what assistive tech reads, and the animated copy is `aria-hidden`
- **Reduced motion:** the script does nothing (the text is simply there) and the cursor stays static

## Layout & Responsiveness

### Hero Layout (Home Page)

**Desktop (1024px+):**
- Heading block first: neon title, then tagline "Real-time Signal Analysis Lab"
- Two-column grid below it: oscilloscope screen (left, 50%), front panel controls (right, 50%)

**Tablet (768px–1023px):**
- Grid adjusts to accommodate smaller screen
- Columns may become narrower; control panel may reflow
- Waveform canvas becomes narrower but still functional

**Mobile (<768px):**
- Single column: oscilloscope screen on top, controls stack below
- Full width with side padding
- Canvas height reduced to maintain aspect ratio
- Controls remain fully functional

### Grid System

**Breakpoints:**
- Mobile: max-width 480px
- Tablet: max-width 768px
- Desktop: 1024px and above
- Extra large: 1440px and above

**Container:**
- Max width: 1200px
- Padding: 1.5rem on sides (responsive: 1rem on tablet, 0.75rem on mobile)

### Channel Grid (5 Cards)

**Desktop (1024px+):** 5 columns, wrapping as needed, or responsive grid-auto-fit
**Tablet (768px–1023px):** 2–3 columns
**Mobile (<768px):** 1 column, full width, stacked

### Key Sections

1. **Navigation:** Sticky, full width, dark panel style
2. **Hero:** Two-column (oscilloscope + controls) or single column on mobile
3. **Channel Grid:** Responsive 5-card grid (or wrap)
4. **Footer:** Full width, dark panel style, sticky to bottom

## Interaction & Motion

**Transitions:**
- `--transition-fast: 100ms linear` — Color, opacity, small transforms
- `--transition-normal: 200ms linear` — Larger transforms, card lift, panel reveal

**Hover States:**
- Buttons: Glow effect, slight translate (2–4px)
- Cards: Glow, lift (translateY -4px)
- Links: Color shift to primary, underline (optional)
- Sliders: Thumb glow intensifies, track brightens slightly

**Active/Focused States:**
- Navigation links: Text or border in phosphor green, slight glow
- Buttons: Glow on (active = engaged state)
- Form inputs: Focus ring (2px phosphor green outline, offset 2px)

**Waveform Visualization:**
- Scope renders on requestAnimationFrame, only while playing (see Tone Generator Panel)
- When playing: triggered time-domain trace from the Web Audio analyser
- When stopped: flat line across the center
- Background canvas animates at about 30fps and is static under `prefers-reduced-motion`

## States & Edge Cases

### Tone Generator States

- **Ready/Idle:** button reads "RUN", scope shows a flat line, all controls adjustable
- **Playing:** button reads "STOP" and turns red, scope shows the standing trace at the selected time base, controls remain adjustable in real time (readouts update)
- **Stopping:** short fade-out, scope returns to the flat line, button reads "RUN"

### Page Load

- All interactive elements present and visible
- Tone generator: **silent by default**, requires explicit Play click
- No autoplay audio; all demos are opt-in

### Empty/Coming Soon Pages

- Full navbar and footer (same as other pages)
- Centered coming-soon panel with oscilloscope styling
- Professional, approachable tone (not apologetic)

### Disabled/Error States

- Buttons: Muted phosphor green (lower opacity), no glow
- Text: Secondary color or lower contrast
- Borders: Dim green instead of phosphor green

## Accessibility & Inclusion

**Contrast:**
- Phosphor green (#39ff6a) on near-black (#050805): ~11:1 (WCAG AAA)
- Body text (#d6f5dc) on panel (#0c120c): ~7:1 (WCAG AAA)
- All text meets or exceeds WCAG AA (4.5:1 minimum)

**Keyboard Navigation:**
- All interactive elements reachable via Tab
- Focus ring: 2px solid phosphor green outline, offset 2px
- Skip-to-content link available (not visible, but keyboard-accessible)

**Color Usage:**
- Phosphor green and dim green sufficient for contrast (tested for deuteranopia/protanopia)
- Amber provides additional visual distinction for deep-dive boxes
- No information conveyed by color alone; shapes, labels, and position also matter

**Responsive:**
- Tested at 375px (mobile), 768px (tablet), 1024px+ (desktop)
- Touch targets ≥44×44px (buttons, sliders)
- Sliders full-width on mobile for easy interaction

**Typography:**
- Base font size 16px (never smaller than 14px for body)
- Line height 1.6 (comfortable for extended reading)
- Line measure 65–75ch for body text
- Headings balanced (no orphaned words)
- Display font (VT323) only used at 1.5rem+ to avoid illegibility at small sizes

**Browser Defaults:**
- Custom scrollbar styling (track: dim green, thumb: phosphor green)
- Selection colors: phosphor green background, dark text
- All interactive elements inherit focus styles automatically

## Implementation Notes

### File Structure

```
my-website/
├── index.html                    (Home page with oscilloscope hero + channels)
├── waves.html                    (Sound Waves: Harmonic Builder + 3 lessons)
├── filters.html                  (Filters & Equalizers: Filter Lab + 3 lessons)
├── css/
│   └── style.css                 (All styles; retro palette, components, responsive)
├── js/
│   ├── background.js             (Fixed full-page canvas: grid, sine traces, center pulse, scanlines; include on EVERY page)
│   ├── components.js             (Navbar, footer, page detection)
│   ├── tone-generator.js         (Web Audio API tone + triggered time-domain oscilloscope)
│   ├── channel-previews.js       (Small animated waveforms in channel cards)
│   ├── waves.js                  (Sound Waves page: Harmonic Builder scope, spectrum and PeriodicWave audio)
│   ├── filters.js                (Filters page: Filter Lab Bode plot, scope, spectrum, RC calculator and filter audio)
│   └── intro.js                  (Home page: types out the SIGNAL DETECTED_ readout once)
├── PRODUCT.md                    (Product specification, retro redesign details)
├── DESIGN.md                     (This file; design system & implementation)
└── README.md                     (User-facing overview)
```

### CSS Architecture

- Single stylesheet (css/style.css, ~21KB)
- CSS custom properties for retro palette (colors, fonts, spacing, effects)
- Mobile-first responsive design with breakpoints at 480px, 768px, 1024px
- No pre/post processors; pure CSS3 and CSS Grid/Flexbox
- All animations use CSS transitions (linear, fast/normal duration)

### JavaScript

- Vanilla ES6+ (no frameworks or build tools)
- **background.js:** Injects the fixed background canvas on every page (see "Alive Background")
- **components.js:** Injects navbar and footer into all pages, detects current page for active link styling
- **tone-generator.js:** Web Audio API oscillator, gain and analyser; triggered time-domain scope drawn on a canvas
- **channel-previews.js:** Draws small animated waveforms in channel card canvases, runs on home page only (single static frame under reduced motion)

### Performance

- Static HTML files (no server-side rendering)
- Google Fonts loaded via CDN (VT323, Share Tech Mono, IBM Plex Sans)
- No external APIs or service calls
- Minimal JS payload (~5KB total across three modules)
- Canvas animations optimized with requestAnimationFrame (no layout thrashing)
- CSS animations use `will-change` sparingly to avoid performance degradation

## Design Principles (Reflected in Build)

1. **Retro authenticity.** The oscilloscope aesthetic is not decorative—it's central to the learning experience. Users feel like they're working with real instrumentation, building intuition through that analogy.

2. **Clarity through constraint.** Green is the main color and cyan the one secondary accent; amber is reserved for deep dives, warnings and reference lines, and red appears only on STOP. Limited typography (three fonts, clear roles). Everything glows, but softly, and the background grid, traces and scanlines stay faint so text is always readable. Constraint breeds clarity.

3. **Interactive demos teach, not decorate.** The oscilloscope screen on the home page is the first lesson. Adjusting frequency and waveform teaches the concept immediately.

4. **Professional yet approachable.** Dark theme and technical aesthetics build trust and authority; playful font choice (VT323) and dual-level content invite all learners.

5. **Friction disappears.** One click to play audio. No login, no install, no plugins. Open the site and start experimenting.

6. **Accessibility is essential.** High contrast, keyboard navigation, and responsive design serve all learners. The retro aesthetic doesn't compromise usability.
