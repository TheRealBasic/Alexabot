import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/state.js';
import { applyAction } from '../src/progression/reducer.js';

function makeState() {
  return JSON.parse(JSON.stringify(defaultState));
}

test('unlock archive action updates state and history with actor', () => {
  const state = makeState();
  state.viewed['/home/operator/docs/continuity_overview.txt'] = 1;

  const result = applyAction(state, {
    type: 'CMD_UNLOCK_ARCHIVE',
    actor: 'p-1',
    commandLine: 'unlock archive',
    timestamp: 1000
  });

  assert.equal(state.unlocked.archive, true);
  assert.ok(state.completedObjectives.includes('unlock_archive'));
  assert.deepEqual(result.terminalLines, ['archive channel exposed']);
  assert.deepEqual(state.terminalHistory[0], { actor: 'p-1', command: 'unlock archive', timestamp: 1000 });
});

test('recover manifest emits actor-attributed notification', () => {
  const state = makeState();
  state.driftMinutes = 0;
  const ts = new Date(2003, 3, 19, 3, 11).getTime();

  const result = applyAction(state, {
    type: 'CMD_RECOVER_MANIFEST',
    actor: 'alice',
    commandLine: 'recover --manifest',
    timestamp: ts
  });

  assert.equal(state.recoveredFiles, true);
  assert.equal(result.notifications[0].actor, 'alice');
  assert.match(result.notifications[0].message, /Manifest restored/);
});
