export const SERVICE_MODELS = {
  "archive-daemon": {
    health: 0.82,
    dependencies: ["relay-link", "audit-indexer"],
    driftRate: 0.024,
    recoveryThreshold: 0.38,
    anomalyProbability: 0.06
  },
  "rtc-sync": {
    health: 0.93,
    dependencies: [],
    driftRate: 0.01,
    recoveryThreshold: 0.52,
    anomalyProbability: 0.03
  },
  "relay-link": {
    health: 0.89,
    dependencies: ["rtc-sync"],
    driftRate: 0.016,
    recoveryThreshold: 0.44,
    anomalyProbability: 0.05
  },
  "audit-indexer": {
    health: 0.78,
    dependencies: ["archive-daemon"],
    driftRate: 0.02,
    recoveryThreshold: 0.35,
    anomalyProbability: 0.08
  }
};

export function createSystemSimulationState() {
  const now = Date.now();
  const services = {};
  for (const [name, model] of Object.entries(SERVICE_MODELS)) {
    services[name] = {
      name,
      health: model.health,
      drift: 0,
      trend: 0,
      status: model.health > 0.7 ? "active" : "degraded",
      anomaly: false,
      dependencies: [...model.dependencies],
      anomalies: [],
      history: [model.health],
      restartCount: 0,
      lastRestartAt: now,
      trace: []
    };
  }

  return {
    version: 1,
    tick: 0,
    lastTickAt: now,
    services,
    events: [],
    warnings: [],
    snapshots: []
  };
}

export function ensureSystemSimulationState(state) {
  if (!state.systemSimulationState || typeof state.systemSimulationState !== "object") {
    state.systemSimulationState = createSystemSimulationState();
  }
  const base = createSystemSimulationState();
  const current = state.systemSimulationState;
  if (!current.services || typeof current.services !== "object") current.services = {};

  for (const [name, model] of Object.entries(SERVICE_MODELS)) {
    const existing = current.services[name] || {};
    current.services[name] = {
      ...base.services[name],
      ...existing,
      dependencies: Array.isArray(existing.dependencies) ? existing.dependencies : [...model.dependencies],
      anomalies: Array.isArray(existing.anomalies) ? existing.anomalies : [],
      history: Array.isArray(existing.history) && existing.history.length ? existing.history.slice(-30) : [base.services[name].health],
      trace: Array.isArray(existing.trace) ? existing.trace.slice(-40) : []
    };
  }

  current.version = 1;
  current.tick = Number.isFinite(current.tick) ? current.tick : 0;
  current.lastTickAt = Number.isFinite(current.lastTickAt) ? current.lastTickAt : Date.now();
  current.events = Array.isArray(current.events) ? current.events.slice(-60) : [];
  current.warnings = Array.isArray(current.warnings) ? current.warnings.slice(-30) : [];
  current.snapshots = Array.isArray(current.snapshots) ? current.snapshots.slice(-20) : [];
  return current;
}
