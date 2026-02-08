export const BUILTIN_SCENARIOS = {
  "archive-outage": {
    id: "archive-outage",
    label: "Archive Outage",
    description: "Archive availability drops and recovery pressure rises.",
    startingPressure: 2,
    tags: ["archive", "recovery"],
    eventTable: ["archive_timeout", "cache_recover", "operator_override", "observer_confirm"]
  },
  "relay-desync": {
    id: "relay-desync",
    label: "Relay Desync",
    description: "Transient relay timing and handshake failures.",
    startingPressure: 3,
    tags: ["relay", "timing"],
    eventTable: ["relay_jitter", "relay_timeout", "observer_ping_sync", "relay_recovered"]
  },
  "observer-contradiction": {
    id: "observer-contradiction",
    label: "Observer Contradiction",
    description: "Observer/operator narratives diverge under contradictory prompts.",
    startingPressure: 2,
    tags: ["observer", "trust"],
    eventTable: ["contradictory_log", "observer_dispute", "operator_concede", "joint_reconcile"]
  },
  "panic-loop": {
    id: "panic-loop",
    label: "Panic Loop",
    description: "Escalating panic loop with repeated corrective intervention.",
    startingPressure: 4,
    tags: ["panic", "manifestation"],
    eventTable: ["panic_spike", "panic_retry", "guided_breathing", "system_lockstep"]
  }
};

export function getScenarioDefinition(id) {
  return BUILTIN_SCENARIOS[id] || null;
}

export function listScenarioDefinitions() {
  return Object.values(BUILTIN_SCENARIOS);
}
