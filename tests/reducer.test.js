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
    role: 'operator',
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
    role: 'operator',
    commandLine: 'recover --manifest',
    timestamp: ts
  });

  assert.equal(state.recoveredFiles, true);
  assert.equal(result.notifications[0].actor, 'alice');
  assert.match(result.notifications[0].message, /Manifest restored/);
});

test('observer ping and operator relay exec complete cross-role puzzle', () => {
  const state = makeState();

  const pingResult = applyAction(state, {
    type: 'CMD_OBSERVER_PING',
    actor: 'obs-1',
    role: 'observer',
    commandLine: 'ping operator',
    timestamp: 2000
  });

  assert.match(pingResult.terminalLines[0], /relay code emitted/);
  assert.ok(state.completedObjectives.includes('observer_ping_operator'));

  const relayResult = applyAction(state, {
    type: 'CMD_EXEC_RELAY',
    actor: 'op-1',
    role: 'operator',
    commandLine: `relay exec ${state.relaySignal.code}`,
    code: state.relaySignal.code,
    timestamp: 2100
  });

  assert.deepEqual(relayResult.terminalLines, ['relay handshake accepted']);
  assert.ok(state.completedObjectives.includes('operator_execute_relay'));
});

test('observer cannot run operator-only command actions', () => {
  const state = makeState();
  state.viewed['/home/operator/docs/continuity_overview.txt'] = 1;

  const result = applyAction(state, {
    type: 'CMD_UNLOCK_ARCHIVE',
    actor: 'obs-1',
    role: 'observer',
    commandLine: 'unlock archive',
    timestamp: 1000
  });

  assert.deepEqual(result.terminalLines, ['permission denied: operator role required']);
  assert.equal(state.unlocked.archive, false);
});


test('projection mode evaluates actions without mutating canonical state', () => {
  const state = makeState();
  state.viewed['/home/operator/docs/continuity_overview.txt'] = 1;

  const result = applyAction(state, {
    type: 'CMD_UNLOCK_ARCHIVE',
    actor: 'p-1',
    role: 'operator',
    commandLine: 'unlock archive',
    timestamp: 1000
  }, { projectionMode: true });

  assert.equal(state.unlocked.archive, false);
  assert.equal(result.projectionState.unlocked.archive, true);
});
