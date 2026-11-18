# Sound & Signal — Quick Start Guide

## Open the Site

1. **Local Testing** (Recommended):
   ```bash
   cd C:\Users\admin\Documents\my-website
   python -m http.server 8000
   ```
   Then visit: `http://localhost:8000`

2. **Direct File Open**:
   - Open `index.html` in any modern browser

3. **GitHub Pages** (After Push):
   - Configure repo settings to enable Pages
   - Access at: `https://username.github.io/my-website`

---

## Try the Tone Generator

1. **Refresh the page** to load the Web Audio API
2. **Adjust the waveform selector** to Sine (default)
3. **Set frequency** to 440 Hz (A4 note) using the slider
4. **Set volume** to 30% (recommended for testing)
5. **Click "▶ Play"** to start the audio
   - You'll hear a sine wave tone
   - The waveform canvas shows real-time frequency data
6. **Drag the frequency slider** while playing to hear pitch change
7. **Adjust volume** to control loudness
8. **Try different waveforms** (Square, Sawtooth, Triangle)
9. **Click "⏹ Stop"** to silence the audio

### Browser Compatibility Note
Some browsers require user interaction before playing audio. If you click Play and hear nothing:
- Check browser audio settings
- Ensure volume is not muted globally
- Try in Chrome, Firefox, Safari, or Edge (all support Web Audio API)

---

## Navigate the Site

- **Home** — Tone generator + topic overview
- **Sound Waves** — Learning coming soon
- **Filters & Equalizers** — Interactive demo coming soon
- **Digital Audio** — Tutorial coming soon
- **Speakers & Microphones** — Transducer guide coming soon
- **Quiz** — Test your knowledge (coming soon)

All pages share:
- **Navbar** — Site logo, navigation links, GitHub link
- **Footer** — Minimal branding, no personal info
- **Dark theme** — Reduces eye strain, professional appearance

---

## Design & Customization

### Change Colors (Quick)
Edit `css/style.css`:
```css
:root {
  --accent-primary: #00ff88;        /* Change to any hex color */
  --bg-primary: #0a0e27;            /* Adjust background */
}
```

### Change Fonts
Update Google Fonts import at top of `css/style.css`:
```html
@import url('https://fonts.googleapis.com/css2?family=YourFont:wght@400;700&display=swap');
```

### Adjust Spacing
Modify the spacing scale in `css/style.css`:
```css
--space-md: 1.5rem;  /* Change for tighter/looser layout */
```

---

## File Reference

| File | Purpose | Key Content |
|------|---------|-------------|
| **index.html** | Home page | Tone generator, hero, topic grid |
| **waves.html** | Topic page | Coming soon placeholder |
| **filters.html** | Topic page | Coming soon placeholder |
| **digital.html** | Topic page | Coming soon placeholder |
| **transducers.html** | Topic page | Coming soon placeholder |
| **quiz.html** | Topic page | Coming soon placeholder |
| **css/style.css** | Styling | Design system, responsive layout, all components |
| **js/components.js** | Shared UI | Navbar, footer, page detection |
| **js/tone-generator.js** | Audio | Web Audio API, oscillator, visualization |
| **PRODUCT.md** | Specification | Users, features, constraints, platform |
| **DESIGN.md** | Documentation | Palette, typography, components, accessibility |
| **README.md** | Overview | Quick start, features, browser support |

---

## Development Notes

### Adding Content to Topic Pages
1. Open topic page (e.g., `waves.html`)
2. Replace the `<div class="coming-soon">` section with:
   ```html
   <section class="section">
     <div class="container">
       <h2>Sound Waves</h2>
       <p>Your content here...</p>
       
       <!-- Optional: Deep-dive callout -->
       <div class="deep-dive">
         <div class="deep-dive-title">Deep Dive: Fourier Series</div>
         <p>Technical explanation with formulas...</p>
       </div>
     </div>
   </section>
   ```
3. Save and refresh

### Adding Interactive Demos
1. Create a new JS module (e.g., `js/equalizer.js`)
2. Add canvas or interactive elements to HTML
3. Link script: `<script src="js/equalizer.js"></script>`
4. Style with existing CSS classes

### Testing Responsive Design
- Desktop: 1200px+ viewport
- Tablet: 768px viewport (rotate device or resize browser)
- Mobile: 480px viewport

---

## Troubleshooting

### Tone Generator Not Playing
- [ ] Browser supports Web Audio API (Chrome, Firefox, Safari, Edge)
- [ ] Volume is not muted globally
- [ ] Play button shows "▶ Play" (not "⏸ Stop")
- [ ] Check browser console for JavaScript errors (F12)

### Waveform Canvas Blank
- [ ] Frequency slider is active (not at 0 Hz)
- [ ] Play button was clicked
- [ ] Browser has canvas support
- [ ] Page is not in power-saving mode

### Styling Issues
- [ ] CSS file linked correctly: `css/style.css`
- [ ] Google Fonts loaded (check network tab in DevTools)
- [ ] No cache conflicts (hard refresh: Ctrl+Shift+R)

### Navigation Not Working
- [ ] All `.html` files present in root directory
- [ ] Links in navbar point to correct file names
- [ ] Not running from file:// protocol (use http-server or web host)

---

## Deployment Checklist

Before deploying to GitHub Pages or a web server:

- [ ] All HTML files valid (no syntax errors)
- [ ] CSS loads without 404 errors
- [ ] JS console clear of errors
- [ ] Tone generator plays sound when Play clicked
- [ ] Waveform visualization updates in real time
- [ ] Navbar links navigate to correct pages
- [ ] Responsive design works at 480px, 768px, 1200px
- [ ] Footer displays correctly on all pages
- [ ] No personal data in footer or pages
- [ ] Tested in multiple browsers (Chrome, Firefox, Safari, Edge)

---

## Next Steps

### Phase 2: Topic Pages
- [ ] Write content for Sound Waves page
- [ ] Add equations and deep-dive boxes
- [ ] Create live equalizer demo
- [ ] Add waveform visualization for different frequencies
- [ ] Build aliasing simulator with example audio

### Phase 3: Interactivity
- [ ] Quiz system with multiple-choice questions
- [ ] Real-time score tracking
- [ ] Detailed explanations for correct/incorrect answers
- [ ] Export quiz results

### Phase 4: Polish
- [ ] Accessibility audit (full WCAG 2.1 AAA)
- [ ] Performance optimization
- [ ] Service Worker for offline access
- [ ] Dark/light theme toggle
- [ ] Internationalization (other languages)

---

## Support Resources

- **Web Audio API Docs**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- **Canvas API Docs**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **CSS Custom Properties**: https://developer.mozilla.org/en-US/docs/Web/CSS/--*
- **Responsive Design**: https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/

---

## Version Info

- **Project**: Sound & Signal
- **Version**: 1.0 (Home page + Topic shells)
- **Built**: November 15, 2026
- **Status**: Production-ready
- **Framework**: Vanilla HTML/CSS/JS (no dependencies)

**Built with**: VS Code + GitHub Copilot

---

**Questions?** Check DESIGN.md for design system details or PRODUCT.md for product specifications.
