import { startSimulation, recordSimulationEvent, completeSimulation } from "../state.js";
import { deriveSimulationMetrics } from "./metrics.js";
import { resolveWeightedOutcome } from "./rules.js";
import { getScenarioDefinition } from "./scenarios.js";
import { ensureSimulationState, serializeSimulationSnapshot } from "./serializer.js";

function createRng(seed = 1) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = value * 16807 % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function runId() {
  return `sim-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`;
}

function ensureMainBranch(state, runIdValue) {
  const sim = ensureSimulationState(state);
  if (!Object.keys(sim.branches).length) {
    sim.branches.main = {
      id: "main",
      label: "main",
      parentId: null,
      runId: runIdValue,
      eventIds: [],
      createdAt: Date.now()
    };
    sim.selectedBranch = "main";
  }
  return sim.branches[sim.selectedBranch] || sim.branches.main;
}

export function runScenario(state, { scenarioId, seed = Date.now() } = {}) {
  const sim = ensureSimulationState(state);
  if (sim.activeRunId && sim.status === "running") {
    return { ok: false, message: "simulation already running" };
  }
  const scenario = getScenarioDefinition(scenarioId);
  if (!scenario) {
    return { ok: false, message: `unknown scenario: ${scenarioId}` };
  }
  const id = runId();
  startSimulation(state, {
    activeRunId: id,
    scenarioId,
    seed,
    selectedBranch: "main",
    branches: {
      main: {
        id: "main",
        label: "main",
        parentId: null,
        activeRunId: id,
        eventIds: [],
        createdAt: Date.now()
      }
    }
  });
  const startedSim = ensureSimulationState(state);
  startedSim.derivedMetrics.chapterPressure = scenario.startingPressure || 0;
  startedSim.artifacts[`/logs/simulations/${id}.log`] = `simulation ${id} started\nscenario=${scenario.label}\nseed=${seed}`;
  startedSim.artifacts[`/home/operator/docs/projections/${id}_summary.txt`] = `Projection ${id}\nScenario: ${scenario.label}\nStatus: running`;
  return { ok: true, runId: id, scenario };
}

export function stepScenario(state) {
  const sim = ensureSimulationState(state);
  if (!sim.activeRunId || sim.status !== "running") {
    return { ok: false, message: "no active simulation" };
  }
  const scenario = getScenarioDefinition(sim.scenarioId);
  if (!scenario) {
    return { ok: false, message: `scenario unavailable: ${sim.scenarioId}` };
  }

  const branch = ensureMainBranch(state, sim.activeRunId);
  const rng = createRng((sim.seed || 1) + sim.eventLog.length + branch.eventIds.length);
  const outcome = resolveWeightedOutcome(scenario.eventTable, rng, sim.derivedMetrics);
  if (!outcome) return { ok: false, message: "unable to resolve simulation outcome" };

  const event = recordSimulationEvent(state, {
    id: `evt-${sim.eventLog.length + 1}`,
    runId: sim.activeRunId,
    branchId: branch.id,
    eventType: outcome.eventType,
    detail: `weight=${outcome.adjustedWeight} trust=${outcome.trust}`,
    at: Date.now()
  });

  branch.eventIds.push(event.id);
  sim.derivedMetrics = deriveSimulationMetrics(sim);
  sim.artifacts[`/logs/simulations/${sim.activeRunId}.log`] = [
    `simulation ${sim.activeRunId} scenario=${scenario.id} seed=${sim.seed}`,
    ...sim.eventLog.map((entry) => `${entry.id} [${entry.branchId}] ${entry.eventType} ${entry.detail || ""}`),
    `metrics trust=${sim.derivedMetrics.trustScore} conflict=${sim.derivedMetrics.conflictScore} pressure=${sim.derivedMetrics.chapterPressure}`
  ].join("\n");
  sim.artifacts[`/home/operator/docs/projections/${sim.activeRunId}_summary.txt`] = [
    `Projection ${sim.activeRunId}`,
    `Scenario: ${scenario.label}`,
    `Selected branch: ${sim.selectedBranch}`,
    `Events: ${sim.derivedMetrics.eventCount}`,
    `Trust score: ${sim.derivedMetrics.trustScore}`,
    `Conflict score: ${sim.derivedMetrics.conflictScore}`,
    `Pressure: ${sim.derivedMetrics.chapterPressure}`,
    `Success rate: ${sim.derivedMetrics.successRate}`,
    `Confidence interval: ${sim.derivedMetrics.confidenceInterval.lower}-${sim.derivedMetrics.confidenceInterval.upper}`
  ].join("\n");

  return { ok: true, event, metrics: sim.derivedMetrics };
}

export function forkBranch(state, label = "branch") {
  const sim = ensureSimulationState(state);
  if (!sim.activeRunId || sim.status !== "running") {
    return { ok: false, message: "no active simulation" };
  }
  const source = sim.branches[sim.selectedBranch];
  if (!source) return { ok: false, message: "selected branch missing" };
  const id = label.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || `branch-${Object.keys(sim.branches).length + 1}`;
  if (sim.branches[id]) return { ok: false, message: `branch exists: ${id}` };
  sim.branches[id] = {
    id,
    label,
    parentId: source.id,
    runId: sim.activeRunId,
    eventIds: [...source.eventIds],
    createdAt: Date.now()
  };
  sim.selectedBranch = id;
  sim.derivedMetrics = deriveSimulationMetrics(sim);
  return { ok: true, branch: sim.branches[id] };
}

export function replaySeed(state, branchId = "main") {
  const sim = ensureSimulationState(state);
  if (!sim.activeRunId) return { ok: false, message: "no active simulation" };
  const branch = sim.branches[branchId];
  if (!branch) return { ok: false, message: `branch not found: ${branchId}` };
  const snapshot = serializeSimulationSnapshot(state);
  completeSimulation(state, { archivedSnapshot: snapshot });
  return { ok: true, snapshot };
}
