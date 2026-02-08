import { getEventRule } from "./rules.js";

function confidenceInterval(mean, sampleSize) {
  if (!sampleSize) return { lower: mean, upper: mean };
  const margin = 1.96 * Math.sqrt(Math.max(0, mean * (1 - mean)) / sampleSize);
  return {
    lower: Number(Math.max(0, mean - margin).toFixed(3)),
    upper: Number(Math.min(1, mean + margin).toFixed(3))
  };
}

export function deriveSimulationMetrics(simulationState) {
  const log = simulationState?.eventLog || [];
  const scores = {
    trustScore: 0,
    conflictScore: 0,
    chapterPressure: 0,
    confidence: 0.5
  };

  for (const entry of log) {
    const rule = getEventRule(entry.eventType);
    scores.trustScore += rule.trust;
    scores.conflictScore += rule.conflict;
    scores.chapterPressure = Math.max(0, scores.chapterPressure + rule.pressure);
    scores.confidence = Math.max(0.05, Math.min(0.99, scores.confidence + rule.confidenceImpact));
  }

  const successSamples = log.filter((entry) => {
    const rule = getEventRule(entry.eventType);
    return rule.trust > 0 || rule.conflict < 0;
  }).length;
  const sampleSize = Math.max(1, log.length);
  const successRate = successSamples / sampleSize;

  return {
    ...scores,
    eventCount: log.length,
    branchCount: Object.keys(simulationState?.branches || {}).length,
    successRate: Number(successRate.toFixed(3)),
    confidenceInterval: confidenceInterval(successRate, sampleSize)
  };
}
