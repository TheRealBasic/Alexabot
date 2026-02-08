import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/state.js';
import { runScenario, stepScenario, forkBranch, replaySeed } from '../src/simulation/engine.js';
import { ensureSimulationState } from '../src/simulation/serializer.js';

function makeState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function collectEvents({ scenarioId, seed, steps = 5 }) {
  const state = makeState();
  const started = runScenario(state, { scenarioId, seed });
  assert.equal(started.ok, true);
  const sequence = [];
  for (let i = 0; i < steps; i += 1) {
    const stepped = stepScenario(state);
    assert.equal(stepped.ok, true);
    sequence.push(stepped.event.eventType);
  }
  return sequence;
}

test('deterministic replay yields same sequence for same scenario and seed', () => {
  const a = collectEvents({ scenarioId: 'relay-desync', seed: 12345, steps: 6 });
  const b = collectEvents({ scenarioId: 'relay-desync', seed: 12345, steps: 6 });
  const c = collectEvents({ scenarioId: 'relay-desync', seed: 54321, steps: 6 });

  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test('invalid scenario ids are rejected', () => {
  const state = makeState();
  const result = runScenario(state, { scenarioId: 'not-a-real-scenario', seed: 12 });

  assert.equal(result.ok, false);
  assert.match(result.message, /unknown scenario/);
});

test('concurrent run prevention rejects starting a second active run', () => {
  const state = makeState();
  const started = runScenario(state, { scenarioId: 'archive-outage', seed: 7 });
  assert.equal(started.ok, true);

  const second = runScenario(state, { scenarioId: 'panic-loop', seed: 8 });
  assert.equal(second.ok, false);
  assert.equal(second.message, 'simulation already running');
  assert.equal(state.simulationState.scenarioId, 'archive-outage');
});

test('fork branch clones source events and diverges on later steps', () => {
  const state = makeState();
  runScenario(state, { scenarioId: 'panic-loop', seed: 300 });

  stepScenario(state);
  stepScenario(state);
  const mainBeforeFork = [...state.simulationState.branches.main.eventIds];

  const forked = forkBranch(state, 'alt route');
  assert.equal(forked.ok, true);
  assert.equal(forked.branch.parentId, 'main');
  assert.deepEqual(forked.branch.eventIds, mainBeforeFork);

  stepScenario(state);
  const altAfterStep = [...state.simulationState.branches['alt-route'].eventIds];
  assert.equal(altAfterStep.length, mainBeforeFork.length + 1);
  assert.deepEqual(state.simulationState.branches.main.eventIds, mainBeforeFork);
});

test('rollback safety archives snapshot without mutating prior branch payload', () => {
  const state = makeState();
  runScenario(state, { scenarioId: 'observer-contradiction', seed: 99 });
  stepScenario(state);
  stepScenario(state);

  const beforeReplay = JSON.stringify(state.simulationState.eventLog);
  const replayed = replaySeed(state, 'main');

  assert.equal(replayed.ok, true);
  assert.equal(state.simulationState.status, 'completed');
  assert.equal(JSON.stringify(state.simulationState.eventLog), beforeReplay);
  assert.match(state.simulationState.archivedSnapshot, /"eventLog"/);
});

test('step can recover when branches are empty by recreating main branch', () => {
  const state = makeState();
  runScenario(state, { scenarioId: 'archive-outage', seed: 24 });

  state.simulationState.branches = {};
  state.simulationState.selectedBranch = null;
  const stepped = stepScenario(state);

  assert.equal(stepped.ok, true);
  assert.ok(state.simulationState.branches.main);
  assert.equal(state.simulationState.selectedBranch, 'main');
});

test('fork fails cleanly when selected branch is missing', () => {
  const state = makeState();
  runScenario(state, { scenarioId: 'relay-desync', seed: 11 });
  const sim = ensureSimulationState(state);
  sim.selectedBranch = 'does-not-exist';

  const forked = forkBranch(state, 'new-branch');
  assert.equal(forked.ok, false);
  assert.equal(forked.message, 'selected branch missing');
});
