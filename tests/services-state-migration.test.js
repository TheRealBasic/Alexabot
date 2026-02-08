import test from 'node:test';
import assert from 'node:assert/strict';
import { applyProgressionFlags, defaultState } from '../src/state.js';

test('state migration ensures systemSimulationState defaults', () => {
  const state = { ...defaultState };
  delete state.systemSimulationState;

  applyProgressionFlags(state);

  assert.ok(state.systemSimulationState);
  assert.equal(state.systemSimulationState.version, 1);
  assert.ok(state.systemSimulationState.services['archive-daemon']);
});

test('state migration backfills service internals', () => {
  const state = {
    ...defaultState,
    systemSimulationState: {
      version: 0,
      services: {
        'archive-daemon': { health: 0.2 }
      }
    }
  };

  applyProgressionFlags(state);
  const svc = state.systemSimulationState.services['archive-daemon'];
  assert.ok(Array.isArray(svc.history));
  assert.ok(Array.isArray(svc.trace));
  assert.ok(Array.isArray(svc.dependencies));
});
