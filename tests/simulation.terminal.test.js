import test from 'node:test';
import assert from 'node:assert/strict';
import { canRunSimSubcommand, parseSimCommandArgs } from '../src/apps/terminal.js';

test('sim command parsing extracts subcommand, scenario, and seed', () => {
  const parsed = parseSimCommandArgs(['start', 'relay-desync', '--seed=4242']);

  assert.equal(parsed.subcommand, 'start');
  assert.equal(parsed.scenarioId, 'relay-desync');
  assert.equal(parsed.seed, 4242);
  assert.equal(parsed.label, 'relay-desync --seed=4242');
});

test('sim parsing handles branch and fork label spacing', () => {
  const branch = parseSimCommandArgs(['branch', 'main']);
  const fork = parseSimCommandArgs(['fork', ' alternate ', ' route ']);

  assert.equal(branch.branchLabel, 'main');
  assert.equal(fork.label, 'alternate   route');
});

test('sim parsing defaults to help and null seed when omitted', () => {
  const parsed = parseSimCommandArgs([]);
  assert.equal(parsed.subcommand, 'help');
  assert.equal(parsed.seed, null);
  assert.equal(parsed.scenarioId, '');
});

test('operator is allowed on all tested sim subcommands', () => {
  const subs = ['help', 'start', 'step', 'fork', 'branch', 'metrics', 'export', 'clear', 'unknown'];
  for (const sub of subs) {
    assert.equal(canRunSimSubcommand('operator', sub), true, `operator should run ${sub}`);
  }
});

test('observer role enforces sim restrictions and supports read-only commands', () => {
  assert.equal(canRunSimSubcommand('observer', 'metrics'), true);
  assert.equal(canRunSimSubcommand('observer', 'branch'), true);
  assert.equal(canRunSimSubcommand('observer', 'export'), true);
  assert.equal(canRunSimSubcommand('observer', 'help'), true);

  assert.equal(canRunSimSubcommand('observer', 'start'), false);
  assert.equal(canRunSimSubcommand('observer', 'step'), false);
  assert.equal(canRunSimSubcommand('observer', 'fork'), false);
  assert.equal(canRunSimSubcommand('observer', 'clear'), false);
});

test('co-op role mismatch behavior blocks observer mutating simulation commands', () => {
  const coopObserverRole = 'observer';
  const mutatingSubs = ['start', 'step', 'fork'];

  for (const sub of mutatingSubs) {
    assert.equal(canRunSimSubcommand(coopObserverRole, sub), false);
  }
});
