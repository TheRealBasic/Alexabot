import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/state.js';
import { fs, getDirectoryEntries, getDynamicFile, rehydrateContentFromState } from '../src/content.js';
import { runScenario, stepScenario } from '../src/simulation/engine.js';

function makeState() {
  return JSON.parse(JSON.stringify(defaultState));
}

test('simulation artifacts become visible in directories after rehydrate', () => {
  const state = makeState();
  const started = runScenario(state, { scenarioId: 'panic-loop', seed: 77 });
  stepScenario(state);
  rehydrateContentFromState(state);

  const runId = started.runId;
  assert.ok(fs['/logs/simulations'].includes(`${runId}.log`));
  assert.ok(fs['/home/operator/docs/projections'].includes(`${runId}_summary.txt`));
});

test('dynamic log output falls back when artifact is missing', () => {
  const state = makeState();
  state.simulationState.activeRunId = 'sim-missing';
  const log = getDynamicFile('/logs/simulations/sim-missing.log', state);

  assert.equal(log, 'simulation log unavailable');
});

test('projection output uses dynamic fallback text when summary artifact is absent', () => {
  const state = makeState();
  state.simulationState.activeRunId = 'sim-fallback';
  state.simulationState.scenarioId = 'archive-outage';
  state.simulationState.selectedBranch = 'main';
  state.simulationState.derivedMetrics.trustScore = 3;
  state.simulationState.derivedMetrics.conflictScore = -1;
  state.simulationState.derivedMetrics.chapterPressure = 2;

  const txt = getDynamicFile('/home/operator/docs/projections/sim-fallback_main.txt', state);
  assert.match(txt, /Projection sim-fallback/);
  assert.match(txt, /Trust=3 Conflict=-1 Pressure=2/);
});

test('simulation files are hidden by chapter visibility constraints', () => {
  const state = makeState();
  state.chapter = 0;

  const log = getDynamicFile('/logs/simulations/x.log', state);
  const projection = getDynamicFile('/home/operator/docs/projections/x.txt', state);

  assert.equal(log, undefined);
  assert.equal(projection, undefined);
});

test('branch artifact entry is added only when selectedBranch is present', () => {
  const state = makeState();
  state.simulationState.activeRunId = 'sim-branch';
  state.simulationState.selectedBranch = null;
  rehydrateContentFromState(state);
  assert.equal(fs['/home/operator/docs/projections'].includes('sim-branch_null.txt'), false);

  state.simulationState.selectedBranch = 'alt';
  rehydrateContentFromState(state);
  assert.ok(fs['/home/operator/docs/projections'].includes('sim-branch_alt.txt'));
});

test('empty branches still allow projections directory listing to stay stable', () => {
  const state = makeState();
  state.simulationState.activeRunId = 'sim-empty';
  state.simulationState.branches = {};
  rehydrateContentFromState(state);

  const entries = getDirectoryEntries('/home/operator/docs/projections', state);
  assert.ok(entries.includes('sim-empty_summary.txt'));
});
