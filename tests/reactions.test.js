import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/state.js';
import { fs } from '../src/content.js';
import { evaluateBehaviorReactions } from '../src/progression/reactions.js';

function makeState() {
  return JSON.parse(JSON.stringify(defaultState));
}

test('sets altered boot lines with frequent commands', () => {
  const state = makeState();
  state.terminalHistory = ['cat a', 'cat b', 'cat c', 'cat d', 'cat e'];
  evaluateBehaviorReactions({ state, fs, saveState: () => {} });
  assert.equal(state.reactionFlags.alteredBootLines, true);
});
