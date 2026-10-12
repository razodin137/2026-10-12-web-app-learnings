# Tally — our first app, and what building it taught us about cross-platform

A tap counter. Built as a web app, then installed as an app on Android, an iPhone, and a Linux desktop — same six files, zero platform-specific code.

## The big idea

"Web app" and "phone app" stopped being different things a while ago. You build one thing — a small website with three special ingredients — and every platform wraps it in app clothing for free:

- **`manifest.webmanifest`** tells the platform "I'm an app": name, icon, colors, and *please open me without browser UI*.
- **`sw.js`** — the service worker — is a tiny file the browser keeps that answers network requests from a local cache instead of the internet. This is the whole offline trick.
- **`localStorage`** is where the count lives, on the device, no server involved.

Everything else — the "install" on any platform — is just window dressing around a URL. The app-ness lives in these files.

## Learnings, the ones we actually hit

**Installing offline is totally possible.** Once the service worker caches the app, it loads with the network fully cut — we tested it, count intact. Only the very first visit needs internet.

**Yes — a real SQLite database runs offline in the page.** SQLite — the same engine inside nearly every phone app — compiles to WebAssembly, and its database file lives in the browser's own private filesystem. The counter literally runs `SELECT COUNT(*)` now; every tap is an `INSERT`. No server ever sees it.

**"Install" and "offline" are different features.** Installing just buys you the icon and a chromeless window. Offline comes from the service worker. A site without one can be installed everywhere and still die in airplane mode.

**Apple doesn't like SVGs — make sure you have a PNG, too.** iOS ignores SVG icons; without an `apple-touch-icon` PNG, an iPhone install gets an ugly screenshot thumbnail instead of the icon. Bonus: the Linux desktop installer scrapes that same PNG for its launcher. One PNG, three platforms.

**iOS will never show your Install button.** Safari doesn't fire the event that makes in-page install prompts appear, so the button stays invisible there. On an iPhone, installing is a gesture: Share → Add to Home Screen.

**In-page install buttons are Chromium-only — aim them carefully.** On desktop, Chromium's install spawns a second, Chromium-managed copy of the app (own window, extension support and all) next to the OS launcher you already used. So the button now shows only on Android, where it's the real install flow. Desktop installs belong to the platform.

**Android gets the fancy install.** Chrome compiles a real WebAPK — the app appears in the app drawer and in Settings, same code as the website.

**On iPhone, installing actually protects your data.** Safari purges website data from regular tabs after about a week, but home-screen-installed web apps are exempt. Install, and the count survives.

**iOS has no web haptics.** `navigator.vibrate` buzzes on Android; iPhones politely ignore it. Push notifications exist there, but only on iOS 16.4+ and only once installed.

**On Linux, "installing" is a launcher file.** Omarchy's `omarchy webapp install` writes a `.desktop` entry that opens the URL in a chromeless browser window. Nothing is copied or packaged — it even borrows your `apple-touch-icon` as the launcher icon.

**Chrome re-checks your service worker about once a day.** Change `sw.js` and your fix can look broken for hours. DevTools → Application → Service Workers → check "Update on reload."

**Real app magic needs HTTPS.** Install and offline features only work from a secure origin. `localhost` counts as secure (that's why dev works); `http://192.168.x.x` visited from your phone over Wi-Fi does not.

**Your data lives on the device.** The count doesn't sync between phone and laptop, and clearing the browser's site data wipes it. Fine for a counter. The day you want sync is the day you add a backend.

**The phone constraint is one CSS file.** Never wider than 430px, always full viewport height, safe-area padding for notches and home bars. On desktop it just centers as a phone-shaped slab. One media query.

## Scorecard

| | Android | iPhone | Linux desktop |
|---|---|---|---|
| How you install | In-page Install button | Share → Add to Home Screen | App launcher |
| Feels native | Yes — own entry everywhere | Yes — fullscreen, own card | Yes — chromeless window |
| Works offline | Yes | Yes | Yes |
| Haptics | Yes | No | n/a |
| Push notifications | Yes | 16.4+, installed only | n/a |

## The files

| File | What it does |
|---|---|
| `index.html` | The shell — one phone-shaped column |
| `styles.css` | The look — shared byte-for-byte on every platform |
| `app.js` | Tap to count, hold to reset, persistence, install button |
| `sw.js` | The offline magic |
| `worker.js` | Owns the SQLite database (sync file access is worker-only) |
| `manifest.webmanifest` | "I am an app" — install data |
| `icon.svg` + `icon-512.png` | The icon, and the PNG iOS demands |
| `lib/` | SQLite itself, compiled to run in the browser (vendored from the official package) |

## Try it

```
python3 -m http.server 8000
# open http://127.0.0.1:8000
```

**It's live:** https://razodin137.github.io/2026-10-12-web-app-learnings/ — open that on a phone, add to home screen, airplane mode, still works.

## Where this goes next

- **Play Store, no native code:** Bubblewrap turns a hosted PWA into a store-ready Android package from the manifest alone.
- **Real native powers:** Capacitor drops these same files into a WebView inside an Android app — camera, push, proper haptics — about five lines change. Its SQLite plugin runs these same queries on a real native database, so the SQL outlives the web.
- **The paths we didn't take:** React Native shares your logic but not your CSS; Flutter is another language entirely. Wanting reusable CSS is what pointed here.