import { clearSimulation, completeSimulation } from "../state.js";
import { forkBranch, runScenario, stepScenario } from "../simulation/engine.js";
import { deriveSimulationMetrics } from "../simulation/metrics.js";
import { listScenarioDefinitions } from "../simulation/scenarios.js";
import { ensureSimulationState } from "../simulation/serializer.js";
import { COPY, formatCopy } from "../ui/copy.js";

function toInt(value, fallback = Date.now()) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function branchMetrics(sim, branchId) {
  const branch = sim.branches?.[branchId];
  if (!branch) return deriveSimulationMetrics({ eventLog: [], branches: {} });
  const ids = new Set(branch.eventIds || []);
  const eventLog = (sim.eventLog || []).filter((entry) => ids.has(entry.id));
  return deriveSimulationMetrics({
    eventLog,
    branches: { [branchId]: branch }
  });
}

function metricDelta(a, b, key) {
  return Number((Number(b?.[key] || 0) - Number(a?.[key] || 0)).toFixed(3));
}

function asDelta(value) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function buildSummary(state) {
  const sim = ensureSimulationState(state);
  const scenario = listScenarioDefinitions().find((entry) => entry.id === sim.scenarioId);
  const lines = [
    `Simulation Run: ${sim.activeRunId || "none"}`,
    `Scenario: ${scenario?.label || sim.scenarioId || "n/a"}`,
    `Seed: ${sim.seed ?? "n/a"}`,
    `Status: ${sim.status}`,
    `Events: ${sim.derivedMetrics?.eventCount || 0}`,
    `Trust: ${sim.derivedMetrics?.trustScore || 0}`,
    `Conflict: ${sim.derivedMetrics?.conflictScore || 0}`,
    `Pressure: ${sim.derivedMetrics?.chapterPressure || 0}`,
    "",
    "Timeline"
  ];

  for (const entry of sim.eventLog || []) {
    lines.push(`${entry.id} [${entry.branchId}] ${entry.eventType} ${entry.detail || ""}`.trim());
  }

  lines.push("", "Branch snapshots");
  for (const branch of Object.values(sim.branches || {})) {
    lines.push(`- ${branch.label} (${branch.id}) :: ${branch.eventIds?.length || 0} events`);
  }

  return lines.join("\n");
}

