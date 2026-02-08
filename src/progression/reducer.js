import { completeObjective } from "../state.js";

const TRUST_MIN = -6;
const TRUST_MAX = 6;
const CONFLICT_WINDOW_MS = 45_000;

function ensureTrustState(state) {
  if (typeof state.teamTrustScore !== "number") state.teamTrustScore = 0;
  if (!state.playerDivergence || typeof state.playerDivergence !== "object") state.playerDivergence = {};
  if (!Array.isArray(state.recentConflicts)) state.recentConflicts = [];
}

function clampTrust(value) {
  return Math.max(TRUST_MIN, Math.min(TRUST_MAX, value));
}

function recordTrustEvent(state, type, delta, details = {}, timestamp = Date.now()) {
  ensureTrustState(state);
  state.teamTrustScore = clampTrust(state.teamTrustScore + delta);

  const actors = [details.actor, details.counterpart].filter(Boolean);
  for (const actor of actors) {
    state.playerDivergence[actor] = (state.playerDivergence[actor] || 0) + (delta < 0 ? 1 : -0.5);
    state.playerDivergence[actor] = Math.max(0, Number(state.playerDivergence[actor].toFixed(2)));
  }

  if (delta < 0) {
    state.recentConflicts.push({ type, details, timestamp });
    const cutoff = timestamp - 180_000;
    state.recentConflicts = state.recentConflicts.filter((event) => event.timestamp >= cutoff);

    const repeatedByActor = state.recentConflicts.filter(
      (event) => event.type === type && event.details?.actor && event.details.actor === details.actor
    );
    if (repeatedByActor.length >= 3) {
      state.teamTrustScore = clampTrust(state.teamTrustScore - 1);
    }
  }
}

function assessTrustShift(state, action, output, options = {}) {
  ensureTrustState(state);
  const actor = getActorName(action.actor);
  const timestamp = action.timestamp || Date.now();
  const history = (state.terminalHistory || []).filter((entry) => typeof entry !== "string").slice(-8);
  const priorOther = [...history].reverse().find((entry) => entry.actor !== actor);

  if (action.type === "CMD_EXEC_RELAY" && output.terminalLines.includes("relay handshake accepted")) {
    recordTrustEvent(state, "sync_relay_success", 2, { actor, counterpart: state.relaySignal?.generatedBy }, timestamp);
    return;
  }

  if (action.type === "CMD_SET_TIME" && action.hours === 3 && action.minutes === 11) {
    const observerPing = [...history].reverse().find((entry) => entry.command === "ping operator" && entry.actor !== actor);
    if (observerPing && timestamp - observerPing.timestamp <= CONFLICT_WINDOW_MS) {
      recordTrustEvent(state, "synchronized_window_entry", 1, { actor, counterpart: observerPing.actor }, timestamp);
      return;
    }
  }

  if (action.type === "CMD_EXEC_RELAY" && output.terminalLines.includes("relay: signal expired")) {
    recordTrustEvent(state, "withheld_relay", -2, { actor, counterpart: state.relaySignal?.generatedBy }, timestamp);
    return;
  }

  if (action.type === "CMD_EXEC_RELAY" && output.terminalLines.some((line) => line.includes("invalid code") || line.includes("no active signal"))) {
    recordTrustEvent(state, "contradictory_command", -1, { actor, counterpart: priorOther?.actor, action: action.commandLine }, timestamp);
    return;
  }

  if (output.terminalLines.some((line) => line.includes("permission denied") || line.includes("restricted"))) {
    recordTrustEvent(state, "override_or_conflict", -1, { actor, counterpart: priorOther?.actor, action: action.type }, timestamp);
    return;
  }

  if (priorOther && priorOther.actor !== actor && timestamp - priorOther.timestamp <= CONFLICT_WINDOW_MS) {
    const contradictoryPair = new Set([priorOther.command, action.commandLine]);
    if (contradictoryPair.has("unlock archive") && contradictoryPair.has("set-time 03:11")) {
      recordTrustEvent(state, "contradictory_priority", -1, { actor, counterpart: priorOther.actor }, timestamp);
    }
  }
}

function ensureTerminalHistory(state) {
  if (!Array.isArray(state.terminalHistory)) {
    state.terminalHistory = [];
  }
}

function getActorName(actor) {
  return actor || "operator";
}

function appendHistory(state, action) {
  ensureTerminalHistory(state);
  if (!action.commandLine) return;
  state.terminalHistory.push({
    actor: getActorName(action.actor),
    command: action.commandLine,
    timestamp: action.timestamp || Date.now()
  });
}

function requiresOperator(actionType) {
  return new Set(["CMD_UNLOCK_ARCHIVE", "CMD_SET_TIME", "CMD_RECOVER_MANIFEST", "CMD_STRINGS", "CMD_EXEC_RELAY"]).has(actionType);
}

