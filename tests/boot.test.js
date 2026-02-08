import test from "node:test";
import assert from "node:assert/strict";
import { applyLifecycleEvent, resolveBootServiceOutcomes, BOOT_STAGES } from "../src/boot.js";
import { STORAGE_KEY, defaultState, loadState, saveState } from "../src/state.js";

function makeState(overrides = {}) {
  return JSON.parse(JSON.stringify({ ...defaultState, ...overrides }));
}

test("boot stage machine exports expected transitions", () => {
  assert.deepEqual(BOOT_STAGES, ["bios", "init", "service-start", "desktop-ready"]);
});

test("service outcomes respond to trust, conflicts, and chapter", () => {
  const calm = resolveBootServiceOutcomes(makeState({ chapter: 1, teamTrustScore: 3, recentConflicts: [] }));
  const strained = resolveBootServiceOutcomes(makeState({ chapter: 3, teamTrustScore: -3, recentConflicts: [1, 2, 3] }));

  assert.equal(calm.find((service) => service.name === "continuity-index")?.status, "ok");
  assert.equal(calm.find((service) => service.name === "observer-relay")?.status, "ok");
  assert.equal(strained.find((service) => service.name === "continuity-index")?.status, "degraded");
  assert.equal(strained.find((service) => service.name === "session-daemon")?.status, "retry");
});

test("lifecycle crash persists boot diagnostics", () => {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key)
  };

  const state = makeState({ chapter: 2, teamTrustScore: -1, recentConflicts: ["relay"] });
  const report = applyLifecycleEvent(state, "crash");
  saveState(state);

  const restored = loadState();
  assert.equal(restored.pendingRecoveryNotice, true);
  assert.equal(restored.lastBootReport?.reason, "crash");
  assert.equal(restored.lastBootReport?.id, report.id);
  assert.match(restored.panicFragment, /panic: continuity fault/);

  storage.delete(STORAGE_KEY);
});
