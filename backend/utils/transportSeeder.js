import Bus from "../models/Bus.js";
import Train from "../models/Train.js";
import Flight from "../models/Flight.js";

const cities = [
  "Hyderabad",
  "Bangalore",
  "Chennai",
  "Mumbai",
  "Delhi",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Coimbatore",
  "Goa",
  "Jaipur",
  "Visakhapatnam",
  "Surat",
  "Lucknow",
  "Bhopal",
  "Patna",
  "Indore",
  "Kanpur",
  "Nagpur",
  "Thiruvananthapuram",
  "Kochi",
  "Guwahati",
  "Chandigarh",
  "Amritsar",
  "Nashik",
  "Madurai",
  "Vadodara",
  "Agra",
  "Raipur",
  "Ranchi",
  "Vijayawada",
  "Guntur",
  "Rajahmundry",
  "Tirupati",
  "Nellore",
  "Kurnool",
  "Anantapur",
  "Kadapa",
  "Kakinada"
];

const cityCoordinates = {
  Hyderabad: { lat: 17.385, lon: 78.4867, airport: true, tier: 1 },
  Bangalore: { lat: 12.9716, lon: 77.5946, airport: true, tier: 1 },
  Chennai: { lat: 13.0827, lon: 80.2707, airport: true, tier: 1 },
  Mumbai: { lat: 19.076, lon: 72.8777, airport: true, tier: 1 },
  Delhi: { lat: 28.7041, lon: 77.1025, airport: true, tier: 1 },
  Pune: { lat: 18.5204, lon: 73.8567, airport: true, tier: 1 },
  Kolkata: { lat: 22.5726, lon: 88.3639, airport: true, tier: 1 },
  Ahmedabad: { lat: 23.0225, lon: 72.5714, airport: true, tier: 1 },
  Coimbatore: { lat: 11.0168, lon: 76.9558, airport: true, tier: 2 },
  Goa: { lat: 15.2993, lon: 74.124, airport: true, tier: 2 },
  Jaipur: { lat: 26.9124, lon: 75.7873, airport: true, tier: 2 },
  Visakhapatnam: { lat: 17.6868, lon: 83.2185, airport: true, tier: 2 },
  Surat: { lat: 21.1702, lon: 72.8311, airport: true, tier: 2 },
  Lucknow: { lat: 26.8467, lon: 80.9462, airport: true, tier: 2 },
  Bhopal: { lat: 23.2599, lon: 77.4126, airport: true, tier: 2 },
  Patna: { lat: 25.5941, lon: 85.1376, airport: true, tier: 2 },
  Indore: { lat: 22.7196, lon: 75.8577, airport: true, tier: 2 },
  Kanpur: { lat: 26.4499, lon: 80.3319, airport: false, tier: 3 },
  Nagpur: { lat: 21.1458, lon: 79.0882, airport: true, tier: 2 },
  Thiruvananthapuram: { lat: 8.5241, lon: 76.9366, airport: true, tier: 2 },
  Kochi: { lat: 9.9312, lon: 76.2673, airport: true, tier: 2 },
  Guwahati: { lat: 26.1445, lon: 91.7362, airport: true, tier: 2 },
  Chandigarh: { lat: 30.7333, lon: 76.7794, airport: true, tier: 2 },
  Amritsar: { lat: 31.634, lon: 74.8723, airport: true, tier: 2 },
  Nashik: { lat: 19.9975, lon: 73.7898, airport: false, tier: 3 },
  Madurai: { lat: 9.9252, lon: 78.1198, airport: true, tier: 2 },
  Vadodara: { lat: 22.3072, lon: 73.1812, airport: true, tier: 2 },
  Agra: { lat: 27.1767, lon: 78.0081, airport: true, tier: 3 },
  Raipur: { lat: 21.2514, lon: 81.6296, airport: true, tier: 2 },
  Ranchi: { lat: 23.3441, lon: 85.3096, airport: true, tier: 2 },
  Vijayawada: { lat: 16.5062, lon: 80.648, airport: true, tier: 2 },
  Guntur: { lat: 16.3067, lon: 80.4365, airport: false, tier: 3 },
  Rajahmundry: { lat: 16.9891, lon: 81.7718, airport: true, tier: 3 },
  Tirupati: { lat: 13.6288, lon: 79.4192, airport: true, tier: 3 },
  Nellore: { lat: 14.4426, lon: 79.9865, airport: false, tier: 3 },
  Kurnool: { lat: 15.8281, lon: 78.0373, airport: true, tier: 3 },
  Anantapur: { lat: 14.6816, lon: 77.6002, airport: false, tier: 3 },
  Kadapa: { lat: 14.4674, lon: 78.8242, airport: true, tier: 3 },
  Kakinada: { lat: 16.9891, lon: 82.2475, airport: false, tier: 3 }
};

