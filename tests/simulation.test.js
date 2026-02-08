import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, applyProgressionFlags } from '../src/state.js';
import { runScenario, stepScenario, forkBranch } from '../src/simulation/engine.js';
import { ensureSimulationState, serializeSimulationSnapshot, loadSimulationSnapshot } from '../src/simulation/serializer.js';
import { getDynamicFile, rehydrateContentFromState, fs } from '../src/content.js';

function makeState() {
  return JSON.parse(JSON.stringify(defaultState));
}

test('simulation engine can start, step, and fork', () => {
  const state = makeState();
  const started = runScenario(state, { scenarioId: 'archive-outage', seed: 42 });
  assert.equal(started.ok, true);

  const stepped = stepScenario(state);
  assert.equal(stepped.ok, true);
  assert.equal(state.simulationState.eventLog.length, 1);

  const forked = forkBranch(state, 'alternate-path');
  assert.equal(forked.ok, true);
  assert.equal(state.simulationState.selectedBranch, 'alternate-path');
});

test('simulation snapshot serializes and loads', () => {
  const state = makeState();
  runScenario(state, { scenarioId: 'relay-desync', seed: 7 });
  stepScenario(state);

  const serialized = serializeSimulationSnapshot(state);
  const next = makeState();
  const ok = loadSimulationSnapshot(next, serialized);
  assert.equal(ok, true);
  assert.equal(next.simulationState.activeRunId, state.simulationState.activeRunId);
  assert.equal(next.simulationState.eventLog.length, 1);
});

test('simulation artifacts are surfaced in dynamic content', () => {
  const state = makeState();
  runScenario(state, { scenarioId: 'panic-loop', seed: 11 });
  stepScenario(state);
  rehydrateContentFromState(state);

  const runId = state.simulationState.activeRunId;
  assert.ok(fs['/logs/simulations'].includes(`${runId}.log`));
  const log = getDynamicFile(`/logs/simulations/${runId}.log`, state);
  assert.match(log, /simulation/);
});

test('applyProgressionFlags restores simulation state for old saves', () => {
  const legacy = { bootCount: 0, driftMinutes: 0 };
  applyProgressionFlags(legacy);
  ensureSimulationState(legacy);
  assert.equal(typeof legacy.simulationState, 'object');
  assert.equal(legacy.simulationState.status, 'idle');
});
