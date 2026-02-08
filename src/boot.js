import { getReactiveBootloaderLines } from "./progression/reactions.js";
export const BOOT_STAGES = ["bios", "init", "service-start", "desktop-ready"];

export const bootVariants = [
  ["EIDOLON BIOS v0.93", "CPU: MARS K7 @ 1.1GHz", "Memory Test: 65536K OK", "IDE0: QUANTA_QD320 [Warning: delayed spin-up]", "IDE1: NONE", "PS/2 Keyboard...OK", "RTC Drift: +47m", "Boot Flag: RECOVERY_IMAGE"],
  ["EIDOLON BIOS v0.93", "CPU: MARS K7 @ 1.1GHz", "Memory Test: 65536K ... 65408K", "Memory Map Conflict @ 0x000F3A20", "IDE0: QUANTA_QD320", "SMART STATUS: UNKNOWN", "Last Shutdown: UNEXPECTED", "Boot Flag: RESUME_CONTINUITY"],
  ["EIDOLON BIOS v0.93", "Bus Scan...", "PS/2 Keyboard...OK", "PS/2 Mouse...MISSING", "IDE0: QUANTA_QD320", "Device Signature Mismatch [ignored]", "Presence Check: PASS", "Boot Flag: NORMAL"]
];

export const bootloaderLines = [
  "loading /boot/kernel.img",
  "loading /boot/initrd.img",
  "applying continuity map...",
  "mounting /sys ... ok",
  "replaying deferred process table",
  "warning: previous shell did not terminate",
  "starting session daemon",
  "integrity: pass/pass/pass/--",
  "log replay: 2003-04-19 03:11:02",
  "log replay: 2003-04-19 03:11:02",
  "log replay: 2003-04-19 03:11:02",
  "handoff to userspace"
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getLifecyclePressure(state) {
  const trust = Number(state.teamTrustScore || 0);
  const conflicts = Array.isArray(state.recentConflicts) ? state.recentConflicts.length : 0;
  const chapter = Number(state.chapter || 1);
  return { trust, conflicts, chapter };
}

export function resolveBootServiceOutcomes(state) {
  const { trust, conflicts, chapter } = getLifecyclePressure(state);
  return [
    {
      name: "session-daemon",
      status: conflicts >= 3 ? "retry" : "ok"
    },
    {
      name: "continuity-index",
      status: trust <= -2 || chapter >= 3 ? "degraded" : "ok"
    },
    {
      name: "observer-relay",
      status: trust >= 2 && conflicts <= 1 ? "ok" : (conflicts >= 2 ? "retry" : "degraded")
    }
  ];
}

export function createRecoveryArtifacts(state, reason = "restart") {
  const services = resolveBootServiceOutcomes(state);
  const summary = services.map((service) => `${service.name}:${service.status}`).join(", ");
  const base = {
    id: `boot-${Date.now()}`,
    timestamp: new Date().toISOString(),
    reason,
    chapter: state.chapter,
    trust: Number(state.teamTrustScore || 0),
    conflicts: Array.isArray(state.recentConflicts) ? state.recentConflicts.length : 0,
    services,
    summary
  };

  if (reason === "crash") {
    base.panicFragment = `panic: continuity fault // chapter=${base.chapter} trust=${base.trust} conflicts=${base.conflicts}`;
  }

  return base;
}

export function applyLifecycleEvent(state, eventType = "restart") {
  const event = eventType === "crash" ? "crash" : "restart";
  const report = createRecoveryArtifacts(state, event);
  state.lastBootReport = report;
  state.panicFragment = report.panicFragment || "";
  state.pendingRecoveryNotice = true;
  state.lastBootMessage = event === "crash"
    ? "Recovered previous session. Diagnostics: /logs/diagnostics/last_boot_report.log"
    : "Session restarted. Diagnostics: /logs/diagnostics/last_boot_report.log";
  return report;
}

export async function runBoot({ state, bootText, bootEl, splash, login, lastSession, onService }) {
  const writeBootLine = (line) => {
    bootText.textContent += `${line}\n`;
  };

  state.bootStage = "bios";
  writeBootLine(`[boot] stage=${state.bootStage}`);

  const bios = bootVariants[state.bootCount % bootVariants.length];
  for (const line of bios) {
    writeBootLine(line);
    await sleep(170 + Math.random() * 130);
  }

  writeBootLine("----------------------------------------");

  state.bootStage = "init";
  writeBootLine(`[boot] stage=${state.bootStage}`);

  const lines = getReactiveBootloaderLines(bootloaderLines, state);

  for (const line of lines) {
    const corrupt = Math.random() < 0.11;
    writeBootLine(corrupt ? line.replace(/[aeiou]/gi, "?") : line);
    await sleep(130 + Math.random() * 120);
  }

  state.bootStage = "service-start";
  writeBootLine(`[boot] stage=${state.bootStage}`);

  const serviceOutcomes = resolveBootServiceOutcomes(state);
  state.lastBootServices = serviceOutcomes;
  for (const service of serviceOutcomes) {
    writeBootLine(`[service] ${service.name} -> ${service.status.toUpperCase()}`);
    if (typeof onService === "function") onService(service);
    await sleep(90 + Math.random() * 80);
  }

  await sleep(450);
  bootEl.style.display = "none";
  splash.style.display = "flex";
  await sleep(1300);
  splash.style.display = "none";
  login.style.display = "flex";
  state.bootStage = "desktop-ready";
  const chapterStatus = ["Act I // Orientation", "Act II // Retrieval", "Act III // Disclosure"][Math.min(state.chapter - 1, 2)];
  const recovered = state.pendingRecoveryNotice && state.lastBootReport;
  lastSession.textContent = recovered
    ? `Recovered previous session — diagnostics: /logs/diagnostics/last_boot_report.log — ${chapterStatus}`
    : state.bootCount > 1
    ? `Last recovered boot: ${new Date(Date.now() - 3600_000).toLocaleString()} (incomplete shutdown) — ${chapterStatus}`
    : `No complete shutdown record found. ${chapterStatus}`;
}