const busProviders = [
  "APSRTC Garuda",
  "KSRTC Airavat",
  "Orange Travels",
  "VRL Travels",
  "IntrCity SmartBus",
  "SRS Travels",
  "Kaveri Travels",
  "National Travels"
];

const trainProviders = [
  "Vande Bharat Express",
  "Shatabdi Express",
  "Duronto Express",
  "Rajdhani Express",
  "Intercity Express",
  "Superfast Express",
  "Mail Express"
];

const flightProviders = [
  "IndiGo",
  "Air India",
  "Vistara",
  "Akasa Air",
  "SpiceJet",
  "Air India Express"
];

const busVariants = [
  { className: "AC Sleeper", hour: 21, minute: 15, speed: 52, priceFactor: 1.85, reliability: 84 },
  { className: "Volvo Semi Sleeper", hour: 7, minute: 30, speed: 50, priceFactor: 1.65, reliability: 82 },
  { className: "Non-AC Seater", hour: 14, minute: 0, speed: 44, priceFactor: 1.25, reliability: 76 }
];

const trainVariants = [
  { className: "Premium Chair Car", hour: 6, minute: 10, speed: 78, priceFactor: 1.4, reliability: 91 },
  { className: "Sleeper Express", hour: 20, minute: 45, speed: 63, priceFactor: 0.95, reliability: 86 },
  { className: "Intercity Reserved", hour: 12, minute: 20, speed: 68, priceFactor: 1.1, reliability: 88 }
];

const flightVariants = [
  { className: "Economy Morning", hour: 8, minute: 35, speed: 610, priceFactor: 4.7, reliability: 89 },
  { className: "Economy Evening", hour: 18, minute: 10, speed: 590, priceFactor: 5.2, reliability: 86 }
];

const majorHubs = new Set([
  "Hyderabad",
  "Bangalore",
  "Chennai",
  "Mumbai",
  "Delhi",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Goa",
  "Jaipur",
  "Nagpur",
  "Kochi",
  "Vijayawada"
]);

const formatTwoDigits = (value) => String(value).padStart(2, "0");
const buildTime = (hour, minute = 0) => `${formatTwoDigits(hour)}:${formatTwoDigits(minute)}`;

