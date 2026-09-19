import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '..', 'fares.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS fare_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    airline TEXT,
    price REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_route_time ON fare_snapshots(route_id, fetched_at);
`);

export function insertSnapshot({ routeId, origin, destination, airline, price, currency }) {
  db.prepare(`
    INSERT INTO fare_snapshots (route_id, origin, destination, airline, price, currency)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(routeId, origin, destination, airline || null, price, currency || 'INR');
}

export function latestForRoute(routeId) {
  return db.prepare(`
    SELECT * FROM fare_snapshots WHERE route_id = ? ORDER BY fetched_at DESC LIMIT 1
  `).get(routeId);
}

export function latestForAllRoutes() {
  return db.prepare(`
    SELECT f.* FROM fare_snapshots f
    INNER JOIN (
      SELECT route_id, MAX(fetched_at) AS max_time
      FROM fare_snapshots GROUP BY route_id
    ) latest ON f.route_id = latest.route_id AND f.fetched_at = latest.max_time
    ORDER BY f.route_id
  `).all();
}

export function historyForRoute(routeId, days = 30) {
  return db.prepare(`
    SELECT price, currency, fetched_at FROM fare_snapshots
    WHERE route_id = ? AND fetched_at >= datetime('now', ?)
    ORDER BY fetched_at ASC
  `).all(routeId, `-${days} days`);
}

export default db;
