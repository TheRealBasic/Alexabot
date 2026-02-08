import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/state.js';
import { fs } from '../src/content.js';
import {
  activateManifestation,
  consumeManifestation,
  evaluateBehaviorReactions,
  isManifestationActive,
  shouldActivateManifestation
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
