const BASE_URL = 'https://api.flightapi.io';

/**
 * Fetch one-way fares for a route on a given date via FlightAPI.io.
 * URL shape verified against a working real-world integration:
 *   /onewaytrip/{API_KEY}/{origin}/{destination}/{date}/{adults}/{children}/{infants}/{cabin}/{currency}
 */
export async function fetchOneWayFares({
  apiKey, origin, destination, date, adults = 1, cabin = 'Economy', currency = 'INR'
}) {
  const url = `${BASE_URL}/onewaytrip/${apiKey}/${origin}/${destination}/${date}/${adults}/0/0/${cabin}/${currency}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });

  if (!res.ok) {
    throw new Error(`FlightAPI.io HTTP ${res.status} for ${origin}-${destination}`);
  }
  const data = await res.json();
  return parseItineraries(data, currency);
}

/** Mirrors the parsing logic from the verified reference integration. */
function parseItineraries(data, currency) {
  const itineraries = data.itineraries || [];
  const legsMap = Object.fromEntries((data.legs || []).map(l => [l.id, l]));
  const carriersMap = Object.fromEntries((data.carriers || []).map(c => [c.id, c]));
  const segmentsMap = Object.fromEntries((data.segments || []).map(s => [s.id, s]));

  const results = [];
  for (const itin of itineraries) {
    const legIds = itin.leg_ids || [];
    if (!legIds.length) continue;
    const leg = legsMap[legIds[0]] || {};
    const segIds = leg.segment_ids || [];
    const firstSeg = segmentsMap[segIds[0]] || {};
    const carrier = carriersMap[firstSeg.marketing_carrier_id] || {};

    const pricing = (itin.pricing_options || [])[0] || {};
    const price = pricing.price?.amount;
    if (price == null) continue;

    results.push({
      airline: carrier.name || carrier.iata || 'Unknown',
      price: Number(price),
      currency,
    });
  }
  return results;
}

/** Cheapest fare from a list of parsed itineraries, or null if empty. */
export function cheapest(fares) {
  if (!fares.length) return null;
  return fares.reduce((min, f) => (f.price < min.price ? f : min), fares[0]);
}
