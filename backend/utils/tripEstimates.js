const CITY_BASELINE = {
  Hyderabad: { Goa: { distanceKm: 650, durationMinutes: 780, cost: 2800 }, Mysore: { distanceKm: 320, durationMinutes: 520, cost: 1600 }, Bangalore: { distanceKm: 560, durationMinutes: 660, cost: 2000 }, Chennai: { distanceKm: 550, durationMinutes: 720, cost: 2100 }, default: { distanceKm: 340, durationMinutes: 480, cost: 1800 } },
  Bangalore: { Mysore: { distanceKm: 150, durationMinutes: 270, cost: 900 }, Goa: { distanceKm: 650, durationMinutes: 780, cost: 2600 }, Hyderabad: { distanceKm: 560, durationMinutes: 660, cost: 1800 }, default: { distanceKm: 260, durationMinutes: 360, cost: 1400 } },
  Mumbai: { Goa: { distanceKm: 600, durationMinutes: 720, cost: 2400 }, Hyderabad: { distanceKm: 700, durationMinutes: 840, cost: 2700 } },
  Delhi: { Jaipur: { distanceKm: 280, durationMinutes: 360, cost: 1600 }, Mumbai: { distanceKm: 1400, durationMinutes: 1500, cost: 4200 } },
  default: { distanceKm: 320, durationMinutes: 480, cost: 1800 }
};

const normalizeCityKey = (value = "") =>
  Object.keys(CITY_BASELINE).find(
    city => city.toLowerCase() === String(value).trim().toLowerCase()
  ) || String(value).trim();

const getRouteBaseline = (source, destination) => {
  const sourceKey = normalizeCityKey(source);
  const destinationKey = normalizeCityKey(destination);

  if (sourceKey && destinationKey && CITY_BASELINE[sourceKey]?.[destinationKey]) {
    return CITY_BASELINE[sourceKey][destinationKey];
  }

  if (sourceKey && destinationKey && CITY_BASELINE[destinationKey]?.[sourceKey]) {
    return CITY_BASELINE[destinationKey][sourceKey];
  }

  if (sourceKey && CITY_BASELINE[sourceKey]?.default) {
    return CITY_BASELINE[sourceKey].default;
  }

  if (destinationKey && CITY_BASELINE[destinationKey]?.default) {
    return CITY_BASELINE[destinationKey].default;
  }

  return CITY_BASELINE.default;
};

export const estimateTripMetrics = ({ source = '', destination = '', placeCount = 0, mode = 'Multi-modal' }) => {
  const baseline = getRouteBaseline(source, destination);
  const safePlaceCount = Math.max(0, Number(placeCount) || 0);
  const placeMultiplier = Math.max(1, safePlaceCount || 1);
  const normalizedMode = String(mode || '').toLowerCase();
  const modeMultiplier = normalizedMode.includes('train') ? 0.92 : normalizedMode.includes('flight') ? 0.78 : 1;

  const distanceKm = Math.round(baseline.distanceKm * (1 + Math.min(0.15, placeMultiplier * 0.03)) * modeMultiplier);
  const durationMinutes = Math.round(baseline.durationMinutes * (1 + Math.min(0.12, placeMultiplier * 0.02)) * modeMultiplier);
  const cost = Math.round(baseline.cost + safePlaceCount * 350 + (normalizedMode.includes('flight') ? 700 : 0));

  return { distanceKm, durationMinutes, cost };
};
