import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, completeObjective, getActiveObjectives, getProgressSignature, incrementFileView, applyProgressionFlags } from '../src/state.js';

function makeState() {
  return JSON.parse(JSON.stringify(defaultState));
}

test('chapter progression advances correctly', () => {
  const state = makeState();
  completeObjective(state, 'unlock_archive');
  assert.equal(state.chapter, 1);
  completeObjective(state, 'set_time_0311');
  assert.equal(state.chapter, 2);
});

test('view counter increments', () => {
  const state = makeState();
  incrementFileView(state, '/logs/incident.log');
  incrementFileView(state, '/logs/incident.log');
  assert.equal(state.viewed['/logs/incident.log'], 2);
});

test('tracks recent file opens when incrementing view count', () => {
  const state = makeState();
  incrementFileView(state, '/logs/incident.log');
  assert.equal(state.recentFiles.length, 1);
  assert.equal(state.recentFiles[0].path, '/logs/incident.log');
});

test('progress signature is stable and sorted', () => {
  const state = makeState();
  state.completedObjectives = ['b', 'a'];
  assert.equal(getProgressSignature(state), '1:a|b');
});


test('active objectives are filtered by role', () => {
  const state = makeState();
  state.sessionMode = 'coop';
  const operatorObjectives = getActiveObjectives(state, 'operator').map((o) => o.id);
  const observerObjectives = getActiveObjectives(state, 'observer').map((o) => o.id);

  assert.ok(operatorObjectives.includes('unlock_archive'));
  assert.ok(!operatorObjectives.includes('observer_ping_operator'));
  assert.ok(observerObjectives.includes('observer_ping_operator'));
});


test('solo mode hides co-op only objectives from active queue', () => {
  const state = makeState();
  state.sessionMode = 'solo';

  const operatorObjectives = getActiveObjectives(state, 'operator').map((o) => o.id);
  const observerObjectives = getActiveObjectives(state, 'observer').map((o) => o.id);

  assert.ok(!operatorObjectives.includes('operator_execute_relay'));
  assert.ok(!observerObjectives.includes('observer_ping_operator'));
  assert.ok(!observerObjectives.includes('observer_anomaly_trace'));
});

test('co-op mode retains co-op only objectives for the matching role', () => {
  const state = makeState();
  state.sessionMode = 'coop';

  const operatorObjectives = getActiveObjectives(state, 'operator').map((o) => o.id);
  const observerObjectives = getActiveObjectives(state, 'observer').map((o) => o.id);

  assert.ok(operatorObjectives.includes('operator_execute_relay'));
  assert.ok(observerObjectives.includes('observer_ping_operator'));
});
test('applyProgressionFlags restores ai memory defaults', () => {
  const state = { bootCount: 0, driftMinutes: 0 };
  applyProgressionFlags(state);

  assert.equal(state.aiAffinity, 0);
  assert.equal(state.aiParanoia, 0);
  assert.equal(state.aiTrustInPlayer, 0);
  assert.equal(state.aiContradictionCount, 0);
  assert.deepEqual(state.aiLastTopics, []);
});


test('applyProgressionFlags restores manifestation defaults', () => {
  const state = { bootCount: 0, driftMinutes: 0 };
  applyProgressionFlags(state);

  assert.deepEqual(state.manifestationState, {
    lastTriggeredAt: {},
    activeUntil: {},
    delivered: {},
    pendingClockLine: null
  });
});
