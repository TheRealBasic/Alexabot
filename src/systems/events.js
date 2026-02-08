const listeners = new Set();

export function subscribeSystemEvents(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitSystemEvent(state, event) {
  if (!state?.systemSimulationState) return;
  const payload = {
    id: `${event.type}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    at: Date.now(),
    ...event
  };

  state.systemSimulationState.events.push(payload);
  state.systemSimulationState.events = state.systemSimulationState.events.slice(-60);

  if (payload.level === "warning" || payload.level === "critical") {
    const line = `[${new Date(payload.at).toISOString()}] ${payload.service || "system"}: ${payload.message}`;
    state.systemSimulationState.warnings.push(line);
    state.systemSimulationState.warnings = state.systemSimulationState.warnings.slice(-30);
  }

  for (const listener of listeners) listener(payload, state);
}
