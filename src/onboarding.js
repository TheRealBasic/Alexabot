import { getActiveObjectives } from "./state.js";

const objectiveHintMap = {
  onboarding_open_explorer: {
    hint: "Open Node Directory (Explorer) from the desktop or onboarding actions.",
    command: "open explorer"
  },
  onboarding_run_help: {
    hint: "In Terminal, run `help` to inspect command reference.",
    command: "help"
  },
  onboarding_read_file: {
    hint: "Read one file (Terminal `cat <file>` or open a file in Explorer).",
    command: "cat /system/help/shell_help.txt"
  },
  onboarding_progression_command: {
    hint: "Execute one progression command in Terminal (`unlock archive`, `set-time 03:11`, or `recover --manifest`).",
    command: "set-time 03:11"
  },
  onboarding_confirm_objective_panel: {
    hint: "Confirm you can use the mission telemetry panel.",
    command: null
  },
  unlock_archive: {
    hint: "Read continuity notes, then run `unlock archive` in Terminal.",
    command: "unlock archive"
  },
  set_time_0311: {
    hint: "In Terminal, run `set time 03:11` to enter the maintenance window.",
    command: "set time 03:11"
  },
  observer_ping_operator: {
    hint: "Run `ping operator` in Terminal and relay the 4-digit code immediately.",
    command: "ping operator"
  },
  operator_execute_relay: {
    hint: "When Observer shares the code, run `exec relay <code>` before timeout.",
    command: "exec relay 1234"
  },
  recover_manifest: {
    hint: "Use `recover manifest` during the 03:11-03:13 window.",
    command: "recover manifest"
  },
  decode_cam2: {
    hint: "Inspect cam2 data with `strings /media/cam2_20030418.dat`.",
    command: "strings /media/cam2_20030418.dat"
  },
  access_redacted_audit: {
    hint: "Open `/logs/redacted_audit.log` in Explorer after unlock conditions are met.",
    command: "cat /logs/redacted_audit.log"
  },
  observer_anomaly_trace: {
    hint: "As Observer, review incident logs and note anomaly signatures for your teammate.",
    command: "cat /logs/incident.log"
  }
};

function isOnboardingObjective(objective) {
  return objective?.phase === "onboarding";
}

export function hasPendingOnboardingObjectives(state, role = state.activeRole) {
  return getActiveObjectives(state, role).some(isOnboardingObjective);
}

export function getOnboardingChecklistItems(state, role, limit = 5) {
  const activeObjectives = getActiveObjectives(state, role)
    .filter((objective) => !state.uiHints?.onboardingDismissed || isOnboardingObjective(objective))
    .filter((objective) => !isOnboardingObjective(objective) || objective.chapter === state.chapter)
    .slice(0, limit);

  const items = activeObjectives.map((objective) => {
    const mapped = objectiveHintMap[objective.id];
    return {
      id: objective.id,
      hint: mapped?.hint || objective.label,
      command: mapped?.command || null,
      phase: objective.phase || "mission"
    };
  });

  if (state.sessionMode === "coop" && state.relaySignal && !state.relaySignal.resolvedBy) {
    const secondsLeft = Math.max(0, Math.ceil((state.relaySignal.expiresAt - Date.now()) / 1000));
    const relayHint = role === "observer"
      ? `Relay window is live (${secondsLeft}s). Share code ${state.relaySignal.code} now so Operator can run \`exec relay ${state.relaySignal.code}\`.`
      : `Relay window is live (${secondsLeft}s). Run \`exec relay ${state.relaySignal.code}\` before it expires.`;
    items.unshift({
      id: "coop_relay_timing",
      hint: relayHint,
      command: role === "observer" ? "ping operator" : `exec relay ${state.relaySignal.code}`,
      phase: "mission"
    });
  }

  return items.slice(0, limit);
}
