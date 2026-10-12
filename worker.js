// The database worker. Sync OPFS file handles only exist inside workers,
// so the SQLite connection — and its database file — live here.
import initSqlite from './lib/index.mjs';

let db = null;

async function boot() {
  const sqlite3 = await initSqlite();
  const pool = await sqlite3.installOpfsSAHPoolVfs();
  db = new pool.OpfsSAHPoolDb('/tally.sqlite3');
  db.exec('CREATE TABLE IF NOT EXISTS taps (id INTEGER PRIMARY KEY, at INTEGER NOT NULL)');
  return sqlite3.version.libVersion;
}

boot()
  .then((version) => postMessage({ type: 'ready', version }))
  .catch((err) => postMessage({ type: 'error', error: String(err && (err.message || err)) }));

self.onmessage = (e) => {
  if (!db) return;
  try {
    if (e.data.type === 'add') {
      db.exec({ sql: 'INSERT INTO taps (at) VALUES (?)', bind: [Date.now()] });
    } else if (e.data.type === 'reset') {
      db.exec('DELETE FROM taps');
    } // 'read' just queries
    const count = Number(db.selectValue('SELECT COUNT(*) FROM taps'));
    postMessage({ type: 'count', count });
  } catch (err) {
    postMessage({ type: 'error', error: String(err && (err.message || err)) });
  }
};