export function openSimulationConsole({ makeWindow, state, saveState, notify, simulationHooks = {} }) {
  const scenarios = listScenarioDefinitions();
  const win = makeWindow("simulation", COPY.apps.simulation, (content, windowRef) => {
    content.innerHTML = `
      <div class="app-shell simulation-console">
        <section class="panel-card simulation-config">
          <div class="system-label">${COPY.simulation.panelLabel}</div>
          <label class="field-legend" for="simScenario">${COPY.simulation.scenarioLabel}</label>
          <select id="simScenario" class="input-field" title="${COPY.simulation.scenarioTooltip}">
            ${scenarios.map((scenario) => `<option value="${scenario.id}">${scenario.label}</option>`).join("")}
          </select>
          <label class="field-legend" for="simSeed">${COPY.simulation.seedLabel}</label>
          <input id="simSeed" class="input-field" type="number" title="${COPY.simulation.seedTooltip}" placeholder="${COPY.simulation.seedPlaceholder}" />
          <div class="sim-controls">
            <button type="button" class="btn-primary" data-action="start">${COPY.simulation.controls.start}</button>
            <button type="button" class="btn-primary" data-action="step">${COPY.simulation.controls.step}</button>
            <button type="button" class="btn-primary" data-action="fork">${COPY.simulation.controls.fork}</button>
            <button type="button" class="btn-primary" data-action="reset">${COPY.simulation.controls.reset}</button>
          </div>
          <button type="button" class="btn-secondary" data-action="export">${COPY.simulation.controls.export}</button>
        </section>

        <section class="panel-card simulation-timeline-panel">
          <div class="system-label">${COPY.simulation.timelineLabel}</div>
          <div class="simulation-status" data-role="status"></div>
          <div class="simulation-timeline" data-role="timeline"></div>
        </section>

        <section class="panel-card simulation-compare-panel">
          <div class="system-label">${COPY.simulation.compareLabel}</div>
          <div class="simulation-branch-controls">
            <label class="field-legend" for="simBranchA">${COPY.simulation.branchA}</label>
            <select id="simBranchA" class="input-field"></select>
            <label class="field-legend" for="simBranchB">${COPY.simulation.branchB}</label>
            <select id="simBranchB" class="input-field"></select>
          </div>
          <div data-role="comparison"></div>
        </section>
      </div>
    `;

    const scenarioInput = content.querySelector("#simScenario");
    const seedInput = content.querySelector("#simSeed");
    const timeline = content.querySelector('[data-role="timeline"]');
    const comparison = content.querySelector('[data-role="comparison"]');
    const status = content.querySelector('[data-role="status"]');
    const branchAInput = content.querySelector("#simBranchA");
    const branchBInput = content.querySelector("#simBranchB");

    const renderBranchControls = () => {
      const sim = ensureSimulationState(state);
      const branches = Object.values(sim.branches || {});
      const options = branches.map((branch) => `<option value="${branch.id}">${branch.label}</option>`).join("");
      branchAInput.innerHTML = options;
      branchBInput.innerHTML = options;

      if (!branchAInput.value && branches[0]) branchAInput.value = branches[0].id;
      if (!branchBInput.value && branches[1]) branchBInput.value = branches[1].id;
      if (!branchBInput.value && branches[0]) branchBInput.value = branches[0].id;
      if (sim.selectedBranch && branches.some((entry) => entry.id === sim.selectedBranch)) {
        branchAInput.value = sim.selectedBranch;
      }
    };

    const renderTimeline = () => {
      const sim = ensureSimulationState(state);
      const branchName = sim.branches?.[sim.selectedBranch]?.label || "main";
      status.innerHTML = `
        <div class="kv-diagnostics">
          <div class="kv-row"><span class="kv-key">${COPY.simulation.status.run}</span><span class="kv-value">${sim.activeRunId || COPY.simulation.none}</span></div>
          <div class="kv-row"><span class="kv-key">${COPY.simulation.status.branch}</span><span class="kv-value">${branchName}</span></div>
          <div class="kv-row"><span class="kv-key">${COPY.simulation.status.events}</span><span class="kv-value">${sim.derivedMetrics?.eventCount || 0}</span></div>
          <div class="kv-row"><span class="kv-key">${COPY.simulation.status.confidence}</span><span class="kv-value">${sim.derivedMetrics?.confidence ?? 0.5}</span></div>
        </div>
      `;

      if (!sim.eventLog?.length) {
        timeline.innerHTML = `<div class="notice">${COPY.simulation.emptyTimeline}</div>`;
        return;
      }

      timeline.innerHTML = [...sim.eventLog]
        .reverse()
        .map((entry) => `
          <div class="timeline-row">
            <span class="status-badge ${entry.branchId === sim.selectedBranch ? "active" : "stale"}">${entry.branchId}</span>
            <span class="timeline-event">${entry.eventType}</span>
            <span class="timeline-detail">${entry.detail || ""}</span>
          </div>
        `)
        .join("");
    };

    const renderComparator = () => {
      const sim = ensureSimulationState(state);
      const a = branchAInput.value;
      const b = branchBInput.value;
      const mA = branchMetrics(sim, a);
      const mB = branchMetrics(sim, b);

      const divergence = Math.abs(metricDelta(mA, mB, "conflictScore")) + Math.abs(metricDelta(mA, mB, "trustScore"));
      if (divergence >= 6) {
        windowRef.setHealth("fault");
      } else if (divergence >= 3) {
        windowRef.setHealth("stale");
      } else {
        windowRef.setHealth("active");
      }

      comparison.innerHTML = `
        <table class="sim-compare-table compact-diff-table">
          <thead>
            <tr><th>${COPY.simulation.metric}</th><th>A</th><th>B</th><th>Δ B-A</th></tr>
          </thead>
          <tbody>
            <tr><td>${COPY.simulation.metrics.trust}</td><td>${mA.trustScore}</td><td>${mB.trustScore}</td><td>${asDelta(metricDelta(mA, mB, "trustScore"))}</td></tr>
            <tr><td>${COPY.simulation.metrics.conflict}</td><td>${mA.conflictScore}</td><td>${mB.conflictScore}</td><td>${asDelta(metricDelta(mA, mB, "conflictScore"))}</td></tr>
            <tr><td>${COPY.simulation.metrics.pressure}</td><td>${mA.chapterPressure}</td><td>${mB.chapterPressure}</td><td>${asDelta(metricDelta(mA, mB, "chapterPressure"))}</td></tr>
            <tr><td>${COPY.simulation.metrics.success}</td><td>${mA.successRate}</td><td>${mB.successRate}</td><td>${asDelta(metricDelta(mA, mB, "successRate"))}</td></tr>
            <tr><td>${COPY.simulation.metrics.events}</td><td>${mA.eventCount}</td><td>${mB.eventCount}</td><td>${asDelta(metricDelta(mA, mB, "eventCount"))}</td></tr>
          </tbody>
        </table>
      `;

      if (divergence >= 6) {
        simulationHooks.onCriticalDivergence?.({ divergence, branchA: a, branchB: b });
      }
    };

    const refresh = () => {
      renderBranchControls();
      renderTimeline();
      renderComparator();
      saveState();
    };

    seedInput.value = String(ensureSimulationState(state).seed ?? Date.now());

    content.querySelector('[data-action="start"]').onclick = () => {
      const seed = toInt(seedInput.value);
      const result = runScenario(state, { scenarioId: scenarioInput.value, seed });
      if (!result.ok) {
        notify(formatCopy(COPY.simulation.errors.startFailed, { message: result.message }));
        return;
      }
      notify(formatCopy(COPY.simulation.started, { scenario: result.scenario.label, seed }));
      refresh();
    };

    content.querySelector('[data-action="step"]').onclick = () => {
      const result = stepScenario(state);
      if (!result.ok) {
        notify(formatCopy(COPY.simulation.errors.stepFailed, { message: result.message }));
        return;
      }
      const sim = ensureSimulationState(state);
      notify(formatCopy(COPY.simulation.stepped, { eventType: result.event.eventType, branch: result.event.branchId }));
      if (sim.derivedMetrics.eventCount >= 8 && sim.status !== "completed") {
        completeSimulation(state, { completedAt: Date.now() });
        simulationHooks.onRunCompleted?.({
          runId: sim.activeRunId,
          scenarioId: sim.scenarioId,
          eventCount: sim.derivedMetrics.eventCount,
          trust: sim.derivedMetrics.trustScore,
          conflict: sim.derivedMetrics.conflictScore
        });
      }
      refresh();
    };

    content.querySelector('[data-action="fork"]').onclick = () => {
      const label = window.prompt(COPY.simulation.forkPrompt, COPY.simulation.forkDefault) || COPY.simulation.forkDefault;
      const result = forkBranch(state, label);
      if (!result.ok) {
        notify(formatCopy(COPY.simulation.errors.forkFailed, { message: result.message }));
        return;
      }
      notify(formatCopy(COPY.simulation.forked, { label: result.branch.label }));
      refresh();
    };

    content.querySelector('[data-action="reset"]').onclick = () => {
      clearSimulation(state);
      notify(COPY.simulation.resetDone);
      refresh();
    };

    content.querySelector('[data-action="export"]').onclick = () => {
      const text = buildSummary(state);
      const sim = ensureSimulationState(state);
      const filename = `${sim.activeRunId || "simulation"}_summary.txt`;
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      notify(formatCopy(COPY.simulation.exported, { filename }));
      if (sim.status !== "completed" && sim.activeRunId) {
        completeSimulation(state, { completedAt: Date.now() });
        simulationHooks.onRunCompleted?.({
          runId: sim.activeRunId,
          scenarioId: sim.scenarioId,
          eventCount: sim.derivedMetrics.eventCount,
          trust: sim.derivedMetrics.trustScore,
          conflict: sim.derivedMetrics.conflictScore
        });
      }
      refresh();
    };

    branchAInput.onchange = renderComparator;
    branchBInput.onchange = renderComparator;

    refresh();
  });

  return win;
}
