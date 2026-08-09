import mongoose from "mongoose";

export const sourceFields = [
  "source",
  "Source",
  "from",
  "From",
  "source_city",
  "source_station"
];

export const destinationFields = [
  "destination",
  "Destination",
  "to",
  "To",
  "destination_city",
  "destination_station"
];

export const normalizeCity = (value = "") => value.trim();

export const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cityAliases = {
  bangalore: ["Bangalore", "Bengaluru"],
  bengaluru: ["Bengaluru", "Bangalore"]
};

export const cityMatches = (value = "") => {
  const normalized = normalizeCity(value);
  const aliases = cityAliases[normalized.toLowerCase()] || [normalized];
  return aliases.map((alias) => ({
    $regex: `^${escapeRegex(alias)}$`,
    $options: "i"
  }));
};

export const matchAnyField = (fields, value) => ({
  $or: fields.flatMap((field) =>
    cityMatches(value).map((match) => ({ [field]: match }))
  )
});

export const ignoredCollections = new Set(["trips", "users", "sessions"]);

export const pick = (route, fields, fallback = "") => {
  for (const field of fields) {
    if (route[field] !== undefined && route[field] !== null && route[field] !== "") {
      return route[field];
    }
  }

  return fallback;
};

export const timeToMinutes = (value = "") => {
  const cleaned = String(value).trim();
  const match = cleaned.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
};

export const parseDurationToMinutes = (value = "") => {
  const duration = String(value).trim();
  const hourMatch = duration.match(/(\d+)\s*h/i);
  const minuteMatch = duration.match(/(\d+)\s*m/i);

  if (hourMatch || minuteMatch) {
    return (
      Number(hourMatch?.[1] || 0) * 60 +
      Number(minuteMatch?.[1] || 0)
    );
  }

  const parts = duration.split(":");
  if (parts.length >= 2) {
    return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
  }

  return Number(duration) || 0;
};

export const isValidTime = (value = "") =>
  /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value).trim());

