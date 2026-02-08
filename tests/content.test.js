import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/state.js';
import { fs, getDirectoryEntries, rehydrateContentFromState } from '../src/content.js';

function makeState() {
  return JSON.parse(JSON.stringify(defaultState));
}

test('rehydrates recovered files', () => {
  const state = makeState();
  state.recoveredFiles = true;
  rehydrateContentFromState(state);
  assert.ok(fs['/home/operator/docs'].includes('postmortem.txt'));
  assert.ok(fs['/home/operator/mail'].includes('draft_9.eml'));
});

test('directory entries prioritize narrative-critical files then sort within each tier', () => {
  const state = makeState();
  const entries = getDirectoryEntries('/home/operator', state);
  const notesIdx = entries.indexOf('notes.txt');
  const desktopIdx = entries.indexOf('desktop');
  assert.ok(notesIdx >= 0);
  assert.ok(desktopIdx >= 0);
  assert.ok(notesIdx < desktopIdx);

  const rest = entries.filter((entry) => entry !== 'notes.txt');
  const sortedRest = [...rest].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(rest, sortedRest);
});


test('includes non-story OS directories at root', () => {
  const state = makeState();
  const entries = getDirectoryEntries('/', state);
  assert.ok(entries.includes('var'));
  assert.ok(entries.includes('etc'));
  assert.ok(entries.includes('proc'));
});


test('rehydrates simulation artifact entries', () => {
  const state = makeState();
  state.simulationState.activeRunId = 'sim-test';
  state.simulationState.selectedBranch = 'main';
  rehydrateContentFromState(state);

  assert.ok(fs['/logs/simulations'].includes('sim-test.log'));
  assert.ok(fs['/home/operator/docs/projections'].includes('sim-test_summary.txt'));
});
