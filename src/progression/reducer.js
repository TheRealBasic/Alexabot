import { completeObjective } from "../state.js";

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

export function applyAction(state, action = {}) {
  const output = { terminalLines: [], notifications: [] };

  if (action.type === "objective.complete") {
    completeObjective(state, action.objectiveId);
    return output;
  }

  if (!action.type?.startsWith("CMD_")) return output;

  if (requiresOperator(action.type) && action.role && action.role !== "operator") {
    output.terminalLines.push("permission denied: operator role required");
    return output;
  }

  appendHistory(state, action);

  if (action.type === "CMD_OBSERVER_PING") {
    if (action.role && action.role !== "observer") {
      output.terminalLines.push("permission denied: observer role required");
      return output;
    }
    const code = String(Math.floor(1000 + Math.random() * 9000));
    state.relaySignal = {
      code,
      generatedAt: action.timestamp || Date.now(),
      expiresAt: (action.timestamp || Date.now()) + 30_000,
      generatedBy: getActorName(action.actor),
      resolvedBy: null
    };
    completeObjective(state, "observer_ping_operator");
    output.terminalLines.push(`relay code emitted: ${code}`);
    output.notifications.push({ actor: getActorName(action.actor), message: `Observer pinged operator with relay code ${code}.` });
    return output;
  }

  if (action.type === "CMD_EXEC_RELAY") {
    const relay = state.relaySignal;
    const now = action.timestamp || Date.now();
    if (!relay) {
      output.terminalLines.push("relay: no active signal");
      return output;
    }
    if (now > relay.expiresAt) {
      state.relaySignal = null;
      output.terminalLines.push("relay: signal expired");
      return output;
    }
    if (action.code !== relay.code) {
      output.terminalLines.push("relay: invalid code");
      return output;
    }
    state.relaySignal.resolvedBy = getActorName(action.actor);
    completeObjective(state, "operator_execute_relay");
    output.terminalLines.push("relay handshake accepted");
    output.notifications.push({ actor: getActorName(action.actor), message: "Operator executed observer relay in time." });
    return output;
  }

  if (action.type === "CMD_UNLOCK_ARCHIVE") {
    if ((state.viewed?.["/home/operator/docs/continuity_overview.txt"] || 0) > 0) {
      state.unlocked.archive = true;
      completeObjective(state, "unlock_archive");
      output.terminalLines.push("archive channel exposed");
    } else {
      output.terminalLines.push("unlock: required context missing");
    }
    return output;
  }

  if (action.type === "CMD_SET_TIME") {
    const reference = new Date(action.timestamp || Date.now());
    const simulated = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), action.hours, action.minutes);
    state.driftMinutes = Math.round((simulated.getTime() - reference.getTime()) / 60000);
    if (action.hours === 3 && action.minutes === 11) {
      state.unlocked.redactedLog = true;
      completeObjective(state, "set_time_0311");
      output.terminalLines.push("maintenance window active");
    }
    output.terminalLines.push("clock adjusted");
    return output;
  }

  if (action.type === "CMD_RECOVER_MANIFEST") {
    const clock = new Date((action.timestamp || Date.now()) + state.driftMinutes * 60000);
    if (clock.getHours() === 3 && clock.getMinutes() >= 11 && clock.getMinutes() <= 13) {
      state.recoveredFiles = true;
      completeObjective(state, "recover_manifest");
      output.terminalLines.push("2 files restored from deleted manifest.");
      output.notifications.push({
        actor: getActorName(action.actor),
        message: "Manifest restored: 2 files recovered."
      });
    } else {
      output.terminalLines.push("recover: denied outside maintenance window");
    }
    return output;
  }

  if (action.type === "CMD_STRINGS") {
    if (action.path === "/media/cam2_20030418.dat") {
      state.unlocked.mediaReveal = true;
      completeObjective(state, "decode_cam2");
      output.terminalLines.push("extracting printable strings...");
      output.terminalLines.push(action.decodedText || "");
    } else {
      output.terminalLines.push("no printable strings found");
    }
    return output;
  }

  return output;
}
