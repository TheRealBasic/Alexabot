import { getReactiveBootloaderLines } from "./progression/reactions.js";
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

export async function runBoot({ state, bootText, bootEl, splash, login, lastSession }) {
  const writeBootLine = (line) => {
    bootText.textContent += `${line}\n`;
  };

  const bios = bootVariants[state.bootCount % bootVariants.length];
  for (const line of bios) {
    writeBootLine(line);
    await sleep(170 + Math.random() * 130);
  }

  writeBootLine("----------------------------------------");

  const lines = getReactiveBootloaderLines(bootloaderLines, state);

  for (const line of lines) {
    const corrupt = Math.random() < 0.11;
    writeBootLine(corrupt ? line.replace(/[aeiou]/gi, "?") : line);
    await sleep(130 + Math.random() * 120);
  }

  await sleep(450);
  bootEl.style.display = "none";
  splash.style.display = "flex";
  await sleep(1300);
  splash.style.display = "none";
  login.style.display = "flex";
  lastSession.textContent = state.bootCount > 1
    ? `Last recovered boot: ${new Date(Date.now() - 3600_000).toLocaleString()} (incomplete shutdown)`
    : "No complete shutdown record found.";
}
