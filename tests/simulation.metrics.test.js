import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveSimulationMetrics } from '../src/simulation/metrics.js';
import { listScenarioDefinitions } from '../src/simulation/scenarios.js';

function mkSim(eventTypes, branches = { main: { id: 'main' } }) {
  return {
    eventLog: eventTypes.map((eventType, i) => ({ id: `evt-${i + 1}`, eventType })),
    branches
  };
}

test('metrics calculate trust/conflict/pressure for archive-outage variant', () => {
  const sim = mkSim(['archive_timeout', 'cache_recover', 'operator_override', 'observer_confirm']);
  const metrics = deriveSimulationMetrics(sim);

  assert.equal(metrics.trustScore, 0);
  assert.equal(metrics.conflictScore, 1);
  assert.equal(metrics.chapterPressure, 1);
  assert.equal(metrics.eventCount, 4);
  assert.equal(metrics.branchCount, 1);
  assert.equal(metrics.successRate, 0.5);
  assert.deepEqual(metrics.confidenceInterval, { lower: 0.01, upper: 0.99 });
});

test('metrics clamp pressure to non-negative under relieving events', () => {
  const sim = mkSim(['relay_recovered', 'guided_breathing', 'system_lockstep']);
  const metrics = deriveSimulationMetrics(sim);

  assert.equal(metrics.chapterPressure, 0);
  assert.ok(metrics.trustScore > 0);
  assert.ok(metrics.conflictScore < 0);
  assert.ok(metrics.confidence > 0.5);
});

test('observer-contradiction path reflects higher conflict than reconciled path', () => {
  const highConflict = deriveSimulationMetrics(mkSim(['observer_dispute', 'contradictory_log']));
  const reconciled = deriveSimulationMetrics(mkSim(['operator_concede', 'joint_reconcile']));

  assert.ok(highConflict.conflictScore > reconciled.conflictScore);
  assert.ok(highConflict.trustScore < reconciled.trustScore);
  assert.ok(highConflict.chapterPressure > reconciled.chapterPressure);
});

test('unknown event types are neutral and do not break confidence bounds', () => {
  const metrics = deriveSimulationMetrics(mkSim(['not_real', 'still_not_real']));

  assert.equal(metrics.trustScore, 0);
  assert.equal(metrics.conflictScore, 0);
  assert.equal(metrics.chapterPressure, 0);
  assert.equal(metrics.successRate, 0);
  assert.deepEqual(metrics.confidenceInterval, { lower: 0, upper: 0 });
});

test('scenario variants have non-empty definitions suitable for metric derivation', () => {
  const scenarios = listScenarioDefinitions();
  assert.ok(scenarios.length >= 4);

  for (const scenario of scenarios) {
    assert.equal(typeof scenario.id, 'string');
    assert.ok(Array.isArray(scenario.eventTable));
    assert.ok(scenario.eventTable.length > 0);
    const metrics = deriveSimulationMetrics(mkSim(scenario.eventTable));
    assert.equal(metrics.eventCount, scenario.eventTable.length);
  }
});
