import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'fares.json');

/** Shape: { [routeId]: [ { origin, destination, airline, price, currency, fetched_at }, ... ] } */
function loadAll() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveAll(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data), 'utf-8');
}

export function insertSnapshot({ routeId, origin, destination, airline, price, currency }) {
  const data = loadAll();
  if (!data[routeId]) data[routeId] = [];
  data[routeId].push({
    origin, destination,
    airline: airline || null,
    price, currency: currency || 'INR',
    fetched_at: new Date().toISOString(),
  });
  saveAll(data);
}

export function latestForRoute(routeId) {
  const data = loadAll();
  const rows = data[routeId] || [];
  return rows.length ? rows[rows.length - 1] : null;
}

export function latestForAllRoutes() {
  const data = loadAll();
  return Object.keys(data)
    .filter(routeId => data[routeId].length)
    .map(routeId => ({ route_id: routeId, ...data[routeId][data[routeId].length - 1] }))
    .sort((a, b) => a.route_id.localeCompare(b.route_id));
}

export function historyForRoute(routeId, days = 30) {
  const data = loadAll();
  const rows = data[routeId] || [];
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return rows
    .filter(r => new Date(r.fetched_at).getTime() >= cutoff)
    .map(r => ({ price: r.price, currency: r.currency, fetched_at: r.fetched_at }));
}
