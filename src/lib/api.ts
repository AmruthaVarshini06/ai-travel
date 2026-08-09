import axios from "axios";

import {
  TravelRoute,
  WeatherCondition,
} from "@/types/travel";
import { normalizeRouteMetrics } from '@/utils/tripEstimates';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const parseDurationToMinutes = (duration = "0") => {
  const hourMatch =
    duration.match(/(\d+)\s*h/i);

  const minuteMatch =
    duration.match(/(\d+)\s*m/i);

  if (hourMatch || minuteMatch) {
    return (
      Number(hourMatch?.[1] || 0) * 60 +
      Number(minuteMatch?.[1] || 0)
    );
  }

  const parts =
    duration.split(":");

  if (parts.length >= 2) {
    return (
      (Number(parts[0]) || 0) * 60 +
      (Number(parts[1]) || 0)
    );
  }

  return Number(duration) || 0;
};

const parseTimeToMinutes = (time = "") => {
  const cleaned = String(time).trim();
  if (!cleaned) return 0;

  const parts = cleaned.split(":");
  if (parts.length >= 2) {
    const hours = Number(parts[0]) || 0;
    const minutes = Number(parts[1]) || 0;
    return hours * 60 + minutes;
  }

  return 0;
};

const computeDurationFromTimes = (
  departure = "",
  arrival = ""
) => {
  const dep = parseTimeToMinutes(departure);
  const arr = parseTimeToMinutes(arrival);
  if (!departure || !arrival) return 0;
  return arr < dep ? 24 * 60 - dep + arr : arr - dep;
};

const normalizeMode = (mode?: string) => {
  const normalized = String(mode || '').toLowerCase();
  if (normalized.includes('flight')) return 'flight';
  if (normalized.includes('train')) return 'train';
  if (normalized.includes('bus')) return 'bus';
  if (normalized.includes('cab')) return 'cab';
  return 'bus';
};
  
export const fetchTravelPlan = async (
  params: {
    source: string;
    destination: string;
    distance: number;
    style:
      | "balanced"
      | "fastest"
      | "cheapest";
    weather: WeatherCondition;
  }
): Promise<TravelRoute[]> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/transport/routes`,
      {
        params: {
          source: params.source,
          destination: params.destination,
          distance: params.distance,
          style: params.style,
          weather: params.weather,
        },
      }
    );

    const routes =
      response.data.routes ||
      response.data.data ||
      [];

    interface RouteData {
      duration?: string;
      departure_time?: string;
      arrival_time?: string;
      prediction?: { probability?: number };
      id?: string | number;
      _id?: string | number;
      type?: string;
      price?: string | number;
      source?: string;
      destination?: string;
      segments?: any[];
      reliability_score?: number;
      reliabilityScore?: number;
      on_time_percentage?: number;
    }

    const transformedRoutes: TravelRoute[] =
      routes.map((route: RouteData, index: number) => {
        let totalDuration =
          parseDurationToMinutes(route.duration);

        const normalizedMetrics = normalizeRouteMetrics({
          type: route.type,
          durationMinutes: totalDuration,
          cost: Number(route.price) || 0,
        });

        totalDuration = normalizedMetrics.durationMinutes;

        if (route.departure_time && route.arrival_time) {
          const timeBased = computeDurationFromTimes(
            route.departure_time,
            route.arrival_time
          );

          if (timeBased > totalDuration + 30) {
            totalDuration = timeBased;
          }
        }

        const delayRisk =
          route.prediction?.probability ||
          (route.reliability_score || route.reliabilityScore
            ? Math.max(0, 100 - Number(route.reliability_score || route.reliabilityScore))
            : 10);

        const reliabilityScore =
          Number(route.reliability_score || route.reliabilityScore || route.on_time_percentage) ||
          Math.max(0, 100 - delayRisk);

        return {
          id:
            route.id?.toString() ||
            route._id?.toString() ||
            `${route.type}-${index}`,

          type:
            index === 0
              ? "recommended"
              : route.type === "flight"
                ? "fastest"
                : route.type === "bus"
                  ? "cheapest"
                  : "eco-friendly",

          totalCost:
            normalizedMetrics.cost,

          totalDuration,

          reliabilityScore:
            reliabilityScore,

          co2Saved:
            route.type === "train"
              ? 45
              : route.type === "bus"
                ? 25
                : 0,

          score:
            100 - delayRisk,

          segments: route.segments && route.segments.length > 0
            ? route.segments.map((seg: any) => {
                const segmentMetrics = normalizeRouteMetrics({
                  type: seg.type || route.type,
                  durationMinutes: parseDurationToMinutes(seg.duration),
                  cost: Number(seg.price) || 0,
                });

                return {
                  mode: normalizeMode(seg.type || seg.mode || route.type),
                  from: seg.source,
                  to: seg.destination,
                  duration: Math.max(segmentMetrics.durationMinutes, 120),
                  cost: Math.max(segmentMetrics.cost, 300),
                  departureTime: seg.departure_time?.slice(0, 5) || "00:00",
                  arrivalTime: seg.arrival_time?.slice(0, 5) || "00:00",
                  delayRisk,
                };
              })
            : [
                {
                  mode: normalizeMode(route.type),
                  from: route.source,
                  to: route.destination,
                  duration: totalDuration,
                  cost: normalizedMetrics.cost,
                  departureTime:
                    route.departure_time?.slice(0, 5) || "00:00",
                  arrivalTime:
                    route.arrival_time?.slice(0, 5) || "00:00",
                  delayRisk,
                },
              ],
        };
      });

    return transformedRoutes;
  } catch (error) {
    console.error(
      "Error fetching travel plan:",
      error
    );

    throw error;
  }
};

/**
 * Predict transport delays dynamically
 */
export const predictDelay = async (
  routeId: string,
  mode: string,
  departureTime: string,
  weather: WeatherCondition
) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/transport/predict`,
      {
        routeId,
        mode,
        departureTime,
        weather,
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Prediction service error:",
      error
    );

    return {
      probability: 20,
      confidence: 0.75,
      factors: [
        "Weather",
        "Traffic",
      ],
    };
  }
};
