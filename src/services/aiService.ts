import { TravelRoute, WeatherCondition } from '@/types/travel';
import { aiApi } from '@/services/api';

export const getAIRecommendation = (routes: TravelRoute[], weather: WeatherCondition) => {
  if (!routes.length) {
    return null;
  }

  if (weather === 'Storm') {
    return routes.find(r => r.segments.every(s => s.mode !== 'flight')) || routes[0];
  }
  
  return routes.reduce((prev, current) => {
    const prevScore = prev.reliabilityScore * 0.6 + (10000 / prev.totalCost) * 0.4;
    const currScore = current.reliabilityScore * 0.6 + (10000 / current.totalCost) * 0.4;
    return currScore > prevScore ? current : prev;
  });
};

export const processChatQuery = async (query: string): Promise<string> => {
  const message = query.trim();

  if (!message) {
    return "Tell me where you're going, and I'll help plan the route.";
  }

  const response = await aiApi.chat(message);
  const responseBody = response.data;

  if (!responseBody) {
    throw new Error("AI service returned no response body");
  }

  if (responseBody.success === false) {
    throw new Error(responseBody.message || "AI service returned an error");
  }

  const reply =
    typeof responseBody.data === "string"
      ? responseBody.data
      : responseBody.data?.message ||
        responseBody.data?.text ||
        responseBody.message;

  if (!reply || !reply.toString().trim()) {
    throw new Error("AI response was empty");
  }

  return reply.toString().trim();
};
