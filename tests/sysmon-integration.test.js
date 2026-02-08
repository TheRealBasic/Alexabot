import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/state.js';
import { getDynamicFile } from '../src/content.js';
import { tickSystemSimulation } from '../src/systems/simulator.js';

test('dynamic /proc/services entries reflect live simulation state', () => {
  const state = JSON.parse(JSON.stringify(defaultState));
  tickSystemSimulation(state, { random: () => 0.5 });

  const body = getDynamicFile('/proc/services/archive-daemon', state);
  assert.ok(body.includes('name=archive-daemon'));
  assert.ok(body.includes('health='));
  assert.ok(body.includes('drift='));
});

test('diagnostics drift log and recovery files are simulation-backed', () => {
  const state = JSON.parse(JSON.stringify(defaultState));
  for (let i = 0; i < 4; i += 1) tickSystemSimulation(state, { random: () => 0.0 });

  const driftLog = getDynamicFile('/logs/diagnostics/service_drift.log', state);
  const recovery = getDynamicFile('/tmp/recovery/cleanup_report.txt', state);

  assert.equal(typeof driftLog, 'string');
  assert.ok(recovery.includes('auto-recovered services='));
});
