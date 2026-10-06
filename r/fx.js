// Ambient embers drifting up the page. Purely decorative; skipped when reduced motion is requested.
(() => {
  const box = document.getElementById('embers');
  if (!box || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 24; i++) {
    const e = document.createElement('i'), s = e.style;
    s.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
    s.setProperty('--s', (1.5 + Math.random() * 2.5).toFixed(1) + 'px');
    s.setProperty('--d', (10 + Math.random() * 10).toFixed(1) + 's');
    s.setProperty('--delay', (-Math.random() * 20).toFixed(1) + 's');
    s.setProperty('--sway', ((Math.random() - 0.5) * 140).toFixed(0) + 'px');
    box.append(e);
  }
})();
