import express from "express";
import mongoose from "mongoose";

import Bus from "../models/Bus.js";
import Train from "../models/Train.js";
import Flight from "../models/Flight.js";

const router = express.Router();

const sourceFields = [
  "source",
  "Source",
  "from",
  "From",
  "source_city",
  "source_station"
];

const destinationFields = [
  "destination",
  "Destination",
  "to",
  "To",
  "destination_city",
  "destination_station"
];

const providerFieldByType = {
  bus: "bus_name",
  train: "train_name",
  flight: "airline"
};

const cityAliases = {
  bangalore: ["Bangalore", "Bengaluru"],
  bengaluru: ["Bengaluru", "Bangalore"]
};

const normalizeRouteType = (value = "") => String(value).trim().toLowerCase();
const normalizeText = (value = "") => String(value).trim();
const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cityMatches = (value = "") => {
  const normalized = normalizeText(value);
  const aliases = cityAliases[normalized.toLowerCase()] || [normalized];
  return aliases.map((alias) => ({
    $regex: `^${escapeRegex(alias)}$`,
    $options: "i"
  }));
};

const matchAnyField = (fields, value) => ({
  $or: fields.flatMap((field) =>
    cityMatches(value).map((match) => ({ [field]: match }))
  )
});

const pick = (route, fields, fallback = "") => {
  for (const field of fields) {
    if (route[field] !== undefined && route[field] !== null && route[field] !== "") {
      return route[field];
    }
  }

  return fallback;
};

