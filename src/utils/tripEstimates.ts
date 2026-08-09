export const estimateTripMetrics = ({
  source = '',
  destination = '',
  placeCount = 0,
  mode = 'Multi-modal'
}: {
  source?: string;
  destination?: string;
  placeCount?: number;
  mode?: string;
}) => {
  const cityBaseline: Record<string, Record<string, { distanceKm: number; durationMinutes: number; cost: number }>> = {
    Hyderabad: {
      Goa: { distanceKm: 650, durationMinutes: 780, cost: 2800 },
      Mysore: { distanceKm: 320, durationMinutes: 520, cost: 1600 },
      Bangalore: { distanceKm: 560, durationMinutes: 660, cost: 2000 },
      Chennai: { distanceKm: 550, durationMinutes: 720, cost: 2100 },
      default: { distanceKm: 340, durationMinutes: 480, cost: 1800 }
    },
    Bangalore: {
      Mysore: { distanceKm: 150, durationMinutes: 270, cost: 900 },
      Goa: { distanceKm: 650, durationMinutes: 780, cost: 2600 },
      Hyderabad: { distanceKm: 560, durationMinutes: 660, cost: 1800 },
      default: { distanceKm: 260, durationMinutes: 360, cost: 1400 }
    },
    Mumbai: {
      Goa: { distanceKm: 600, durationMinutes: 720, cost: 2400 },
      Hyderabad: { distanceKm: 700, durationMinutes: 840, cost: 2700 }
    },
    Delhi: {
      Jaipur: { distanceKm: 280, durationMinutes: 360, cost: 1600 },
      Mumbai: { distanceKm: 1400, durationMinutes: 1500, cost: 4200 }
    }
  };

  const normalizeCityKey = (value = '') =>
    Object.keys(cityBaseline).find(
      city => city.toLowerCase() === String(value).trim().toLowerCase()
    ) || String(value).trim();

  const sourceKey = normalizeCityKey(source);
  const destinationKey = normalizeCityKey(destination);
  const baseline =
    (sourceKey && destinationKey && cityBaseline[sourceKey]?.[destinationKey]) ||
    (sourceKey && destinationKey && cityBaseline[destinationKey]?.[sourceKey]) ||
    (sourceKey && cityBaseline[sourceKey]?.default) ||
    (destinationKey && cityBaseline[destinationKey]?.default) ||
    { distanceKm: 320, durationMinutes: 480, cost: 1800 };

  const safePlaceCount = Math.max(0, Number(placeCount) || 0);
  const placeMultiplier = Math.max(1, safePlaceCount || 1);
  const normalizedMode = String(mode || '').toLowerCase();
  const modeMultiplier = normalizedMode.includes('train') ? 0.92 : normalizedMode.includes('flight') ? 0.78 : 1;

  const distanceKm = Math.round(baseline.distanceKm * (1 + Math.min(0.1, placeMultiplier * 0.02)) * modeMultiplier);
  const durationMinutes = Math.max(
    Math.round(baseline.durationMinutes * (1 + Math.min(0.08, placeMultiplier * 0.01)) * modeMultiplier),
    baseline.durationMinutes * 0.9
  );
  const cost = Math.max(
    Math.round(baseline.cost + safePlaceCount * 250 + (normalizedMode.includes('flight') ? 700 : 0)),
    baseline.cost * 0.9
  );

  return { distanceKm, durationMinutes, cost };
};

export const normalizeRouteMetrics = ({ type, durationMinutes, cost }: { type?: string; durationMinutes?: number | string; cost?: number | string }) => {
  const normalizedType = String(type || '').toLowerCase();
  const duration = Number(durationMinutes) || 0;
  const price = Number(cost) || 0;

  let safeDuration = duration;
  let safeCost = price;

  if (normalizedType.includes('flight')) {
    safeDuration = Math.max(safeDuration, 180);
    safeCost = Math.max(safeCost, 2500);
  } else if (normalizedType.includes('train')) {
    safeDuration = Math.max(safeDuration, 240);
    safeCost = Math.max(safeCost, 700);
  } else if (normalizedType.includes('bus')) {
    safeDuration = Math.max(safeDuration, 300);
    safeCost = Math.max(safeCost, 450);
  } else {
    safeDuration = Math.max(safeDuration, 240);
    safeCost = Math.max(safeCost, 450);
  }

  if (safeCost < 100 && safeDuration > 300) {
    safeCost = Math.max(safeCost, 500);
  }

  return { durationMinutes: safeDuration, cost: safeCost };
};
