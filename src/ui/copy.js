export const COPY = {
  shell: {
    chapterLabels: {
      1: "PHASE I // BASELINE",
      2: "PHASE II // RECOVERY",
      3: "PHASE III // DISCLOSURE"
    },
    onboarding: {
      title: "Operator Briefing",
      dismiss: "Acknowledge"
    },
    objectives: {
      panelRole: "Assignment",
      trust: "Operational Trust",
      teammate: "Paired Operator",
      noTeammateActivity: "No paired-operator command history.",
      teammateActivityPrefix: "Last paired-operator command",
      activeRelay: "No active relay handoff.",
      activeObjectives: "Current Work Queue",
      allDone: "All queued objectives complete."
    },
    tray: {
      linkPrefix: "LINK",
      syncPrefix: "REPL"
    }
  },
  lobby: {
    presencePrefix: "Node occupancy",
    noNodes: "No public nodes reporting.",
    joinError: "Enter a node ID before attaching.",
    copyError: "Enter a node ID before creating a handoff link.",
    copied: "Session handoff link copied.",
    clipboardUnavailable: "Clipboard bridge unavailable. Copy from the address bar.",
    coopStatusPrefix: "link",
    joinedSuffix: "attached to node",
    left: "detached (grace interval active)",
    freshSessionHint: "Provision a new node ID to start a clean paired session."
  },
  notifications: {
    startup: [
      "Phase I active: verify archive routing integrity.",
      "Phase II active: recover and decode withheld records.",
      "Phase III active: complete disclosure and handoff."
    ],
    shutdownBlocked: "Shutdown unavailable: archival cycle is locked.",
    resetConfirm: "Purge local workstation state and restart?"
  },
  apps: {
    explorer: "Node Directory",
    terminal: "Command Shell",
    notes: "Operator Notes",
    media: "Signal Review",
    settings: "Workstation Settings",
    help: "Operations Manual",
    chat: "The Wakeful Thread",
    menuLabel: "Program Launcher",
    reset: "Reset Workstation",
    shutdown: "Power Down"
  },
  explorer: {
    deniedAudit: "<span class='err'>ERR-AUTH-403</span>\nOperator note: align RTC with maintenance marker 03:11 in Workstation Settings.",
    unreadableMedia: "ERR-IO-442: Payload decoding failed.\nDiagnostics note: inspect printable strings from /media/cam2_20030418.dat within Command Shell.",
    empty: "[no readable payload]"
  },
  help: {
    title: "Operations Knowledge Base",
    intro: "Some references are unavailable due to archive degradation.",
    topics: [
      "Command shell procedures — see <code>/system/help/shell_help.txt</code>",
      "Object recovery procedures — see <code>/system/help/recovery_help.txt</code>",
      "Session identity mismatch after resume [article missing]",
      "Unexpected operator identity assignment [article missing]"
    ],
    quickStart: "Operator Checklist",
    noSteps: "No active checklist items for this assignment.",
    chapterHints: {
      1: "Operator note: validate continuity records before credential elevation steps.",
      2: "Operator note: use maintenance-window behavior when recovering deleted objects.",
      3: "Operator note: reconcile system logs with recovered correspondence for final accounting."
    }
  },
  settings: {
    title: "Realtime Clock Offset",
    apply: "Apply Offset",
    syncMaintenance: "Sync RTC to 03:11",
    warning: "Caution: altering clock state may affect archival integrity checks.",
    maintenanceSuccess: "Clock synchronized to maintenance window marker.",
    synced: "Clock synchronized to {time}.",
    invalid: "ERR-TIME-400: invalid time payload.",
    notify: "RTC offset updated."
  }
};

export function formatCopy(template, values = {}) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}