const timeToMinutes = (value = "") => {
  const cleaned = String(value).trim();
  const match = cleaned.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const parseDurationToMinutes = (value = "") => {
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

const minutesToDuration = (minutes) =>
  `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

const getTransferWaitMinutes = (arrival, departure) => {
  const arrivalMinutes = timeToMinutes(arrival);
  const departureMinutes = timeToMinutes(departure);

  if (arrivalMinutes === null || departureMinutes === null) {
    return null;
  }

  const wait =
    departureMinutes >= arrivalMinutes
      ? departureMinutes - arrivalMinutes
      : 24 * 60 - arrivalMinutes + departureMinutes;

  return wait;
};

const isValidTime = (value = "") =>
  /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value).trim());

const normalizePrice = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

const calculateDuration = (departure, arrival) => {
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

const validateRouteCreate = (payload) => {
  const errors = [];

  if (!payload.source) errors.push("Source is required.");
  if (!payload.destination) errors.push("Destination is required.");
  if (!isValidTime(payload.departure_time)) errors.push("departure_time must be in HH:mm format.");
  if (!isValidTime(payload.arrival_time)) errors.push("arrival_time must be in HH:mm format.");
  if (payload.price === undefined || payload.price === null) {
    errors.push("price is required.");
  } else if (normalizePrice(payload.price) === null) {
    errors.push("price must be a non-negative number.");
  }

  return errors;
};

const validateRouteUpdate = (payload) => {
  const errors = [];

  if (payload.departure_time !== undefined && !isValidTime(payload.departure_time)) {
    errors.push("departure_time must be in HH:mm format.");
  }
  if (payload.arrival_time !== undefined && !isValidTime(payload.arrival_time)) {
    errors.push("arrival_time must be in HH:mm format.");
  }
  if (payload.price !== undefined && normalizePrice(payload.price) === null) {
    errors.push("price must be a non-negative number.");
  }

  return errors;
};

const getProviderFieldByType = (type) =>
  providerFieldByType[normalizeRouteType(type)] || "name";

const getRoutePayload = (type, data) => {
  const routePayload = {
    source: normalizeText(data.source),
    destination: normalizeText(data.destination),
    departure_time: normalizeText(data.departure_time),
    arrival_time: normalizeText(data.arrival_time),
    duration: normalizeText(data.duration)
  };

  const price = normalizePrice(data.price);
  if (price !== null) routePayload.price = price;

  const providerField = getProviderFieldByType(type);
  if (typeof data.provider === "string" && data.provider.trim()) {
    routePayload[providerField] = data.provider.trim();
  }

  return routePayload;
};

const toRoute = (item, type) => {
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
    operator_class: pick(route, ["operator_class", "class", "Class"]),
    reliability_score: Number(pick(route, ["reliability_score", "reliabilityScore"], 0)) || undefined,
    on_time_percentage: Number(pick(route, ["on_time_percentage", "onTimePercentage"], 0)) || undefined,
    segments: route.segments || undefined
  };
};

const findByRouteInCollection = (collectionName, source, destination) =>
  mongoose.connection.db
    .collection(collectionName)
    .find({
      $and: [
        matchAnyField(sourceFields, source),
        matchAnyField(destinationFields, destination)
      ]
    })
    .toArray();

const findByRoute = async (Model, source, destination, fallbackType) => {
  const routes = await findByRouteInCollection(Model.collection.name, source, destination);
  return routes.map((route) => ({
    route,
    type: inferType(Model.collection.name, route, fallbackType)
  }));
};

const listSearchableCollections = async () => {
  const collections = await mongoose.connection.db.listCollections().toArray();
  return collections.map((collection) => collection.name).filter((name) => !ignoredCollections.has(name));
};

const findRoutesAcrossCollections = async (source, destination) => {
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

const buildConnectingRoutes = async (source, destination) => {
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
      const rankedLeg1 = leg1
        .sort((a, b) => Number(a.route.price || 0) - Number(b.route.price || 0))
        .slice(0, 3);
      const rankedLeg2 = leg2
        .sort((a, b) => Number(a.route.price || 0) - Number(b.route.price || 0))
        .slice(0, 3);

      for (const leg1Route of rankedLeg1) {
        for (const leg2Route of rankedLeg2) {
          const waitMinutes = getTransferWaitMinutes(
            pick(leg1Route.route, ["arrival_time", "Arrival", "Arrival_time"]),
            pick(leg2Route.route, ["departure_time", "Departure", "Departure_time", "dep_time"])
          );

          if (waitMinutes === null || waitMinutes < 45 || waitMinutes > 420) {
            continue;
          }

          const leg1Duration = parseDurationToMinutes(leg1Route.route.duration);
          const leg2Duration = parseDurationToMinutes(leg2Route.route.duration);
          const totalDurationMinutes = leg1Duration + leg2Duration + waitMinutes;
          const totalPrice = Number(leg1Route.route.price || 0) + Number(leg2Route.route.price || 0);
          const pattern = `${leg1Route.type}->${leg2Route.type}`;

          connections.push({
            route: {
              _id: `conn-${hub}-${leg1Route.route._id}-${leg2Route.route._id}`,
              source,
              destination,
              departure_time: pick(leg1Route.route, ["departure_time", "Departure", "Departure_time", "dep_time"]),
              arrival_time: pick(leg2Route.route, ["arrival_time", "Arrival", "Arrival_time"]),
              duration: minutesToDuration(totalDurationMinutes),
              price: totalPrice,
              provider: `Via ${hub} (${pattern})`,
              operator_class: `${waitMinutes}m transfer`,
              reliability_score: Math.min(
                Number(leg1Route.route.reliability_score || 82),
                Number(leg2Route.route.reliability_score || 82)
              ),
              on_time_percentage: Math.min(
                Number(leg1Route.route.on_time_percentage || 80),
                Number(leg2Route.route.on_time_percentage || 80)
              ),
              segments: [
                toRoute(leg1Route.route, leg1Route.type),
                toRoute(leg2Route.route, leg2Route.type)
              ]
            },
            type: "multi-modal",
            score: totalDurationMinutes * 0.5 + totalPrice * 0.08 + waitMinutes * 0.35
          });
        }
      }
    }
  }

  const seenPatterns = new Set();
  return connections
    .sort((a, b) => a.score - b.score)
    .filter((connection) => {
      const pattern = connection.route.provider;
      if (seenPatterns.has(pattern)) return false;
      seenPatterns.add(pattern);
      return true;
    })
    .slice(0, 12);
};

const getCityValues = async (Model) => {
  const fields = [...sourceFields, ...destinationFields];
  const values = await Promise.all(fields.map((field) => Model.collection.distinct(field)));
  return values.flat().filter(Boolean);
};

const inferType = (collectionName, route, fallback = "bus") => {
  const explicitType = pick(route, ["type", "Type", "mode", "Mode", "transport", "Transport"]);
  const value = explicitType || collectionName;
  const lowerValue = value.toString().toLowerCase();
  if (lowerValue.includes("flight")) return "flight";
  if (lowerValue.includes("train")) return "train";
  if (lowerValue.includes("bus")) return "bus";
  return fallback;
};

const ignoredCollections = new Set(["trips", "users", "sessions"]);

const getModelByType = (type) =>
  modelByType[normalizeRouteType(type)];

const getModelByTypeOrThrow = (type) => {
  const model = getModelByType(type);
  if (!model) {
    const supported = Object.keys(modelByType).join(", ");
    const error = new Error(`Invalid route type. Supported values: ${supported}.`);
    error.status = 400;
    throw error;
  }
  return model;
};

const sendError = (res, error) =>
  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error"
  });

const modelByType = {
  bus: Bus,
  train: Train,
  flight: Flight
};

router.post(
  "/routes",
  async (req, res) => {
    try {
      const {
        type,
        source,
        destination,
        departure_time,
        arrival_time,
        duration,
        price,
        provider
      } = req.body;

      const normalizedType = normalizeRouteType(type);
      const model = getModelByTypeOrThrow(normalizedType);

      const routePayload = getRoutePayload(normalizedType, {
        source,
        destination,
        departure_time,
        arrival_time,
        duration,
        price,
        provider
      });

      const errors = validateRouteCreate(routePayload);
      if (errors.length) {
        return res.status(400).json({
          success: false,
          message: errors.join(" ")
        });
      }

      const newRoute = await model.create(routePayload);
      return res.status(201).json({
        success: true,
        route: toRoute(newRoute, normalizedType)
      });
    } catch (error) {
      console.error(error);
      return sendError(res, error);
    }
  }
);

router.put(
  "/routes/:type/:id",
  async (req, res) => {
    try {
      const { type, id } = req.params;
      const normalizedType = normalizeRouteType(type);
      const model = getModelByTypeOrThrow(normalizedType);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid route ID"
        });
      }

      const routePayload = getRoutePayload(normalizedType, {
        ...req.body,
        provider: req.body.provider
      });

      const errors = validateRouteUpdate(routePayload);
      if (errors.length) {
        return res.status(400).json({
          success: false,
          message: errors.join(" ")
        });
      }

      const updatedRoute = await model.findByIdAndUpdate(
        id,
        routePayload,
        { new: true, runValidators: true }
      );

      if (!updatedRoute) {
        return res.status(404).json({
          success: false,
          message: "Route not found"
        });
      }

      return res.json({
        success: true,
        route: toRoute(updatedRoute, normalizedType)
      });
    } catch (error) {
      console.error(error);
      return sendError(res, error);
    }
  }
);

router.delete(
  "/routes/:type/:id",
  async (req, res) => {
    try {
      const { type, id } = req.params;
      const normalizedType = normalizeRouteType(type);
      const model = getModelByTypeOrThrow(normalizedType);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid route ID"
        });
      }

      const deletedRoute = await model.findByIdAndDelete(id);
      if (!deletedRoute) {
        return res.status(404).json({
          success: false,
          message: "Route not found"
        });
      }

      return res.json({
        success: true,
        message: "Route deleted successfully"
      });
    } catch (error) {
      console.error(error);
      return sendError(res, error);
    }
  }
);

router.get(
  "/routes",
  async (req, res) => {
    try {
      const { source, destination } = req.query;
      if (!source || !destination) {
        return res.status(400).json({
          success: false,
          message: "Source and destination are required"
        });
      }

      const [buses, trains, flights] = await Promise.all([
        findByRoute(Bus, source, destination, "bus"),
        findByRoute(Train, source, destination, "train"),
        findByRoute(Flight, source, destination, "flight")
      ]);

      const discoveredRoutes =
        buses.length || trains.length || flights.length
          ? []
          : await findRoutesAcrossCollections(source, destination);

      const connectingRoutes = await buildConnectingRoutes(source, destination);
      const routes = [
        ...buses.map((item) => toRoute(item.route, item.type)),
        ...trains.map((item) => toRoute(item.route, item.type)),
        ...flights.map((item) => toRoute(item.route, item.type)),
        ...discoveredRoutes.map((item) => toRoute(item.route, item.type)),
        ...connectingRoutes.map((item) => toRoute(item.route, item.type))
      ];

      return res.json({ success: true, routes });
    } catch (error) {
      console.error(error);
      return sendError(res, error);
    }
  }
);

const buildCollectionHandler = (Model, key) =>
  async (req, res) => {
    try {
      const routeResults = await findByRoute(Model, req.query.source, req.query.destination, key);
      return res.json({ success: true, [key]: routeResults.map((item) => item.route) });
    } catch (error) {
      console.error(error);
      return sendError(res, error);
    }
  };

router.get("/buses", buildCollectionHandler(Bus, "buses"));
router.get("/trains", buildCollectionHandler(Train, "trains"));
router.get("/flights", buildCollectionHandler(Flight, "flights"));

router.get(
  "/cities",
  async (req, res) => {
    try {
      const [busCities, trainCities, flightCities] = await Promise.all([
        getCityValues(Bus),
        getCityValues(Train),
        getCityValues(Flight)
      ]);

      const cities = new Set([...busCities, ...trainCities, ...flightCities].filter(Boolean));
      return res.json({ success: true, cities: Array.from(cities).sort() });
    } catch (error) {
      console.error(error);
      return sendError(res, error);
    }
  }
);

export default router;
