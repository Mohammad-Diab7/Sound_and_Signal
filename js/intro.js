// Sound & Signal — Home intro: the "SIGNAL DETECTED_" readout types itself out once.
// The full text is already in the HTML, so without JS (or with reduced motion) it simply stays static.

(function () {
  'use strict';

  const typed = document.getElementById('introTyped');
  const readout = document.getElementById('introReadout');
  if (!typed || !readout) return;

  const full = typed.textContent;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  const START_DELAY = 400; // ms before the first letter
  const PER_LETTER = 75; // ms between letters

  typed.textContent = '';
  readout.classList.add('is-typing'); // solid cursor while typing

  let i = 0;
  function next() {
    i++;
    typed.textContent = full.slice(0, i);
    if (i < full.length) {
      setTimeout(next, PER_LETTER);
    } else {
      readout.classList.remove('is-typing'); // the cursor now blinks
    }
  }
  setTimeout(next, START_DELAY);
})();
