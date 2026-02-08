import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, applyProgressionFlags } from '../src/state.js';
import { createSimulationState, ensureSimulationState, loadSimulationSnapshot, serializeSimulationSnapshot } from '../src/simulation/serializer.js';

function makeState() {
  return JSON.parse(JSON.stringify(defaultState));
}

test('loadSimulationSnapshot supports new schema fields', () => {
  const state = makeState();
  const snapshot = JSON.stringify({
    activeRunId: 'sim-new',
    scenarioId: 'relay-desync',
    seed: 33,
    status: 'running',
    selectedBranch: 'main',
    branches: {
      main: { id: 'main', parentId: null, eventIds: ['evt-1'] }
    },
    eventLog: [{ id: 'evt-1', eventType: 'relay_jitter' }],
    derivedMetrics: { trustScore: -1, conflictScore: 1, chapterPressure: 1 },
    artifacts: { '/logs/simulations/sim-new.log': 'ok' }
  });

  const ok = loadSimulationSnapshot(state, snapshot);
  assert.equal(ok, true);
  assert.equal(state.simulationState.activeRunId, 'sim-new');
  assert.equal(state.simulationState.eventLog.length, 1);
  assert.equal(state.simulationState.artifacts['/logs/simulations/sim-new.log'], 'ok');
});

test('legacy snapshots without simulationState can be normalized safely', () => {
  const legacyState = { bootCount: 1, chapter: 1, completedObjectives: [] };
  applyProgressionFlags(legacyState);
  const sim = ensureSimulationState(legacyState);

  assert.deepEqual(sim, createSimulationState());
});

test('loadSimulationSnapshot handles legacy shape with missing arrays and objects', () => {
  const state = makeState();
  const legacySnapshot = JSON.stringify({
    activeRunId: 'sim-legacy',
    scenarioId: 'archive-outage',
    seed: '17',
    status: null,
    branches: null,
    selectedBranch: 5,
    eventLog: null,
    artifacts: null
  });

  const ok = loadSimulationSnapshot(state, legacySnapshot);
  assert.equal(ok, true);

  const sim = ensureSimulationState(state);
  assert.equal(sim.activeRunId, 'sim-legacy');
  assert.equal(sim.seed, 17);
  assert.equal(sim.status, 'idle');
  assert.deepEqual(sim.branches, {});
  assert.deepEqual(sim.eventLog, []);
  assert.deepEqual(sim.artifacts, {});
  assert.equal(sim.selectedBranch, null);
});

test('invalid snapshot payloads are rejected without mutation', () => {
  const state = makeState();
  const before = serializeSimulationSnapshot(state);

  assert.equal(loadSimulationSnapshot(state, 'not-json'), false);
  assert.equal(loadSimulationSnapshot(state, '[]'), true);
  assert.equal(serializeSimulationSnapshot(state), before);
});

test('serialized snapshots round-trip branch metadata and compatibility defaults', () => {
  const state = makeState();
  state.simulationState.activeRunId = 'sim-roundtrip';
  state.simulationState.scenarioId = 'panic-loop';
  state.simulationState.branches.main = { id: 'main', eventIds: ['evt-1'], createdAt: 1234 };
  state.simulationState.eventLog = [{ id: 'evt-1', eventType: 'panic_spike' }];

  const snapshot = serializeSimulationSnapshot(state);
  const next = makeState();
  const ok = loadSimulationSnapshot(next, snapshot);

  assert.equal(ok, true);
  assert.equal(next.simulationState.activeRunId, 'sim-roundtrip');
  assert.deepEqual(next.simulationState.branches.main.eventIds, ['evt-1']);
  assert.equal(next.simulationState.derivedMetrics.successRate, 0);
});
