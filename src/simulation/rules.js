const EVENT_RULES = {
  archive_timeout: { weight: 18, trust: -1, conflict: 1, pressure: 2, chapterDelta: 0, confidenceImpact: -0.08 },
  cache_recover: { weight: 14, trust: 1, conflict: -1, pressure: -1, chapterDelta: 0, confidenceImpact: 0.07 },
  operator_override: { weight: 10, trust: -2, conflict: 2, pressure: 1, chapterDelta: 0, confidenceImpact: -0.1 },
  observer_confirm: { weight: 12, trust: 2, conflict: -1, pressure: -1, chapterDelta: 1, confidenceImpact: 0.08 },

  relay_jitter: { weight: 20, trust: -1, conflict: 1, pressure: 1, chapterDelta: 0, confidenceImpact: -0.05 },
  relay_timeout: { weight: 16, trust: -2, conflict: 2, pressure: 2, chapterDelta: 0, confidenceImpact: -0.08 },
  observer_ping_sync: { weight: 13, trust: 1, conflict: -1, pressure: -1, chapterDelta: 0, confidenceImpact: 0.06 },
  relay_recovered: { weight: 9, trust: 2, conflict: -1, pressure: -2, chapterDelta: 1, confidenceImpact: 0.09 },

  contradictory_log: { weight: 15, trust: -1, conflict: 2, pressure: 1, chapterDelta: 0, confidenceImpact: -0.07 },
  observer_dispute: { weight: 16, trust: -2, conflict: 2, pressure: 2, chapterDelta: 0, confidenceImpact: -0.08 },
  operator_concede: { weight: 11, trust: 1, conflict: -1, pressure: -1, chapterDelta: 0, confidenceImpact: 0.06 },
  joint_reconcile: { weight: 8, trust: 2, conflict: -2, pressure: -2, chapterDelta: 1, confidenceImpact: 0.1 },

  panic_spike: { weight: 20, trust: -1, conflict: 1, pressure: 2, chapterDelta: 0, confidenceImpact: -0.06 },
  panic_retry: { weight: 18, trust: -1, conflict: 1, pressure: 1, chapterDelta: 0, confidenceImpact: -0.05 },
  guided_breathing: { weight: 10, trust: 1, conflict: -1, pressure: -2, chapterDelta: 0, confidenceImpact: 0.07 },
  system_lockstep: { weight: 7, trust: 2, conflict: -1, pressure: -1, chapterDelta: 1, confidenceImpact: 0.09 }
};

function normalizedWeight(baseWeight, context = {}) {
  const pressure = Number(context.chapterPressure || 0);
  if (pressure <= 0) return baseWeight;
  return Math.max(1, Math.round(baseWeight + pressure * 0.5));
}

export function getEventRule(eventType) {
  return EVENT_RULES[eventType] || {
    weight: 1,
    trust: 0,
    conflict: 0,
    pressure: 0,
    chapterDelta: 0,
    confidenceImpact: 0
  };
}

export function resolveWeightedOutcome(events, rng, context = {}) {
  const candidates = (events || []).map((eventType) => ({
    eventType,
    rule: getEventRule(eventType),
    adjustedWeight: normalizedWeight(getEventRule(eventType).weight, context)
  }));

  const total = candidates.reduce((sum, item) => sum + item.adjustedWeight, 0);
  if (!total) return null;
  const threshold = rng() * total;

  let cursor = 0;
  for (const item of candidates) {
    cursor += item.adjustedWeight;
    if (threshold <= cursor) {
      return {
        eventType: item.eventType,
        ...item.rule,
        adjustedWeight: item.adjustedWeight
      };
    }
  }

  return {
    eventType: candidates[candidates.length - 1].eventType,
    ...candidates[candidates.length - 1].rule,
    adjustedWeight: candidates[candidates.length - 1].adjustedWeight
  };
}
