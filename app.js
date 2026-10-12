// Tally — one codebase, two runtimes:
//   1. any browser (this file, as-is)
//   2. an Android WebView via Capacitor (still this file, as-is)

const KEY = 'tally.count';
const HOLD_MS = 550;

const counterEl = document.querySelector('#counter');
const countEl = document.querySelector('#count');
const installBtn = document.querySelector('#install');

let count = Number(localStorage.getItem(KEY)) || 0;
let holdTimer = 0;
let installEvent = null;

render();

// Tap: +1 with a haptic blip (Android Chrome vibrates; iOS Safari ignores it).
// Hold: wipe the tally back to zero.
counterEl.addEventListener('pointerdown', () => {
  add();
  navigator.vibrate?.(8);
  holdTimer = setTimeout(() => {
    reset();
    navigator.vibrate?.([30, 60, 30]);
  }, HOLD_MS);
});
for (const evt of ['pointerup', 'pointercancel', 'pointerleave']) {
  counterEl.addEventListener(evt, () => clearTimeout(holdTimer));
}
// Long-press must not pop the browser's context menu.
counterEl.addEventListener('contextmenu', (e) => e.preventDefault());

function add() { count += 1; persist(); render(); }
function reset() { count = 0; persist(); render(); }
function persist() { localStorage.setItem(KEY, count); }
function render() { countEl.textContent = count; }

// Chrome/Android fire this once the PWA qualifies as installable.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  installBtn.hidden = false;
});
installBtn.addEventListener('click', () => {
  installEvent?.prompt();
  installEvent = null;
  installBtn.hidden = true;
});

// Offline shell. Requires HTTPS in production; localhost counts as secure.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}