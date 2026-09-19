import cron from 'node-cron';
import { fetchOneWayFares, cheapest } from './flightapi.js';
import { insertSnapshot } from './db.js';

function futureDateStr(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export function parseTrackedRoutes(csv) {
  return (csv || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(pair => {
      const [origin, destination] = pair.split('-').map(s => s.trim().toUpperCase());
      return { routeId: `${origin}-${destination}`, origin, destination };
    });
}

async function fetchOnce(routes, apiKey) {
  // Check a date 30 days out — a stable, realistic booking horizon.
  const date = futureDateStr(30);

  for (const { routeId, origin, destination } of routes) {
    try {
      const fares = await fetchOneWayFares({ apiKey, origin, destination, date });
      const best = cheapest(fares);
      if (!best) {
        console.warn(`[scheduler] no fares returned for ${routeId}`);
        continue;
      }
      insertSnapshot({
        routeId, origin, destination,
        airline: best.airline, price: best.price, currency: best.currency,
      });
      console.log(`[scheduler] ${routeId}: ${best.currency} ${best.price} (${best.airline})`);
    } catch (err) {
      console.error(`[scheduler] failed for ${routeId}:`, err.message);
    }
    // Small gap between calls so we don't hammer the API in a tight loop.
    await new Promise(r => setTimeout(r, 1500));
  }
}

export function startScheduler({ apiKey, routesCsv, intervalMinutes }) {
  const routes = parseTrackedRoutes(routesCsv);
  if (!apiKey) {
    console.error('[scheduler] FLIGHT_API_KEY missing — scheduler will not run.');
    return;
  }
  if (!routes.length) {
    console.error('[scheduler] No TRACKED_ROUTES configured.');
    return;
  }

  console.log(`[scheduler] tracking ${routes.length} route(s), every ${intervalMinutes} min`);

  // Run once immediately on boot, then on the configured cron schedule.
  fetchOnce(routes, apiKey);
  const cronExpr = `*/${Math.max(1, intervalMinutes)} * * * *`;
  cron.schedule(cronExpr, () => fetchOnce(routes, apiKey));
}
