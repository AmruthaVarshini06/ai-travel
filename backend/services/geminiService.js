import { GoogleGenerativeAI } from "@google/generative-ai";
import mongoose from "mongoose";
import Bus from "../models/Bus.js";
import Train from "../models/Train.js";
import Flight from "../models/Flight.js";

let providerDisabled = false;

const sourceFields = ["source", "Source", "from", "From", "source_city", "source_station"];
const destinationFields = ["destination", "Destination", "to", "To", "destination_city", "destination_station"];

const cityAliases = {
  bangalore: ["Bangalore", "Bengaluru"],
  bengaluru: ["Bengaluru", "Bangalore"]
};

const connectionHubs = [
  "Bangalore",
  "Chennai",
  "Mumbai",
  "Delhi",
  "Hyderabad",
  "Kolkata",
  "Vijayawada",
  "Pune",
  "Nagpur",
  "Ahmedabad"
];

const pick = (route, fields, fallback = "") => {
  for (const field of fields) {
    if (route[field] !== undefined && route[field] !== null && route[field] !== "") {
      return route[field];
    }
  }

  return fallback;
};

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cityMatches = (value = "") => {
  const normalized = value.trim();
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

const routeQuery = (source, destination) => ({
  $and: [matchAnyField(sourceFields, source), matchAnyField(destinationFields, destination)]
});

const parseDurationToMinutes = (value = "") => {
  const duration = String(value).trim();
  const hourMatch = duration.match(/(\d+)\s*h/i);
  const minuteMatch = duration.match(/(\d+)\s*m/i);

  if (hourMatch || minuteMatch) {
    return Number(hourMatch?.[1] || 0) * 60 + Number(minuteMatch?.[1] || 0);
  }

  const parts = duration.split(":");
  if (parts.length >= 2) {
    return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
  }

  return Number(duration) || 0;
};

const timeToMinutes = (value = "") => {
  const match = String(value).trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const transferWaitMinutes = (arrival, departure) => {
  const arrivalMinutes = timeToMinutes(arrival);
  const departureMinutes = timeToMinutes(departure);
  if (arrivalMinutes === null || departureMinutes === null) return null;
  return departureMinutes >= arrivalMinutes
    ? departureMinutes - arrivalMinutes
    : 24 * 60 - arrivalMinutes + departureMinutes;
};

const formatDuration = (minutes) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

const normalizeRoute = (route, type) => ({
  id: route._id?.toString?.() || `${type}-${pick(route, sourceFields)}-${pick(route, destinationFields)}`,
  type,
  source: pick(route, sourceFields),
  destination: pick(route, destinationFields),
  departure: pick(route, ["departure_time", "Departure", "Departure_time", "dep_time"]),
  arrival: pick(route, ["arrival_time", "Arrival", "Arrival_time"]),
  duration: pick(route, ["duration", "Duration"]),
  price: Number(pick(route, ["price", "Price", "fare", "Fare", "cost", "Cost"], 0)),
  provider: pick(
    route,
    [
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
    ],
    type
  ),
  operatorClass: pick(route, ["operator_class", "class", "Class"]),
  reliabilityScore: Number(pick(route, ["reliability_score", "reliabilityScore"], 0)) || undefined,
  onTimePercentage: Number(pick(route, ["on_time_percentage", "onTimePercentage"], 0)) || undefined,
  segments: route.segments || undefined
});

const extractRouteRequest = (message) => {
  const cleaned = String(message || "").replace(/\s+/g, " ").trim();
  const patterns = [
    /from\s+([a-zA-Z\s.]+?)\s+to\s+([a-zA-Z\s.]+?)(?:\s+(?:by|via|on|for|under|tomorrow|today)|[?.!,]|$)/i,
    /between\s+([a-zA-Z\s.]+?)\s+and\s+([a-zA-Z\s.]+?)(?:\s+(?:by|via|on|for|under|tomorrow|today)|[?.!,]|$)/i,
    /(?:route|travel|trip|journey)\s+([a-zA-Z\s.]+?)\s+to\s+([a-zA-Z\s.]+?)(?:\s+(?:by|via|on|for|under|tomorrow|today)|[?.!,]|$)/i,
    /^([a-zA-Z\s.]+?)\s+to\s+([a-zA-Z\s.]+?)(?:\s+(?:by|via|on|for|under|tomorrow|today)|[?.!,]|$)/i
  ];

  const match = patterns.map((pattern) => cleaned.match(pattern)).find(Boolean);
  if (!match) return null;

  return {
    source: match[1].trim(),
    destination: match[2].trim()
  };
};

const getDirectRoutesFromDatabase = async (source, destination, limit = 6) => {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  const query = routeQuery(source, destination);
  const [buses, trains, flights] = await Promise.all([
    Bus.collection.find(query).limit(limit).toArray(),
    Train.collection.find(query).limit(limit).toArray(),
    Flight.collection.find(query).limit(limit).toArray()
  ]);

  return [
    ...buses.map((route) => normalizeRoute(route, "bus")),
    ...trains.map((route) => normalizeRoute(route, "train")),
    ...flights.map((route) => normalizeRoute(route, "flight"))
  ].sort((a, b) => {
    const reliabilityDiff = (b.reliabilityScore || 80) - (a.reliabilityScore || 80);
    if (Math.abs(reliabilityDiff) > 4) return reliabilityDiff;
    return a.price - b.price;
  });
};

const getConnectingRoutesFromDatabase = async (source, destination) => {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }

  const validHubs = connectionHubs.filter(
    (hub) => hub.toLowerCase() !== source.toLowerCase() && hub.toLowerCase() !== destination.toLowerCase()
  );
  const connections = [];

  for (const hub of validHubs) {
    const [firstLegs, secondLegs] = await Promise.all([
      getDirectRoutesFromDatabase(source, hub, 3),
      getDirectRoutesFromDatabase(hub, destination, 3)
    ]);

    for (const firstLeg of firstLegs.slice(0, 3)) {
      for (const secondLeg of secondLegs.slice(0, 3)) {
        const wait = transferWaitMinutes(firstLeg.arrival, secondLeg.departure);
        if (wait === null || wait < 45 || wait > 420) continue;

        const totalDuration =
          parseDurationToMinutes(firstLeg.duration) +
          wait +
          parseDurationToMinutes(secondLeg.duration);
        const totalPrice = firstLeg.price + secondLeg.price;

        connections.push({
          id: `chat-${firstLeg.id}-${secondLeg.id}`,
          type: "multi-modal",
          source,
          destination,
          departure: firstLeg.departure,
          arrival: secondLeg.arrival,
          duration: formatDuration(totalDuration),
          price: totalPrice,
          provider: `Via ${hub}`,
          operatorClass: `${firstLeg.type} + ${secondLeg.type}, ${wait}m transfer`,
          reliabilityScore: Math.min(firstLeg.reliabilityScore || 82, secondLeg.reliabilityScore || 82),
          onTimePercentage: Math.min(firstLeg.onTimePercentage || 80, secondLeg.onTimePercentage || 80),
          segments: [firstLeg, secondLeg],
          score: totalDuration * 0.5 + totalPrice * 0.08 + wait * 0.25
        });
      }
    }
  }

  return connections.sort((a, b) => a.score - b.score).slice(0, 6);
};

const getRoutesFromDatabase = async (source, destination) => {
  const [directRoutes, connectingRoutes] = await Promise.all([
    getDirectRoutesFromDatabase(source, destination),
    getConnectingRoutesFromDatabase(source, destination)
  ]);

  return [...directRoutes, ...connectingRoutes].slice(0, 12);
};

const prioritizeRoutesForPrompt = (routes, prompt) => {
  const wantsCombination =
    /multi|combo|combination|connect|connecting|via|mixed/i.test(prompt);

  if (!wantsCombination) {
    return routes;
  }

  return [...routes].sort((a, b) => {
    if (a.type === "multi-modal" && b.type !== "multi-modal") return -1;
    if (b.type === "multi-modal" && a.type !== "multi-modal") return 1;
    return parseDurationToMinutes(a.duration) - parseDurationToMinutes(b.duration);
  });
};

const comparisonRoutesForPrompt = (routes, prompt) => {
  if (!/multi|combo|combination|connect|connecting|via|mixed/i.test(prompt)) {
    return routes;
  }

  const combinedRoutes = routes.filter((route) => route.type === "multi-modal");
  return combinedRoutes.length ? combinedRoutes : routes;
};

const buildRouteLines = (routes) =>
  routes.slice(0, 6).map((route, index) => {
    const reliability = route.reliabilityScore ? `, reliability ${route.reliabilityScore}%` : "";
    const operatorClass = route.operatorClass ? ` (${route.operatorClass})` : "";
    return `${index + 1}. ${route.type.toUpperCase()} - ${route.provider}${operatorClass}: ${route.departure || "time N/A"} -> ${route.arrival || "time N/A"}, ${route.duration || "duration N/A"}, Rs. ${route.price || "N/A"}${reliability}`;
  });

const buildPrompt = (message, routeContext = null) => {
  const routeSummary = routeContext
    ? `
Known route options from ${routeContext.source} to ${routeContext.destination}:
${routeContext.lines.join("\n")}

Use these route options to compare reliability, price, duration, and mixed transport choices.
`
    : "";

  return `You are Travel Mate, an expert travel concierge for a smart travel assistant.
Your goal is to provide practical, user-friendly travel guidance for Indian journeys.
Keep the response concise, clear, and helpful. Use bullets or numbered suggestions when useful.
If the user asks for routes, ticketing, budgets, or reliability, use the route options provided.
If the user asks for live availability or exact current prices, say they should verify before booking.

${routeSummary}
User message:
${message}
`;
};

const fallbackReply = async (message, routeContext = null) => {
  const lowerMessage = message.toLowerCase();
  const routeRequest = extractRouteRequest(message);

  if (routeContext?.routes?.length) {
    const routes = prioritizeRoutesForPrompt(routeContext.routes, message);
    const comparisonRoutes = comparisonRoutesForPrompt(routes, message);
    const cheapest = [...comparisonRoutes].sort((a, b) => a.price - b.price)[0];
    const fastest = [...comparisonRoutes].sort(
      (a, b) => parseDurationToMinutes(a.duration) - parseDurationToMinutes(b.duration)
    )[0];
    const reliable = [...comparisonRoutes].sort(
      (a, b) => (b.reliabilityScore || 0) - (a.reliabilityScore || 0)
    )[0];

    return `I found ${routeContext.routes.length} route option(s) from ${routeContext.source} to ${routeContext.destination}.\n\n${buildRouteLines(routes).join("\n")}\n\nBest picks:\n- Budget: ${cheapest.type.toUpperCase()} by ${cheapest.provider} for Rs. ${cheapest.price}\n- Fastest: ${fastest.type.toUpperCase()} by ${fastest.provider}, ${fastest.duration}\n- Most reliable: ${reliable.type.toUpperCase()} by ${reliable.provider}${reliable.reliabilityScore ? ` (${reliable.reliabilityScore}% reliability)` : ""}\n\nPlease verify final fares and availability before booking.`;
  }

  if (routeRequest) {
    const routes = await getRoutesFromDatabase(routeRequest.source, routeRequest.destination);

    if (routes.length > 0) {
      const prioritizedRoutes = prioritizeRoutesForPrompt(routes, message);
      const comparisonRoutes = comparisonRoutesForPrompt(prioritizedRoutes, message);
      const cheapest = [...comparisonRoutes].sort((a, b) => a.price - b.price)[0];
      const routeLines = buildRouteLines(prioritizedRoutes).join("\n");
      return `I found ${routes.length} route option(s) from ${routeRequest.source} to ${routeRequest.destination}:\n\n${routeLines}\n\nBest budget pick: ${cheapest.type.toUpperCase()} by ${cheapest.provider} for Rs. ${cheapest.price}. Please verify final fares and availability before booking.`;
    }

    if (lowerMessage.includes("bangalore") && lowerMessage.includes("mysore")) {
      return "For Bangalore to Mysore, a train or bus is usually the most comfortable and budget-friendly option. If you want the fastest trip, a car or taxi is best, and leaving early helps avoid traffic.";
    }

    return `I could not find saved routes from ${routeRequest.source} to ${routeRequest.destination}, but I can still help with planning. Try checking the city spelling, or ask for a route through a major hub like Hyderabad, Bangalore, Chennai, Mumbai, Delhi, Pune, or Vijayawada.`;
  }

  if (
    lowerMessage.includes("goa") &&
    (lowerMessage.includes("itinerary") ||
      lowerMessage.includes("trip") ||
      lowerMessage.includes("3-day") ||
      lowerMessage.includes("3 day"))
  ) {
    return "A simple 3-day Goa plan: Day 1 for North Goa beaches and Fort Aguada, Day 2 for Dudhsagar Falls and spice plantations, and Day 3 for South Goa beaches and a relaxed evening. This keeps the trip balanced without rushing.";
  }

  if (
    lowerMessage.includes("hyderabad") &&
    (lowerMessage.includes("food") || lowerMessage.includes("restaurant") || lowerMessage.includes("dining"))
  ) {
    return "For Hyderabad, start with biryani at Paradise or Cafe Bahar, try haleem at Pista House, and spend your evening exploring Jubilee Hills or Banjara Hills for cafes and local favorites.";
  }

  if (lowerMessage.includes("delay") || lowerMessage.includes("rain")) {
    return "For weather-related delays, prefer trains or buses over flights when rain is expected, and leave extra buffer time between connections.";
  }

  if (lowerMessage.includes("budget") || lowerMessage.includes("cheap")) {
    return "For a budget-friendly trip, compare buses and trains first, travel during off-peak hours, and keep one backup option for delays.";
  }

  if (lowerMessage.includes("itinerary") || lowerMessage.includes("trip")) {
    return "I can help plan an itinerary. Tell me the destination, how many days you have, your budget, and whether you want adventure, relaxation, or food-focused travel.";
  }

  return "Tell me your source and destination, and I can help with route options, budgets, delays, or itinerary ideas.";
};

export const processChat = async (message) => {
  const prompt = message?.trim();

  if (!prompt) {
    return "Please enter a travel question so I can help.";
  }

  const routeRequest = extractRouteRequest(prompt);
  let routeContext = null;

  if (routeRequest) {
    const routes = prioritizeRoutesForPrompt(
      await getRoutesFromDatabase(routeRequest.source, routeRequest.destination),
      prompt
    );
    if (routes.length > 0) {
      routeContext = {
        source: routeRequest.source,
        destination: routeRequest.destination,
        routes,
        lines: buildRouteLines(routes)
      };
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return fallbackReply(prompt, routeContext);
  }

  try {
    if (providerDisabled) {
      return fallbackReply(prompt, routeContext);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent(buildPrompt(prompt, routeContext));
    const response = await result.response;
    const text = response.text?.();

    return text?.trim() || await fallbackReply(prompt, routeContext);
  } catch (error) {
    if (
      error.message?.includes("API key") ||
      error.message?.includes("PERMISSION_DENIED") ||
      error.message?.includes("403")
    ) {
      providerDisabled = true;
    }

    console.log("Gemini Error:", error.message);
    return fallbackReply(prompt, routeContext);
  }
};

export const getGeminiStatus = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  const apiKeyConfigured = Boolean(apiKey && apiKey.trim());

  return {
    provider: apiKeyConfigured ? "gemini" : "fallback",
    apiKeyConfigured,
    providerDisabled,
    message: apiKeyConfigured
      ? providerDisabled
        ? "Gemini is disabled due to provider errors; fallback responses are active."
        : "Gemini is configured and ready."
      : "Gemini API key is not configured; fallback responses are active."
  };
};
