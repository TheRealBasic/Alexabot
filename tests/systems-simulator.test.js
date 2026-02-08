import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/state.js';
import { getServiceStatusTable, restartService, tickSystemSimulation } from '../src/systems/simulator.js';

function makeState() {
  return JSON.parse(JSON.stringify(defaultState));
}

test('system simulator ticks and records snapshots', () => {
  const state = makeState();
  tickSystemSimulation(state, { now: 123456, random: () => 0.5 });

  assert.equal(state.systemSimulationState.tick, 1);
  assert.equal(state.systemSimulationState.lastTickAt, 123456);
  assert.ok(state.systemSimulationState.snapshots.length >= 1);
  assert.equal(Object.keys(state.systemSimulationState.services).length, 4);
});

test('service restart restores active status and appends trace', () => {
  const state = makeState();
  tickSystemSimulation(state, { random: () => 0.5 });

  const res = restartService(state, 'archive-daemon', 'test');
  assert.equal(res.ok, true);
  assert.equal(state.systemSimulationState.services['archive-daemon'].status, 'active');
  assert.ok(state.systemSimulationState.services['archive-daemon'].trace.some((line) => line.includes('reason=test')));
});

test('service status table surfaces anomaly and drift fields', () => {
  const state = makeState();
  tickSystemSimulation(state, { random: () => 0.0 });

  const rows = getServiceStatusTable(state);
  const archive = rows.find((row) => row.name === 'archive-daemon');
  assert.ok(archive);
  assert.equal(typeof archive.drift, 'number');
  assert.equal(typeof archive.anomaly, 'boolean');
});
