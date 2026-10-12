// Tally — one codebase, two runtimes:
//   1. any browser (this file, as-is)
//   2. an Android WebView via Capacitor (this file + @capacitor-community/sqlite)
//
// The count is a SQL query now: SELECT COUNT(*) FROM taps.
// The database connection lives in worker.js — sync OPFS file handles
// are only available inside workers, not the main thread.

const KEY = 'tally.count';
const HOLD_MS = 550;

const counterEl = document.querySelector('#counter');
const countEl = document.querySelector('#count');
const statusEl = document.querySelector('#status');
const installBtn = document.querySelector('#install');

let dbWorker = null;
let count = 0;
let holdTimer = 0;
let installEvent = null;

// Real SQLite over a Worker; falls back to the original localStorage
// counter on browsers without OPFS.
function initDb() {
  dbWorker = new Worker('./worker.js', { type: 'module' });
  const giveUp = setTimeout(() => fallback('timeout'), 15000);

  dbWorker.onerror = () => { clearTimeout(giveUp); fallback('worker failed'); };
  dbWorker.onmessage = (e) => {
    const msg = e.data;
    if (msg.type === 'ready') {
      clearTimeout(giveUp);
      statusEl.textContent = `SQLite ${msg.version} · real database · offline`;
      dbWorker.postMessage({ type: 'read' }); // pull the persisted count
    } else if (msg.type === 'count') {
      count = msg.count;
      countEl.textContent = count;
    } else if (msg.type === 'error') {
      clearTimeout(giveUp);
      fallback(msg.error);
    }
  };
}

function fallback(reason) {
  dbWorker?.terminate();
  dbWorker = null;
  count = Number(localStorage.getItem(KEY)) || 0;
  statusEl.textContent = 'localStorage fallback · saved on this device';
  countEl.textContent = count;
}

counterEl.addEventListener('pointerdown', () => {
  add();
  navigator.vibrate?.(8); // Android haptics; no-op on iOS
  holdTimer = setTimeout(() => {
    reset();
    navigator.vibrate?.([30, 60, 30]);
  }, HOLD_MS);
});
for (const evt of ['pointerup', 'pointercancel', 'pointerleave']) {
  counterEl.addEventListener(evt, () => clearTimeout(holdTimer));
}
counterEl.addEventListener('contextmenu', (e) => e.preventDefault());

function add() {
  if (dbWorker) dbWorker.postMessage({ type: 'add' });
  else { count += 1; localStorage.setItem(KEY, count); countEl.textContent = count; }
}

function reset() {
  if (dbWorker) dbWorker.postMessage({ type: 'reset' });
  else { count = 0; localStorage.setItem(KEY, count); countEl.textContent = count; }
}

initDb();

// Chromium fires this once the PWA qualifies as installable. But the
// in-page Install flow only earns its keep on Android, where it builds a
// real home-screen app. On desktop it spawns a second, Chromium-managed
// copy next to the OS launcher — so there the button stays hidden and the
// platform (Omarchy's launcher, Chrome's own menu) owns installation.
// iOS never fires this at all: over there it's Share → Add to Home Screen.
const alreadyInstalled =
  matchMedia('(display-mode: standalone)').matches ||
  matchMedia('(display-mode: fullscreen)').matches ||
  navigator.standalone === true;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  if (!alreadyInstalled && navigator.userAgentData?.mobile) installBtn.hidden = false;
});
installBtn.addEventListener('click', () => {
  installEvent?.prompt();
  installEvent = null;
  installBtn.hidden = true;
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}