function cloneProjectionState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function applyAction(state, action = {}, options = {}) {
  const output = { terminalLines: [], notifications: [] };
  const target = options.projectionMode ? cloneProjectionState(state) : state;
  ensureTrustState(target);

  if (action.type === "objective.complete") {
    completeObjective(target, action.objectiveId);
    return options.projectionMode ? { ...output, projectionState: target } : output;
  }

  if (!action.type?.startsWith("CMD_")) return options.projectionMode ? { ...output, projectionState: target } : output;

  if (requiresOperator(action.type) && action.role && action.role !== "operator") {
    output.terminalLines.push("permission denied: operator role required");
    return options.projectionMode ? { ...output, projectionState: target } : output;
  }

  appendHistory(target, action);

  if (action.type === "CMD_OBSERVER_PING") {
    if (action.role && action.role !== "observer") {
      output.terminalLines.push("permission denied: observer role required");
      return options.projectionMode ? { ...output, projectionState: target } : output;
    }
    const code = String(Math.floor(1000 + Math.random() * 9000));
    target.relaySignal = {
      code,
      generatedAt: action.timestamp || Date.now(),
      expiresAt: (action.timestamp || Date.now()) + 30_000,
      generatedBy: getActorName(action.actor),
      resolvedBy: null
    };
    completeObjective(target, "observer_ping_operator");
    output.terminalLines.push(`relay code emitted: ${code}`);
    output.notifications.push({ actor: getActorName(action.actor), message: `Observer pinged operator with relay code ${code}.` });
    assessTrustShift(target, action, output, options);
    return options.projectionMode ? { ...output, projectionState: target } : output;
  }

  if (action.type === "CMD_EXEC_RELAY") {
    const relay = target.relaySignal;
    const now = action.timestamp || Date.now();
    if (!relay) {
      output.terminalLines.push("relay: no active signal");
      assessTrustShift(target, action, output, options);
      return options.projectionMode ? { ...output, projectionState: target } : output;
    }
    if (now > relay.expiresAt) {
      target.relaySignal = null;
      output.terminalLines.push("relay: signal expired");
      assessTrustShift(target, action, output, options);
      return options.projectionMode ? { ...output, projectionState: target } : output;
    }
    if (action.code !== relay.code) {
      output.terminalLines.push("relay: invalid code");
      assessTrustShift(target, action, output, options);
      return options.projectionMode ? { ...output, projectionState: target } : output;
    }
    target.relaySignal.resolvedBy = getActorName(action.actor);
    completeObjective(target, "operator_execute_relay");
    output.terminalLines.push("relay handshake accepted: witness chain preserved");
    output.notifications.push({ actor: getActorName(action.actor), message: "Operator executed observer relay in time." });
    assessTrustShift(target, action, output, options);
    return options.projectionMode ? { ...output, projectionState: target } : output;
  }

  if (action.type === "CMD_UNLOCK_ARCHIVE") {
    if ((target.viewed?.["/home/operator/docs/continuity_overview.txt"] || 0) > 0) {
      target.unlocked.archive = true;
      completeObjective(target, "unlock_archive");
      output.terminalLines.push("archive route exposed: continuity gate partially lifted");
    } else {
      output.terminalLines.push("unlock: required context missing (read continuity clues first)");
    }
    assessTrustShift(target, action, output, options);
    return options.projectionMode ? { ...output, projectionState: target } : output;
  }

  if (action.type === "CMD_SET_TIME") {
    const reference = new Date(action.timestamp || Date.now());
    const simulated = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), action.hours, action.minutes);
    target.driftMinutes = Math.round((simulated.getTime() - reference.getTime()) / 60000);
    if (action.hours === 3 && action.minutes === 11) {
      target.unlocked.redactedLog = true;
      completeObjective(target, "set_time_0311");
      output.terminalLines.push("maintenance window active at 03:11: retrieval boundary confirmed");
    }
    output.terminalLines.push("clock adjusted: timeline drift recalculated");
    assessTrustShift(target, action, output, options);
    return options.projectionMode ? { ...output, projectionState: target } : output;
  }

  if (action.type === "CMD_RECOVER_MANIFEST") {
    const clock = new Date((action.timestamp || Date.now()) + target.driftMinutes * 60000);
    if (clock.getHours() === 3 && clock.getMinutes() >= 11 && clock.getMinutes() <= 13) {
      target.recoveredFiles = true;
      completeObjective(target, "recover_manifest");
      output.terminalLines.push("2 files restored from deleted manifest: suppressed evidence reinstated.");
      output.notifications.push({
        actor: getActorName(action.actor),
        message: "Manifest restored: 2 files recovered."
      });
    } else {
      output.terminalLines.push("recover: denied outside maintenance window (03:11-03:13 required)");
    }
    return options.projectionMode ? { ...output, projectionState: target } : output;
  }

  if (action.type === "CMD_STRINGS") {
    if (action.path === "/media/cam2_20030418.dat") {
      target.unlocked.mediaReveal = true;
      completeObjective(target, "decode_cam2");
      output.terminalLines.push("extracting printable strings from cam2 payload...");
      output.terminalLines.push(action.decodedText || "");
    } else {
      output.terminalLines.push("no printable strings found; evidence trail remains inconclusive");
    }
    assessTrustShift(target, action, output, options);
    return options.projectionMode ? { ...output, projectionState: target } : output;
  }

  assessTrustShift(target, action, output, options);
  return options.projectionMode ? { ...output, projectionState: target } : output;
}
