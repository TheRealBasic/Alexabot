import test from 'node:test';
import assert from 'node:assert/strict';
import { applyProgressionFlags, completeObjective, defaultState, getActiveObjectives, getProgressSignature, incrementFileView, recordCommandTelemetry, refreshChapterFromState, updateGuidanceMetrics } from '../src/state.js';

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


test('guidance metrics track failed streaks, idle time, and unresolved duration', () => {
  const state = makeState();
  recordCommandTelemetry(state, { success: false, timestamp: 1_000 });
  recordCommandTelemetry(state, { success: false, timestamp: 2_000 });
  assert.equal(state.guidanceMetrics.failedCommandStreak, 2);

  updateGuidanceMetrics(state, 122_000);
  assert.equal(state.guidanceMetrics.idleMs, 120_000);
  assert.equal(state.guidanceMetrics.unresolvedObjectiveDurationMs, 121_000);
});

test('completing an objective resets hint intensity state', () => {
  const state = makeState();
  state.guidanceMetrics.hintTier = 3;
  state.guidanceMetrics.failedCommandStreak = 4;
  state.guidanceMetrics.lastHintTierPrompted = 3;

  completeObjective(state, 'onboarding_run_help');

  assert.equal(state.guidanceMetrics.hintTier, 0);
  assert.equal(state.guidanceMetrics.failedCommandStreak, 0);
  assert.equal(state.guidanceMetrics.lastHintTierPrompted, 0);
});


test('refreshChapterFromState returns chapter transition metadata', () => {
  const state = makeState();
  state.completedObjectives = ['unlock_archive', 'set_time_0311'];

  const update = refreshChapterFromState(state);

  assert.equal(update.previousChapter, 1);
  assert.equal(update.chapter, 2);
  assert.equal(update.chapterChanged, true);
});

test('applyProgressionFlags restores recap state defaults', () => {
  const state = { bootCount: 0, driftMinutes: 0 };
  applyProgressionFlags(state);

  assert.equal(state.lastRecap, null);
  assert.deepEqual(state.recapHistory, []);
});
