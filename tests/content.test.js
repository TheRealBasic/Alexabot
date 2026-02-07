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

test('directory entries are sorted', () => {
  const state = makeState();
  const entries = getDirectoryEntries('/home/operator', state);
  const sorted = [...entries].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(entries, sorted);
});
