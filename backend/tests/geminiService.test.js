import test from 'node:test';
import assert from 'node:assert/strict';
import { processChat } from '../services/geminiService.js';

test('responds helpfully to a Goa itinerary request', async () => {
  const reply = await processChat('Suggest a 3-day itinerary for Goa');
  assert.match(reply.toLowerCase(), /goa|day 1|day 2|day 3|itinerary/);
});

test('responds helpfully to a Bangalore to Mysore route question', async () => {
  const reply = await processChat('Best way to travel from Bangalore to Mysore?');
  assert.match(reply.toLowerCase(), /bangalore|mysore|train|bus|drive/);
});

test('responds helpfully to a food recommendation request', async () => {
  const reply = await processChat('What are the top food spots in Hyderabad?');
  assert.match(reply.toLowerCase(), /hyderabad|biryani|food|restaurant/);
});
