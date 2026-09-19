import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { latestForAllRoutes, latestForRoute, historyForRoute } from './db.js';
import { startScheduler, parseTrackedRoutes } from './scheduler.js';

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.FLIGHT_API_KEY;
const INTERVAL = Number(process.env.FETCH_INTERVAL_MINUTES || 30);
const ROUTES_CSV = process.env.TRACKED_ROUTES || '';

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'bharat-airfare-index-backend' });
});

// Latest fare for every tracked route
app.get('/api/fares', (req, res) => {
  res.json({ routes: latestForAllRoutes() });
});

// Latest fare for one route, e.g. /api/fares/DEL-BOM
app.get('/api/fares/:routeId', (req, res) => {
  const row = latestForRoute(req.params.routeId.toUpperCase());
  if (!row) return res.status(404).json({ error: 'No data yet for this route' });
  res.json(row);
});

// Stored history for one route (builds up over time from when tracking started)
app.get('/api/history/:routeId', (req, res) => {
  const days = Number(req.query.days || 30);
  const rows = historyForRoute(req.params.routeId.toUpperCase(), days);
  res.json({ routeId: req.params.routeId.toUpperCase(), days, points: rows });
});

// Which routes this deployment is configured to track
app.get('/api/routes', (req, res) => {
  res.json({ routes: parseTrackedRoutes(ROUTES_CSV) });
});

app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
  startScheduler({ apiKey: API_KEY, routesCsv: ROUTES_CSV, intervalMinutes: INTERVAL });
});
