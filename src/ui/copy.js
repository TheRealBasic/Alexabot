export const COPY = {
  shell: {
    chapterLabels: {
      1: "ACT I // ORIENTATION",
      2: "ACT II // RETRIEVAL",
      3: "ACT III // ACCOUNTING"
    },
    onboarding: {
      title: "Operator Continuity Brief",
      dismiss: "Acknowledge Protocol"
    },
    objectives: {
      panelRole: "Assignment",
      trust: "Operational Trust",
      teammate: "Paired Operator",
      noTeammateActivity: "No paired-operator command trail recorded.",
      teammateActivityPrefix: "Last paired-operator command",
      activeRelay: "No relay handoff in progress.",
      activeObjectives: "Active Protocol Queue",
      allDone: "All queued protocols complete."
    },
    tray: {
      linkPrefix: "LINK",
      syncPrefix: "REPL"
    }
  },
  lobby: {
    presencePrefix: "Node occupancy",
    noNodes: "No public nodes currently reporting.",
    joinError: "Provide a node ID before attachment.",
    copyError: "Provide a node ID before generating a handoff link.",
    copied: "Session handoff link staged to clipboard.",
    clipboardUnavailable: "Clipboard bridge unavailable. Copy from the address bar.",
    coopStatusPrefix: "link",
    joinedSuffix: "attached to node",
    left: "detached (grace interval active)",
    freshSessionHint: "Provision a new node ID to begin a clean paired session."
  },
  notifications: {
    startup: [
      "Act I active: verify archive routing integrity and witness alignment.",
      "Act II active: recover withheld records and decode residual evidence.",
      "Act III active: complete accounting, then execute handoff."
    ],
    shutdownBlocked: "Shutdown unavailable: archival cycle is locked.",
    lifecycleBlocked: "Lifecycle controls unavailable while attached to a paired node.",
    resetConfirm: "Purge local workstation state and restart continuity cycle?"
  },
  apps: {
    explorer: "Node Directory",
    terminal: "Command Shell",
    notes: "Operator Notes",
    media: "Signal Review",
    settings: "Workstation Settings",
    help: "Operations Manual",
    chat: "The Wakeful Thread",
    calculator: "Desk Calculator",
    calendar: "Calendar Lite",
    sysmon: "System Monitor",
    simulation: "Simulation Console",
    menuLabel: "Program Launcher",
    reset: "Reset Workstation",
    restart: "Restart Workstation",
    crash: "Force Kernel Crash"
  },
  simulation: {
    panelLabel: "scenario simulator",
    scenarioLabel: "Scenario",
    scenarioTooltip: "Choose a simulation scenario.",
    seedLabel: "Seed",
    seedTooltip: "Use a deterministic numeric seed.",
    seedPlaceholder: "Seed value",
    timelineLabel: "Timeline",
    compareLabel: "Branch Comparator",
    branchA: "Branch A",
    branchB: "Branch B",
    none: "none",
    metric: "Metric",
    emptyTimeline: "No events recorded. Start and step a run to populate the timeline.",
    started: "Simulation initiated: {scenario} (seed {seed}).",
    stepped: "Step applied: {eventType} on branch {branch}.",
    forked: "Branch created: {label}.",
    resetDone: "Simulation state cleared.",
    exported: "Simulation summary exported to {filename}.",
    forkPrompt: "Enter branch label",
    forkDefault: "alternate-branch",
    controls: {
      start: "Start",
      step: "Step",
      fork: "Fork",
      reset: "Reset",
      export: "Export Summary"
    },
    status: {
      run: "Run",
      branch: "Branch",
      events: "Events",
      confidence: "Confidence"
    },
    metrics: {
      trust: "Trust score",
      conflict: "Conflict score",
      pressure: "Pressure",
      success: "Success rate",
      events: "Event count"
    },
    notifications: {
      criticalDivergence: "Critical divergence detected ({divergence}) between branches {branchA} and {branchB}.",
      runComplete: "Simulation {runId} complete ({eventCount} events; trust {trust}; conflict {conflict})."
    },
    errors: {
      startFailed: "Simulation start failed: {message}",
      stepFailed: "Simulation step failed: {message}",
      forkFailed: "Simulation fork failed: {message}"
    }
  },
  explorer: {
    deniedAudit: "<span class='err'>ERR-AUTH-403</span>\nOperator note: align RTC with maintenance marker 03:11 in Workstation Settings.",
    unreadableMedia: "ERR-IO-442: Payload decoding failed.\nDiagnostics note: inspect printable strings from /media/cam2_20030418.dat within Command Shell.",
    empty: "[no readable payload]"
  },
  help: {
    title: "Operations Manual",
    intro: "Some references are unavailable due to archive degradation and redaction drift.",
    topics: [
      "Command shell procedures — see <code>/system/help/shell_help.txt</code>",
      "Object recovery procedures — see <code>/system/help/recovery_help.txt</code>",
      "Session identity mismatch after resume [article missing]",
      "Unexpected operator identity assignment [article missing]"
    ],
    quickStart: "Operator Checklist",
    noSteps: "No active checklist items for this protocol set.",
    chapterHints: {
      1: "Operator note: validate continuity records before credential elevation.",
      2: "Operator note: use maintenance-window behavior during deleted-object recovery.",
      3: "Operator note: reconcile system logs with recovered correspondence before final accounting."
    },
    chapterRecaps: {
      1: "Act I: Identity drift is underway. Confirm continuity records and establish what parts of the archive can be trusted.",
      2: "Act II: Recovery is live. Pull deleted material during the maintenance window and decode withheld evidence.",
      3: "Act III: Accounting phase. Reconcile directives, testimony, and trust outcomes before the system settles on one narrative."
    }
  },
  settings: {
    title: "Realtime Clock Offset",
    apply: "Apply Offset",
    syncMaintenance: "Sync RTC to 03:11",
    warning: "Caution: altering clock state may affect archival integrity and continuity checks.",
    maintenanceSuccess: "Clock synchronized to maintenance-window marker.",
    synced: "Clock synchronized to {time}.",
    invalid: "ERR-TIME-400: invalid time payload.",
    notify: "RTC offset updated.",
    animationTitle: "Accessibility",
    animationToggle: "Disable chat animation effects (instant assistant text)",
    animationHelp: "Applies to staged text reveal and glitch flicker behavior in The Wakeful Thread."
  }
};

export function formatCopy(template, values = {}) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}
