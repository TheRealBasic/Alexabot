import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/state.js';
import { fs } from '../src/content.js';
import {
  activateManifestation,
  consumeManifestation,
  consumeTieredHint,
  evaluateBehaviorReactions,
  evaluateHintTier,
  isManifestationActive,
  shouldActivateManifestation,
  isCriticalPuzzleInputWindow
} from '../src/progression/reactions.js';

function makeState() {
  return JSON.parse(JSON.stringify(defaultState));
}

test('sets altered boot lines with frequent commands', () => {
  const state = makeState();
  state.terminalHistory = ['cat a', 'cat b', 'cat c', 'cat d', 'cat e'];
  evaluateBehaviorReactions({ state, fs, saveState: () => {} });
  assert.equal(state.reactionFlags.alteredBootLines, true);
});

test('manifestation activation is chapter-gated', () => {
  const state = makeState();
  state.chapter = 1;
  state.aiParanoia = 7;

  assert.equal(shouldActivateManifestation(state, 'terminalAnomaly', 1_000), false);

  state.chapter = 2;
  assert.equal(shouldActivateManifestation(state, 'terminalAnomaly', 120_000), true);
});

test('manifestation cooldown prevents spam', () => {
  const state = makeState();
  state.chapter = 3;
  state.aiParanoia = 7;

  assert.equal(shouldActivateManifestation(state, 'delayedNotification', 200_000), true);
  activateManifestation(state, 'delayedNotification', 'first pulse', 200_000);

  assert.equal(shouldActivateManifestation(state, 'delayedNotification', 200_300), false);
  assert.equal(shouldActivateManifestation(state, 'delayedNotification', 360_001), true);
});

test('manifestation consume is one-shot while active', () => {
  const state = makeState();
  state.chapter = 2;
  state.aiParanoia = 6;

  activateManifestation(state, 'terminalAnomaly', 'line drift', 5_000);
  assert.equal(isManifestationActive(state, 'terminalAnomaly', 10_000), true);
  assert.equal(consumeManifestation(state, 'terminalAnomaly'), true);
  assert.equal(consumeManifestation(state, 'terminalAnomaly'), false);
});


test('projection mode manifestations are flagged simulated without persistence callback', () => {
  const state = makeState();
  state.chapter = 3;
  state.aiParanoia = 8;
  let persisted = 0;

  evaluateBehaviorReactions({ state, fs, saveState: () => { persisted += 1; }, projectionMode: true });

  assert.equal(persisted, 0);
  const recent = state.forensicTrail[state.forensicTrail.length - 1];
  assert.match(recent.detail, /\[simulated\]/);
});


test('tiered hints escalate from subtle to direct nudge', () => {
  const state = makeState();
  state.guidanceMetrics.failedCommandStreak = 2;

  assert.equal(evaluateHintTier(state, 1_000), 1);
  assert.match(consumeTieredHint(state, 1_000), /subtle clue/i);

  state.guidanceMetrics.failedCommandStreak = 4;
  assert.equal(evaluateHintTier(state, 2_000), 2);
  assert.match(consumeTieredHint(state, 2_000), /stronger clue/i);

  state.guidanceMetrics.failedCommandStreak = 6;
  assert.equal(evaluateHintTier(state, 3_000), 3);
  assert.match(consumeTieredHint(state, 3_000), /direct nudge/i);
});


test('system crash reboot manifestation enforces probability and cooldown', () => {
  const state = makeState();
  state.chapter = 3;
  state.aiParanoia = 7;

  assert.equal(shouldActivateManifestation(state, 'systemCrashReboot', 500_000, { randomValue: 0.8 }), false);
  assert.equal(shouldActivateManifestation(state, 'systemCrashReboot', 500_000, { randomValue: 0.01 }), true);

  activateManifestation(state, 'systemCrashReboot', 'panic rehearsal', 500_000);
  assert.equal(shouldActivateManifestation(state, 'systemCrashReboot', 600_000, { randomValue: 0.01 }), false);
  assert.equal(shouldActivateManifestation(state, 'systemCrashReboot', 930_001, { randomValue: 0.01 }), true);
});

test('critical puzzle windows block crash reboot manifestation', () => {
  const state = makeState();
  state.chapter = 3;
  state.aiParanoia = 7;

  state.relaySignal = { code: '1234', generatedAt: 1, expiresAt: 120_000, generatedBy: 'observer', resolvedBy: null };
  assert.equal(isCriticalPuzzleInputWindow(state, 60_000), true);
  assert.equal(shouldActivateManifestation(state, 'systemCrashReboot', 60_000, { randomValue: 0.01 }), false);

  state.relaySignal.resolvedBy = 'operator';
  state.driftMinutes = 0;
  state.completedObjectives = [];
  const maintenanceWindow = new Date('2003-04-19T03:12:00.000Z').getTime();
  assert.equal(isCriticalPuzzleInputWindow(state, maintenanceWindow), true);
  assert.equal(shouldActivateManifestation(state, 'systemCrashReboot', maintenanceWindow, { randomValue: 0.01 }), false);
});
