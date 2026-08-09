import { TravelRoute } from "@/types/travel";

/**
 * Convert time like:
 * 09:30
 * 09:30 PM
 * 6:30:00 AM
 * into minutes
 */
function timeToMinutes(timeString: string): number {
  if (!timeString) return 0;

  try {
    const cleaned = String(timeString).trim();
    const meridiem = cleaned.toUpperCase();

    // Handle AM/PM format
    if (meridiem.includes("AM") || meridiem.includes("PM")) {
      const date = new Date(`1970-01-01 ${cleaned}`);

      if (!Number.isNaN(date.getTime())) {
        return date.getHours() * 60 + date.getMinutes();
      }
    }

    // Handle HH:mm:ss
    const parts = cleaned.split(":");

    const hours = Number(parts[0] || 0);
    const minutes = Number(parts[1] || 0);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return 0;
    }

    return hours * 60 + minutes;
  } catch {
    return 0;
  }
}

const pick = (record: any, fields: string[], fallback = "") => {
  for (const field of fields) {
    const value = record?.[field];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
};

const pickNumber = (record: any, fields: string[]) => {
  const value = Number(pick(record, fields, 0));
  return Number.isFinite(value) && value > 0 ? value : 0;
};

/**
 * Safely calculate duration
 */
function calculateDuration(
  departure: string,
  arrival: string
): number {
  const dep = timeToMinutes(departure);
  const arr = timeToMinutes(arrival);

  // Handle overnight travel
  if (arr < dep) {
    return 24 * 60 - dep + arr;
  }

  return arr - dep;
}

/**
 * Build intelligent routes dynamically
 */
export function buildSmartRoutes(
  buses: any[],
  trains: any[],
  flights: any[],
  source: string,
  destination: string
): TravelRoute[] {

  const routes: TravelRoute[] = [];

  /**
   * --------------------------
   * BUS ROUTES
   * --------------------------
   */
  buses.forEach((bus: any, index: number) => {
    const departureTime = pick(bus, ["departure_time", "Departure", "Departure_time", "dep_time"]);
    const arrivalTime = pick(bus, ["arrival_time", "Arrival", "Arrival_time"]);

    const duration = calculateDuration(
      departureTime,
      arrivalTime
    );

    const price = pickNumber(bus, ["price", "Price", "fare", "Fare", "cost", "Cost"]);

    routes.push({
      id: `bus-${index}`,

      totalDuration: duration,

      totalCost: price,

      reliabilityScore: 82,

      type: "cheapest",

      co2Saved: 8,

      score: 0,

      segments: [
        {
          mode: "bus",

          from : pick(bus, ["source", "Source", "from", "From", "source_city", "source_station"], source),

          to : pick(bus, ["destination", "Destination", "to", "To", "destination_city", "destination_station"], destination),

          duration,

          cost: price,

          departureTime,

          arrivalTime,

          delayRisk: 0.2,
        },
      ],
    });
  });

  /**
   * --------------------------
   * TRAIN ROUTES
   * --------------------------
   */
  trains.forEach((train: any, index: number) => {
    const departureTime = pick(train, ["departure_time", "Departure", "Departure_time", "dep_time"]);
    const arrivalTime = pick(train, ["arrival_time", "Arrival", "Arrival_time"]);

    const duration = calculateDuration(
      departureTime,
      arrivalTime
    );

    const price = pickNumber(train, ["price", "Price", "fare", "Fare", "cost", "Cost"]);

    routes.push({
      id: `train-${index}`,

      totalDuration: duration,

      totalCost: price,

      reliabilityScore: 92,

      type: "recommended",

      co2Saved: 12,

      score: 0,

      segments: [
        {
          mode: "train",

          from: pick(train, ["source", "Source", "from", "From", "source_city", "source_station"], source),

          to: pick(train, ["destination", "Destination", "to", "To", "destination_city", "destination_station"], destination),

          duration,

          cost: price,

          departureTime,

          arrivalTime,

          delayRisk: 0.08,
        },
      ],
    });
  });

  /**
   * --------------------------
   * FLIGHT ROUTES
   * --------------------------
   */
  flights.forEach((flight: any, index: number) => {
    const departureTime = pick(flight, ["departure_time", "Departure", "Departure_time", "dep_time"]);
    const arrivalTime = pick(flight, ["arrival_time", "Arrival", "Arrival_time"]);

    const duration = calculateDuration(
      departureTime,
      arrivalTime
    );

    const price = pickNumber(flight, ["price", "Price", "fare", "Fare", "cost", "Cost"]);

    routes.push({
      id: `flight-${index}`,

      totalDuration: duration,

      totalCost: price,

      reliabilityScore: 95,

      type: "fastest",

      co2Saved: 3,

      score: 0,

      segments: [
        {
          mode: "flight",

          from: pick(flight, ["source", "Source", "from", "From", "source_city", "source_station"], source),

          to: pick(flight, ["destination", "Destination", "to", "To", "destination_city", "destination_station"], destination),

          duration,

          cost: price,

          departureTime,

          arrivalTime,

          delayRisk: 0.05,
        },
      ],
    });
  });

  /**
   * --------------------------
   * MULTI MODAL COMBINATIONS
   * --------------------------
   */

  trains.forEach((train: any, tIndex: number) => {
    const trainDeparture = pick(train, ["departure_time", "Departure", "Departure_time", "dep_time"]);
    const trainArrivalTime = pick(train, ["arrival_time", "Arrival", "Arrival_time"]);

    flights.forEach((flight: any, fIndex: number) => {
      const flightDepartureTime = pick(flight, ["departure_time", "Departure", "Departure_time", "dep_time"]);
      const flightArrivalTime = pick(flight, ["arrival_time", "Arrival", "Arrival_time"]);

      const trainArrival = timeToMinutes(
        trainArrivalTime
      );

      const flightDeparture = timeToMinutes(
        flightDepartureTime
      );

      const waitingTime =
        flightDeparture - trainArrival;

      // Allow realistic transfers
      if (waitingTime >= 45 && waitingTime <= 300) {

        const trainDuration = calculateDuration(
          trainDeparture,
          trainArrivalTime
        );

        const flightDuration = calculateDuration(
          flightDepartureTime,
          flightArrivalTime
        );

        const totalCost =
          pickNumber(train, ["price", "Price", "fare", "Fare", "cost", "Cost"]) +
          pickNumber(flight, ["price", "Price", "fare", "Fare", "cost", "Cost"]);

        const totalDuration =
          trainDuration +
          waitingTime +
          flightDuration;

        routes.push({
          id: `combo-train-flight-${tIndex}-${fIndex}`,

          totalDuration,

          totalCost,

          reliabilityScore: 90,

          type: "recommended",

          co2Saved: 6,

          score: 0,

          segments: [
            {
              mode: "train",

              from: pick(train, ["source_station", "source", "Source", "from", "From"], source),

              to: pick(train, ["destination_station", "destination", "Destination", "to", "To"], destination),

              duration: trainDuration,

              cost: pickNumber(train, ["price", "Price", "fare", "Fare", "cost", "Cost"]),

              departureTime: trainDeparture,

              arrivalTime: trainArrivalTime,

              delayRisk: 0.1,
            },

            {
              mode: "flight",

              from: pick(flight, ["Source", "source", "from", "From", "source_city"], source),

              to: pick(flight, ["destination", "Destination", "to", "To", "destination_city"], destination),

              duration: flightDuration,

              cost: pickNumber(flight, ["price", "Price", "fare", "Fare", "cost", "Cost"]),

              departureTime: flightDepartureTime,

              arrivalTime: flightArrivalTime,

              delayRisk: 0.05,
            },
          ],
        });
      }
    });
  });

  /**
   * --------------------------
   * SMART RANKING
   * --------------------------
   */

  routes.forEach((route) => {

    const costWeight = route.totalCost * 0.35;

    const durationWeight =
      route.totalDuration * 0.4;

    const reliabilityWeight =
      (100 - route.reliabilityScore) * 20;

    route.score =
      costWeight +
      durationWeight +
      reliabilityWeight;
  });

  /**
   * Sort by optimized score
   */
  routes.sort((a, b) => a.score - b.score);

  /**
 * Remove near duplicate routes
 */

const uniqueRoutes: TravelRoute[] = [];

routes.forEach((route) => {

  const isDuplicate = uniqueRoutes.some((existing) => {

    // Transport pattern
    const existingPattern =
      existing.segments
        .map((s) => s.mode)
        .join("->");

    const currentPattern =
      route.segments
        .map((s) => s.mode)
        .join("->");

    // Different route structure
    if (existingPattern !== currentPattern) {
      return false;
    }

    // Cost similarity
    const priceDifference =
      Math.abs(
        existing.totalCost - route.totalCost
      );

    // Duration similarity
    const durationDifference =
      Math.abs(
        existing.totalDuration -
        route.totalDuration
      );

    // Treat as duplicate only if both are very similar
    return (
      priceDifference <= 300 &&
      durationDifference <= 45
    );
  });

  if (!isDuplicate) {
    uniqueRoutes.push(route);
  }
});
    /**
 * Prioritize transport diversity
 */

const selectedRoutes: TravelRoute[] = [];

const usedPatterns = new Set<string>();

for (const route of uniqueRoutes) {

  const pattern =
    route.segments
      .map((s) => s.mode)
      .join("->");

  // Prefer different transport combinations
  if (!usedPatterns.has(pattern)) {

    selectedRoutes.push(route);

    usedPatterns.add(pattern);
  }

  // Stop after top 3
  if (selectedRoutes.length >= 3) {
    break;
  }
}

/**
 * Fallback:
 * if less than 3 unique combinations exist
 */

if (selectedRoutes.length < 3) {

  uniqueRoutes.forEach((route) => {

    const alreadyExists =
      selectedRoutes.some(
        (r) => r.id === route.id
      );

    if (!alreadyExists) {
      selectedRoutes.push(route);
    }
  });
}

return selectedRoutes.slice(0, 3);
}
