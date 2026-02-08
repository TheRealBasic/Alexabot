import { AUDIO_MIX_DEFAULTS, createAudioEngine } from "./audio/engine.js";

export function createPresentationController({ state, desktopRoot, taskbar, overlay, notify }) {
  let ambientNodes;
  let locked = false;
  let lastUiClickAt = 0;
  let lockReleaseTimer = null;
  const audio = createAudioEngine({ mix: AUDIO_MIX_DEFAULTS });
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const cinematicSeen = state.cinematicSeen || (state.cinematicSeen = {
    archiveUnlock: false,
    maintenance311: false,
    finalReveal: false,
    trustLock: false,
    trustSplit: false,
    trustCritical: false
  });

  function ensureAmbientPatch() {
    if (ambientNodes || !audio.ensureRunning()) return;
    const ctx = audio.getContext();
    if (!ctx) return;

    const ambienceBus = audio.getAmbienceBus();
    if (!ambienceBus) return;

    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = "highpass";
    hpFilter.frequency.value = 40;
    hpFilter.Q.value = 0.7;

    const lpFilter = ctx.createBiquadFilter();
    lpFilter.type = "lowpass";
    lpFilter.frequency.value = 3000;
    lpFilter.Q.value = 0.8;

    const widthPanner = typeof ctx.createStereoPanner === "function" ? ctx.createStereoPanner() : null;
    const widthLfo = widthPanner ? ctx.createOscillator() : null;
    const widthDepth = widthPanner ? ctx.createGain() : null;

    if (widthPanner && widthLfo && widthDepth) {
      widthLfo.type = "sine";
      widthLfo.frequency.value = 0.045;
      widthDepth.gain.value = 0.16;
      widthLfo.connect(widthDepth).connect(widthPanner.pan);
      widthLfo.start();
      lpFilter.connect(widthPanner).connect(ambienceBus);
    } else {
      lpFilter.connect(ambienceBus);
    }

    hpFilter.connect(lpFilter);

    const lowOsc = ctx.createOscillator();
    lowOsc.type = "triangle";
    lowOsc.frequency.value = 54;
    const lowOscGain = ctx.createGain();
    lowOscGain.gain.value = 0.0022;

    const lowSine = ctx.createOscillator();
    lowSine.type = "sine";
    lowSine.frequency.value = 42;
    const lowSineGain = ctx.createGain();
    lowSineGain.gain.value = 0.0016;

    const midNoise = ctx.createBufferSource();
    const midNoiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.5), ctx.sampleRate);
    const noiseData = midNoiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
    midNoise.buffer = midNoiseBuffer;
    midNoise.loop = true;

    const midBand = ctx.createBiquadFilter();
    midBand.type = "bandpass";
    midBand.frequency.value = 460;
    midBand.Q.value = 0.55;
    const midGain = ctx.createGain();
    midGain.gain.value = 0.0018;

    const airNoise = ctx.createBufferSource();
    airNoise.buffer = midNoiseBuffer;
    airNoise.loop = true;
    const airBand = ctx.createBiquadFilter();
    airBand.type = "highpass";
    airBand.frequency.value = 3600;
    airBand.Q.value = 0.4;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.00035;

    lowOsc.connect(lowOscGain).connect(hpFilter);
    lowSine.connect(lowSineGain).connect(hpFilter);
    midNoise.connect(midBand).connect(midGain).connect(hpFilter);
    airNoise.connect(airBand).connect(airGain).connect(hpFilter);

    lowOsc.start();
    lowSine.start();
    midNoise.start();
    airNoise.start();

    ambientNodes = {
      lowOsc,
      lowSine,
      midNoise,
      airNoise,
      widthLfo
    };
  }

  function startAmbient() {
    ensureAmbientPatch();
  }

  function uiClick() {
    const now = performance.now();
    if (now - lastUiClickAt < 75) return;
    lastUiClickAt = now;
    startAmbient();
    audio.playUiClick();
  }

  function addTimedClass(el, className, ms = 700) {
    if (!el) return;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), ms);
  }

  function lockInput(ms = 1800, text = "SYSTEM FOCUS REALIGNMENT") {
    locked = true;
    if (lockReleaseTimer) clearTimeout(lockReleaseTimer);
    overlay.textContent = text;
    overlay.classList.add("active");
    document.body.classList.add("input-locked");
    lockReleaseTimer = setTimeout(() => {
      locked = false;
      overlay.classList.remove("active");
      document.body.classList.remove("input-locked");
      lockReleaseTimer = null;
    }, ms);
  }

  function cinematicBeat({ text, lockMs, flickerMs = 900, scanlineMs = 1600, warningMs = 1300, stinger = 230 }) {
    startAmbient();
    audio.playCinematicStinger({ baseFreq: stinger });
    if (!prefersReducedMotion) {
      addTimedClass(desktopRoot, "fx-flicker", flickerMs);
      addTimedClass(desktopRoot, "fx-scanline-shift", scanlineMs);
      addTimedClass(taskbar, "fx-warning-pulse", warningMs);
    }
    lockInput(lockMs, text);
  }

  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.closest("button, .start-item, .icon, .task, .file-item, .tree-item") && !target.closest("button:disabled")) uiClick();
  });

  document.addEventListener("keydown", (e) => {
    if (!locked) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);


  function runCrashRebootSequence(event = {}) {
    if (overlay.classList.contains("crash-sequence-active")) return;
    startAmbient();
    audio.playCinematicStinger({ baseFreq: 84 });
    lockInput(5600, "SIGNAL COLLAPSE // PANIC HANDLER ENGAGED");

    overlay.classList.add("crash-sequence-active");
    overlay.dataset.phase = "panic";

    setTimeout(() => {
      overlay.dataset.phase = "reboot";
      audio.playCinematicStinger({ baseFreq: 124 });
    }, 1750);

    setTimeout(() => {
      overlay.dataset.phase = "restoring";
      audio.playCinematicStinger({ baseFreq: 182 });
    }, 3550);

    setTimeout(() => {
      overlay.classList.remove("crash-sequence-active");
      overlay.classList.remove("active");
      overlay.dataset.phase = "";
      document.body.classList.remove("input-locked");
      locked = false;
      notify?.(event.notification || "Continuity Event: simulated crash/reboot completed. Session state preserved.", { actor: "system" });
    }, prefersReducedMotion ? 2600 : 5600);
  }

  function handleStateTransition(prev, next) {
    if (!prev.unlocked.archive && next.unlocked.archive && !cinematicSeen.archiveUnlock) {
      cinematicSeen.archiveUnlock = true;
      cinematicBeat({
        text: "ARCHIVE CHANNEL UNSEALED // MEMORY LAYER BECOMING POROUS",
        lockMs: 2200,
        stinger: 210
      });
    }

    if (!prev.unlocked.redactedLog && next.unlocked.redactedLog && !cinematicSeen.maintenance311) {
      cinematicSeen.maintenance311 = true;
      cinematicBeat({
        text: "03:11 MAINTENANCE WINDOW DETECTED // RESTRICTED PIPELINES OPEN",
        lockMs: 2400,
        stinger: 170
      });
    }

    if (!prev.unlocked.mediaReveal && next.unlocked.mediaReveal && !cinematicSeen.finalReveal) {
      cinematicSeen.finalReveal = true;
      cinematicBeat({
        text: "FINAL REVEAL // OBSERVER AND ARCHIVE NOW CO-RESIDENT",
        lockMs: 3000,
        stinger: 128
      });
    }

    const prevTrust = Number(prev.teamTrustScore || 0);
    const nextTrust = Number(next.teamTrustScore || 0);
    const conflictDelta = (next.recentConflicts?.length || 0) - (prev.recentConflicts?.length || 0);

    if (nextTrust >= 3 && prevTrust < 3 && !cinematicSeen.trustLock) {
      cinematicSeen.trustLock = true;
      cinematicBeat({
        text: "TEAM LOCK // SYNCHRONY ACCEPTED",
        lockMs: 1800,
        stinger: 260
      });
    }

    if ((conflictDelta > 0 || nextTrust <= -2) && !cinematicSeen.trustSplit) {
      cinematicSeen.trustSplit = true;
      cinematicBeat({
        text: "SPLIT WARNING // COMMAND DIVERGENCE RISING",
        lockMs: 2000,
        warningMs: 2100,
        stinger: 155
      });
    }

    if (nextTrust <= -4 && prevTrust > -4 && !cinematicSeen.trustCritical) {
      cinematicSeen.trustCritical = true;
      cinematicBeat({
        text: "CRITICAL TRUST CASCADE // FALLBACK ROUTE FORCED",
        lockMs: 2600,
        warningMs: 2500,
        stinger: 96
      });
    }
  }

  return { startAmbient, handleStateTransition, runCrashRebootSequence };
}