const addMinutes = (time, minutesToAdd) => {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + minutesToAdd;
  return buildTime(Math.floor((total / 60) % 24), total % 60);
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const haversineDistance = (pointA, pointB) => {
  const R = 6371;
  const dLat = toRadians(pointB.lat - pointA.lat);
  const dLon = toRadians(pointB.lon - pointA.lon);
  const lat1 = toRadians(pointA.lat);
  const lat2 = toRadians(pointB.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const choose = (items, seed) => items[Math.abs(seed) % items.length];

const formatDuration = (minutes) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

const routeDistance = (source, destination, factor) => {
  const rawDistance = haversineDistance(cityCoordinates[source], cityCoordinates[destination]);
  return Math.max(45, Math.round(rawDistance * factor));
};

const shouldCreateFlight = (source, destination, distanceKm) => {
  const sourceMeta = cityCoordinates[source];
  const destinationMeta = cityCoordinates[destination];
  if (!sourceMeta.airport || !destinationMeta.airport) return false;
  if (majorHubs.has(source) || majorHubs.has(destination)) return distanceKm >= 260;
  return distanceKm >= 450;
};

const createRecord = ({
  source,
  destination,
  distanceKm,
  variant,
  provider,
  providerField,
  minMinutes,
  minPrice,
  terminalBuffer = 0
}) => {
  const jitter = (source.length * 7 + destination.length * 11 + variant.minute) % 26;
  const minutes = Math.round(Math.max(minMinutes, (distanceKm / variant.speed) * 60 + terminalBuffer + jitter));
  const departure = buildTime((variant.hour + source.length + destination.length) % 24, variant.minute);
  const price = Math.round(Math.max(minPrice, distanceKm * variant.priceFactor + jitter * 12));
  const reliability = Math.max(70, Math.min(96, variant.reliability - Math.floor(distanceKm / 900)));

  return {
    source,
    destination,
    departure_time: departure,
    arrival_time: addMinutes(departure, minutes),
    duration: formatDuration(minutes),
    price,
    [providerField]: provider,
    operator_class: variant.className,
    reliability_score: reliability,
    on_time_percentage: reliability - 2
  };
};

const buildRouteRecords = () => {
  const busRoutes = [];
  const trainRoutes = [];
  const flightRoutes = [];

  for (let i = 0; i < cities.length; i += 1) {
    for (let j = 0; j < cities.length; j += 1) {
      if (i === j) continue;

      const source = cities[i];
      const destination = cities[j];
      const directDistance = routeDistance(source, destination, 1);
      const roadDistance = routeDistance(source, destination, 1.18);
      const railDistance = routeDistance(source, destination, 1.08);
      const airDistance = routeDistance(source, destination, 1.02);
      const seed = i * cities.length + j;

      const busCount = directDistance < 180 ? 2 : 3;
      busVariants.slice(0, busCount).forEach((variant, index) => {
        busRoutes.push(
          createRecord({
            source,
            destination,
            distanceKm: roadDistance,
            variant,
            provider: choose(busProviders, seed + index),
            providerField: "bus_name",
            minMinutes: directDistance < 120 ? 120 : 270,
            minPrice: directDistance < 120 ? 180 : 450
          })
        );
      });

      const trainCount = directDistance < 140 ? 2 : 3;
      trainVariants.slice(0, trainCount).forEach((variant, index) => {
        trainRoutes.push(
          createRecord({
            source,
            destination,
            distanceKm: railDistance,
            variant,
            provider: choose(trainProviders, seed + index),
            providerField: "train_name",
            minMinutes: directDistance < 120 ? 90 : 210,
            minPrice: directDistance < 120 ? 90 : 260
          })
        );
      });

      if (shouldCreateFlight(source, destination, directDistance)) {
        const flightCount = directDistance > 700 || majorHubs.has(source) || majorHubs.has(destination) ? 2 : 1;
        flightVariants.slice(0, flightCount).forEach((variant, index) => {
          flightRoutes.push(
            createRecord({
              source,
              destination,
              distanceKm: airDistance,
              variant,
              provider: choose(flightProviders, seed + index),
              providerField: "airline",
              minMinutes: 75,
              minPrice: directDistance < 450 ? 2600 : 3400,
              terminalBuffer: 95
            })
          );
        });
      }
    }
  }

  return { busRoutes, trainRoutes, flightRoutes };
};

export const clearTransportData = async () =>
  Promise.all([Bus.deleteMany({}), Train.deleteMany({}), Flight.deleteMany({})]);

export const seedTransportData = async () => {
  const { busRoutes, trainRoutes, flightRoutes } = buildRouteRecords();
  await clearTransportData();
  await Promise.all([Bus.createIndexes(), Train.createIndexes(), Flight.createIndexes()]);
  await Promise.all([
    Bus.insertMany(busRoutes),
    Train.insertMany(trainRoutes),
    Flight.insertMany(flightRoutes)
  ]);

  return {
    buses: busRoutes.length,
    trains: trainRoutes.length,
    flights: flightRoutes.length,
    total: busRoutes.length + trainRoutes.length + flightRoutes.length
  };
};