export const normalizeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const calculateDuration = (departure, arrival) => {
  const departureMinutes = timeToMinutes(departure);
  const arrivalMinutes = timeToMinutes(arrival);

  if (departureMinutes === null || arrivalMinutes === null) {
    return "";
  }

  const minutes =
    arrivalMinutes >= departureMinutes
      ? arrivalMinutes - departureMinutes
      : 24 * 60 - departureMinutes + arrivalMinutes;

  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export const validateRouteCreate = (payload) => {
  const errors = [];

  if (!payload.source) {
    errors.push("Source is required.");
  }
  if (!payload.destination) {
    errors.push("Destination is required.");
  }
  if (!isValidTime(payload.departure_time)) {
    errors.push("departure_time must be in HH:mm format.");
  }
  if (!isValidTime(payload.arrival_time)) {
    errors.push("arrival_time must be in HH:mm format.");
  }
  if (payload.price === undefined || payload.price === null) {
    errors.push("price is required.");
  } else if (payload.price < 0) {
    errors.push("price must be a non-negative number.");
  }

  return errors;
};

export const validateRouteUpdate = (payload) => {
  const errors = [];

  if (payload.departure_time !== undefined && !isValidTime(payload.departure_time)) {
    errors.push("departure_time must be in HH:mm format.");
  }
  if (payload.arrival_time !== undefined && !isValidTime(payload.arrival_time)) {
    errors.push("arrival_time must be in HH:mm format.");
  }
  if (payload.price !== undefined) {
    const normalizedPrice = normalizeNumber(payload.price);
    if (normalizedPrice === null || normalizedPrice < 0) {
      errors.push("price must be a non-negative number.");
    }
  }

  return errors;
};

export const getCityValues = async (Model) => {
  const fields = [...sourceFields, ...destinationFields];
  const values = await Promise.all(fields.map((field) => Model.collection.distinct(field)));
  return values.flat().filter(Boolean);
};

export const toRoute = (item, type) => {
  const route = typeof item.toObject === "function" ? item.toObject() : item;

  const departureTime = pick(route, [
    "departure_time",
    "Departure",
    "Departure_time",
    "dep_time"
  ]);

  const arrivalTime = pick(route, [
    "arrival_time",
    "Arrival",
    "Arrival_time"
  ]);

  const learnedDuration = pick(route, ["duration", "Duration"]);
  const calculatedDuration = calculateDuration(departureTime, arrivalTime);
  const parsedLearned = parseDurationToMinutes(learnedDuration);
  const parsedCalculated = parseDurationToMinutes(calculatedDuration);

  return {
    id: route._id.toString(),
    type,
    source: pick(route, sourceFields),
    destination: pick(route, destinationFields),
    departure_time: departureTime,
    arrival_time: arrivalTime,
    duration:
      parsedCalculated > 0 && parsedCalculated > parsedLearned
        ? calculatedDuration
        : learnedDuration || calculatedDuration,
    price: Number(
      pick(route, ["price", "Price", "fare", "Fare", "cost", "Cost"], 0)
    ),
    provider:
      pick(route, [
        "bus_name",
        "Bus_name",
        "train_name",
        "Train_name",
        "airline",
        "Airline",
        "provider",
        "Provider",
        "name",
        "Name"
      ]) || type,
    segments: route.segments || undefined
  };
};

export const inferType = (collectionName, route, fallback = "bus") => {
  const explicitType = pick(route, [
    "type",
    "Type",
    "mode",
    "Mode",
    "transport",
    "Transport"
  ]);

  const value = explicitType || collectionName;
  const lowerValue = value.toString().toLowerCase();

  if (lowerValue.includes("flight")) return "flight";
  if (lowerValue.includes("train")) return "train";
  if (lowerValue.includes("bus")) return "bus";

  return fallback;
};

export const listSearchableCollections = async () => {
  const collections = await mongoose.connection.db.listCollections().toArray();
  return collections
    .map((collection) => collection.name)
    .filter((name) => !ignoredCollections.has(name));
};

export const findByRouteInCollection = (collectionName, source, destination) =>
  mongoose.connection.db
    .collection(collectionName)
    .find({
      $and: [matchAnyField(sourceFields, source), matchAnyField(destinationFields, destination)]
    })
    .toArray();

export const findByRoute = async (Model, source, destination, fallbackType) => {
  const routes = await findByRouteInCollection(Model.collection.name, source, destination);
  return routes.map((route) => ({
    route,
    type: inferType(Model.collection.name, route, fallbackType)
  }));
};

export const findRoutesAcrossCollections = async (source, destination) => {
  const collectionNames = await listSearchableCollections();
  const results = await Promise.all(
    collectionNames.map(async (collectionName) => {
      const routes = await findByRouteInCollection(collectionName, source, destination);
      return routes.map((route) => ({
        route,
        type: inferType(collectionName, route)
      }));
    })
  );
  return results.flat();
};

export const buildConnectingRoutes = async (source, destination) => {
  const hubs = [
    "Bangalore",
    "Chennai",
    "Mumbai",
    "Delhi",
    "Hyderabad",
    "Kolkata",
    "Vijayawada"
  ];

  const validHubs = hubs.filter(
    (hub) => hub.toLowerCase() !== source.toLowerCase() && hub.toLowerCase() !== destination.toLowerCase()
  );

  const connections = [];

  for (const hub of validHubs) {
    const leg1 = await findRoutesAcrossCollections(source, hub);
    const leg2 = await findRoutesAcrossCollections(hub, destination);

    if (leg1.length > 0 && leg2.length > 0) {
      const leg1Route = leg1[0];
      const leg2Route = leg2[0];

      const leg1Duration = parseDurationToMinutes(leg1Route.route.duration);
      const leg2Duration = parseDurationToMinutes(leg2Route.route.duration);
      const totalDurationMinutes = leg1Duration + leg2Duration + 120; // 2 hour layover

      const hours = Math.floor(totalDurationMinutes / 60);
      const minutes = totalDurationMinutes % 60;

      connections.push({
        route: {
          _id: `conn-${leg1Route.route._id}-${leg2Route.route._id}`,
          source,
          destination,
          departure_time: leg1Route.route.departure_time,
          arrival_time: leg2Route.route.arrival_time,
          duration: `${hours}h ${minutes}m`,
          price: Number(leg1Route.route.price || 0) + Number(leg2Route.route.price || 0),
          provider: "Multi-modal Connecting Route",
          segments: [
            toRoute(leg1Route.route, leg1Route.type),
            toRoute(leg2Route.route, leg2Route.type)
          ]
        },
        type: "multi-modal"
      });
    }
  }

  return connections;
};

export const normalizeRouteType = (value = "") => String(value).trim().toLowerCase();

export const providerFieldByType = {
  bus: "bus_name",
  train: "train_name",
  flight: "airline"
};

export const getProviderFieldByType = (type) =>
  providerFieldByType[normalizeRouteType(type)] || "name";

export const getRoutePayload = (type, data) => {
  const routePayload = {
    source: data.source,
    destination: data.destination,
    departure_time: data.departure_time,
    arrival_time: data.arrival_time,
    duration: data.duration
  };

  if (data.price !== undefined) {
    routePayload.price = Number(data.price) || 0;
  }

  const providerField = getProviderFieldByType(type);
  if (data.provider) {
    routePayload[providerField] = data.provider;
  }

  return routePayload;
};
