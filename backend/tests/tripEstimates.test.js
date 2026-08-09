import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateTripMetrics } from '../utils/tripEstimates.js';

test('estimates realistic values for a Hyderabad to Goa trip', () => {
  const metrics = estimateTripMetrics({
    source: 'Hyderabad',
    destination: 'Goa',
    placeCount: 3,
    mode: 'Multi-modal'
  });

  assert.ok(metrics.distanceKm >= 500 && metrics.distanceKm <= 800);
  assert.ok(metrics.durationMinutes >= 600);
  assert.ok(metrics.cost >= 1800 && metrics.cost <= 4000);
});

test('estimates shorter values for a nearby city route', () => {
  const metrics = estimateTripMetrics({
    source: 'Bangalore',
    destination: 'Mysore',
    placeCount: 1,
    mode: 'Train'
  });

  assert.ok(metrics.distanceKm > 100 && metrics.distanceKm < 400);
  assert.ok(metrics.durationMinutes > 240 && metrics.durationMinutes < 700);
  assert.ok(metrics.cost > 800 && metrics.cost < 2500);
});
