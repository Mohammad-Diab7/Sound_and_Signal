# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML, CSS, and vanilla JavaScript. Hosted on GitHub Pages. No build tools or dependencies required.

## Users

**Primary audience:** Beginners learning about sound and audio fundamentals through accessible explanations, plus electrical engineering students seeking deeper technical understanding with optional advanced deep-dive content containing formulas and rigorous explanations.

**Situation:** Self-directed learning in a browser; users explore topics at their own pace and experiment with interactive demos.

**Job:** Understand the electrical engineering principles behind sound, music, audio signals, and audio hardware; gain intuition for concepts like sine waves and harmonics, and frequency response and filtering.

## Product Purpose

An interactive educational resource that makes the electrical engineering behind audio accessible to beginners while providing rigorous technical depth for students. Success is measured by clarity of explanation, engaging interactive demonstrations that build intuition, and the ability for users across backgrounds to explore at their own level.

## Positioning

A dedicated learning resource that combines interactive browser-based demos (tone generator, Harmonic Builder, Filter Lab) with dual-level explanations—casual for newcomers and technical for engineers. No framework dependencies; runs everywhere.

## Operating Context

Users work in a web browser, typically on learning-focused sessions. Interactive demos use Web Audio API to generate sounds and visualizations in real time. All content is self-contained; no external files or API calls required. The site is navigable via GitHub Pages with no server backend.

## Capabilities and Constraints

**Confirmed capabilities:**
- Three pages: Home, Sound Waves, Filters & Equalizers
- Interactive browser demos: tone generator, Harmonic Builder, Filter Lab
- Dual-content system: plain explanations for beginners + optional "deep dive" boxes with formulas for EE students
- Responsive design for desktop and mobile
- English language only
- No personal data collection
- Generated audio only; no sample imports

**Technical constraints:**
- Vanilla JavaScript only; no frameworks or build tools
- Web Audio API for audio synthesis and analysis
- Canvas API for visualizations
- All sounds generated in browser; no external audio files
- Static hosting via GitHub Pages

**Design System (Resolved):**
- **Palette:** Near-black background (#050805), panel surfaces (#0c120c), phosphor green (#39ff6a) as the main color (title layers, traces, borders, RUN button, background), cyan (#22d3ee) as the secondary accent (active nav, h2/h3 headings, spectrum bars, slider thumbs, link hover), dim green (#1d6b33) for gridlines and borders, amber (#ffb000) for deep-dive boxes and warnings, red (#ff4d5e) only for the STOP state. Text: #d6f5dc (body), #7fa88a (secondary).
- **Typography:** VT323 (Google Fonts) for big headings and readouts; Share Tech Mono for labels, navigation, and numbers; IBM Plex Sans for body paragraphs (must stay readable).
- **Aesthetic devices:** Everything glows, softly (nav buttons, links, slider thumbs, deep-dive borders). A fixed full-page canvas behind every page draws a faint graticule, slow sine traces, a gentle pulsing center glow and CRT scanlines. 3-layer neon page titles in VT323. See DESIGN.md for the exact rules.
- **Deep-dive styling:** Dark surface (#0c120c) with #ffb000 (amber) left border and title, no background fill.
- **Site name:** Sound & Signal

## Brand Commitments

**Visual world binding:** Retro lab oscilloscope aesthetic—like a professional vintage instrument with phosphor green traces on a black screen. Not skeuomorphic but inspired by 1970s–1980s test equipment. Phosphor glow, graticule grids, channel labels (CH1–CH2), minimal use of color beyond the retro palette. Strict control of visual effects; scanlines and grid are subtle, not overwhelming.

**Voice:** Clear, educational; assumes no prior knowledge for main explanations but never talks down. Deep dive sections are technical and formula-forward without apology.

**Name & scope:** "Sound & Signal" (confirmed).

**Hero layout:** Neon title with tagline first, then a short intro (a cyan "SIGNAL DETECTED_" readout that types itself out once, followed by body text), then the oscilloscope screen (left) showing a triggered time-domain trace of the generated tone, and the front panel on the right with labeled controls (waveform selector, FREQ slider with readout, VOL slider with %, a single RUN/STOP toggle that turns red while playing).

**Channel cards:** Styled as instrument channels (CH1–CH2), each with a tiny animated waveform preview, title, description, and EXPLORE link.

**Hero tone generator:** Fully functional Web Audio API, silent until user clicks Play, with live waveform visualization and controls for frequency (20–4000 Hz), volume (0–100%), and waveform type (sine, square, sawtooth, triangle).

## Evidence on Hand

- Detailed product brief from user specification
- No existing codebase, assets, or visual references committed
- GitHub Pages as confirmed deployment target
- No testimonials, case studies, or legal assets required at launch

## Product Principles

1. **Clarity scales with audience.** Beginner explanations stand alone; deep dives augment without creating dependency.
2. **Interactive demos teach, not decorate.** Every visualization builds understanding; audio is purposeful, not ambient.
3. **Professional studio aesthetic earns trust.** Dark theme, precise typography, and neon accents signal technical rigor while remaining approachable.
4. **Friction disappears.** No installation, no plugins, no authentication. Open the site and learn immediately.
5. **Accessibility is essential.** Visual hierarchy, keyboard navigation, color contrast support all learners regardless of device or ability.

## Accessibility & Inclusion

- WCAG 2.1 AA compliance as baseline
- Responsive design for mobile, tablet, and desktop
- Keyboard navigation for all interactive elements
- Color not the sole means of information (particularly for data visualization)
- Audio descriptions or transcripts for audio-dependent content
- High contrast dark theme supports users with light sensitivity
