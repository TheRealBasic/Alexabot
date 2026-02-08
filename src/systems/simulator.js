import { emitSystemEvent } from "./events.js";
import { SERVICE_MODELS, ensureSystemSimulationState } from "./services.js";

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function computeStatus(health) {
  if (health < 0.4) return "critical";
  if (health < 0.7) return "degraded";
  return "active";
}

export function tickSystemSimulation(state, options = {}) {
  const sim = ensureSystemSimulationState(state);
  const now = options.now ?? Date.now();
  const random = options.random || Math.random;

  sim.tick += 1;
  sim.lastTickAt = now;

  for (const [name, service] of Object.entries(sim.services)) {
    const model = SERVICE_MODELS[name];
    const depPenalty = service.dependencies.reduce((acc, depName) => {
      const dep = sim.services[depName];
      return dep ? acc + Math.max(0, 0.75 - dep.health) * 0.2 : acc;
    }, 0);

    const jitter = (random() - 0.5) * model.driftRate;
    const anomalyHit = random() < model.anomalyProbability;
    const driftDelta = model.driftRate + depPenalty + jitter + (anomalyHit ? model.driftRate * 1.6 : 0);
    service.drift = clamp(service.drift + driftDelta, 0, 3);
    service.trend = driftDelta;
    service.health = clamp(service.health - driftDelta * 0.32 + (random() * 0.006));

    if (anomalyHit) {
      service.anomaly = true;
      const anomaly = {
        at: now,
        code: `ANOM-${name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6)}-${sim.tick}`,
        severity: service.health < 0.45 ? "critical" : "warning"
      };
      service.anomalies.push(anomaly);
      service.anomalies = service.anomalies.slice(-12);
      service.trace.push(`[${sim.tick}] anomaly ${anomaly.code} severity=${anomaly.severity}`);
      emitSystemEvent(state, {
        type: "service.anomaly",
        level: anomaly.severity,
        service: name,
        message: `anomaly ${anomaly.code} detected`
      });
    } else {
      service.anomaly = false;
    }

    if (service.health <= model.recoveryThreshold) {
      service.restartCount += 1;
      service.lastRestartAt = now;
      service.health = clamp(model.recoveryThreshold + 0.28 + random() * 0.15);
      service.drift = clamp(service.drift * 0.35);
      service.trace.push(`[${sim.tick}] auto-recovery restart #${service.restartCount}`);
      emitSystemEvent(state, {
        type: "service.recovered",
        level: "info",
        service: name,
        message: `auto-recovery triggered (restart #${service.restartCount})`
      });
    }

    service.status = computeStatus(service.health);
    service.history.push(Number(service.health.toFixed(4)));
    service.history = service.history.slice(-30);
    service.trace = service.trace.slice(-40);
  }

  sim.snapshots.push({
    tick: sim.tick,
    at: now,
    services: Object.fromEntries(Object.entries(sim.services).map(([name, svc]) => [name, {
      health: Number(svc.health.toFixed(3)),
      status: svc.status,
      anomaly: svc.anomaly
    }]))
  });
  sim.snapshots = sim.snapshots.slice(-20);

  return sim;
}

export function getServiceStatusTable(state) {
  const sim = ensureSystemSimulationState(state);
  return Object.values(sim.services).map((svc) => ({
    name: svc.name,
    status: svc.status,
    health: svc.health,
    drift: svc.drift,
    restartCount: svc.restartCount,
    anomaly: svc.anomaly,
    dependencies: svc.dependencies
  }));
}

export function restartService(state, name, reason = "manual") {
  const sim = ensureSystemSimulationState(state);
  const service = sim.services[name];
  if (!service) return { ok: false, message: "service: unknown unit" };

  service.restartCount += 1;
  service.lastRestartAt = Date.now();
  service.health = 0.88;
  service.drift = Math.max(0, service.drift * 0.2);
  service.anomaly = false;
  service.status = "active";
  service.trace.push(`[${sim.tick}] restart #${service.restartCount} reason=${reason}`);
  service.trace = service.trace.slice(-40);

  emitSystemEvent(state, {
    type: "service.restart",
    level: "info",
    service: name,
    message: `restart completed (${reason})`
  });

  return { ok: true, service };
}

export function getServiceTrace(state, name) {
  const sim = ensureSystemSimulationState(state);
  const service = sim.services[name];
  if (!service) return { ok: false, message: "service: unknown unit", lines: [] };
  const lines = [
    `${name} trace:`,
    `status=${service.status} health=${service.health.toFixed(2)} drift=${service.drift.toFixed(2)} restarts=${service.restartCount}`,
    ...service.trace.slice(-10)
  ];
  return { ok: true, lines };
}
