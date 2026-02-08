const EMPTY_METRICS = {
  trustScore: 0,
  conflictScore: 0,
  chapterPressure: 0,
  confidence: 0.5,
  eventCount: 0,
  branchCount: 0,
  successRate: 0,
  confidenceInterval: { lower: 0, upper: 0 }
};

export function createSimulationState() {
  return {
    activeRunId: null,
    scenarioId: null,
    seed: null,
    status: "idle",
    branches: {},
    selectedBranch: null,
    eventLog: [],
    derivedMetrics: { ...EMPTY_METRICS },
    artifacts: {}
  };
}

export function ensureSimulationState(state) {
  if (!state.simulationState || typeof state.simulationState !== "object") {
    state.simulationState = createSimulationState();
    return state.simulationState;
  }
  const sim = state.simulationState;
  if (typeof sim.activeRunId !== "string") sim.activeRunId = sim.activeRunId || null;
  if (typeof sim.scenarioId !== "string") sim.scenarioId = sim.scenarioId || null;
  if (typeof sim.seed !== "number") sim.seed = Number(sim.seed) || null;
  if (typeof sim.status !== "string") sim.status = "idle";
  if (!sim.branches || typeof sim.branches !== "object") sim.branches = {};
  if (typeof sim.selectedBranch !== "string") sim.selectedBranch = null;
  if (!Array.isArray(sim.eventLog)) sim.eventLog = [];
  if (!sim.derivedMetrics || typeof sim.derivedMetrics !== "object") sim.derivedMetrics = { ...EMPTY_METRICS };
  if (!sim.artifacts || typeof sim.artifacts !== "object") sim.artifacts = {};
  return sim;
}

export function serializeSimulationSnapshot(state) {
  const sim = ensureSimulationState(state);
  return JSON.stringify(sim, null, 2);
}

export function loadSimulationSnapshot(state, serialized) {
  let parsed = null;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return false;
  }
  if (!parsed || typeof parsed !== "object") return false;
  state.simulationState = {
    ...createSimulationState(),
    ...parsed,
    branches: { ...(parsed.branches || {}) },
    eventLog: Array.isArray(parsed.eventLog) ? parsed.eventLog : [],
    artifacts: { ...(parsed.artifacts || {}) }
  };
  ensureSimulationState(state);
  return true;
}
