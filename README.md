# Bharat Airfare Index — Backend

Fetches **real fares** from FlightAPI.io on a schedule, stores them in a local
SQLite database, and serves a small JSON API that the website can read from.

## Important limitation

No free (or cheap) flight API gives you *past* fare history. Every provider
only returns the **current** price. This backend starts building real 30-day
history **from the moment you deploy it** — there's no way to backfill the past.

## 1. Local setup (optional, to test before deploying)

```bash
npm install
cp .env.example .env
# edit .env and put your real FLIGHT_API_KEY in
npm start
```

Server starts on `http://localhost:3000`. Endpoints:

- `GET /api/routes` — routes this deployment tracks
- `GET /api/fares` — latest fare for every tracked route
- `GET /api/fares/DEL-BOM` — latest fare for one route
- `GET /api/history/DEL-BOM?days=30` — stored price history for one route

## 2. Deploy so it runs continuously

A static website (or your own laptop) can't run this — it needs a small
server that stays alive. Free options:

### Render (recommended, easiest)

1. Push this `backend/` folder to a GitHub repo.
2. On [render.com](https://render.com), create a **Web Service**, connect the repo.
3. Build command: `npm install` — Start command: `npm start`.
4. Add environment variables from `.env.example` (paste your real `FLIGHT_API_KEY`).
5. Deploy. You'll get a URL like `https://bharat-airfare-backend.onrender.com`.

**Note:** Render's free tier sleeps after 15 minutes of no incoming traffic,
which pauses the fetch schedule too. Two fixes: upgrade to a paid instance
($7/mo keeps it always-on), or use a free external "pinger"
(e.g. [cron-job.org](https://cron-job.org)) to hit your `/` endpoint every
10 minutes, which keeps it awake.

### Railway (alternative)

Similar flow: connect the repo at [railway.app](https://railway.app), set the
same environment variables, deploy. Railway's free trial credit runs an
always-on service without the sleep issue, but it's credit-based, not
permanently free.

## 3. Point the website at your deployed backend

Once deployed, you'll have a URL like `https://your-app.onrender.com`.
Send that URL back and the website's JavaScript will be updated to fetch
real fares from it instead of the built-in demo data generator.

## Managing your API quota

`FETCH_INTERVAL_MINUTES` × number of `TRACKED_ROUTES` decides how many
FlightAPI.io calls you use per day:

```
calls per day = (24 × 60 / FETCH_INTERVAL_MINUTES) × number_of_routes
```

With the defaults (30 min, 8 routes) that's **384 calls/day**. Check your
FlightAPI.io plan's daily/monthly limit before deploying, and raise
`FETCH_INTERVAL_MINUTES` if you're on a small free allowance.
