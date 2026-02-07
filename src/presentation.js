export function createPresentationController({ state, desktopRoot, taskbar, overlay }) {
  let audioCtx;
  let humNode;
  let humLfo;
  let locked = false;

  const cinematicSeen = state.cinematicSeen || (state.cinematicSeen = {
    archiveUnlock: false,
    maintenance311: false,
    finalReveal: false
  });

  function ensureAudioContext() {
    if (audioCtx) return true;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      return true;
    } catch {
      return false;
    }
  }

  function pulseTone({ freq = 320, duration = 0.12, type = "square", gain = 0.03 } = {}) {
    if (!ensureAudioContext()) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(amp).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  function ensureHum() {
    if (humNode || !ensureAudioContext()) return;
    humNode = audioCtx.createOscillator();
    const humGain = audioCtx.createGain();
    humLfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();

    humNode.type = "sawtooth";
    humNode.frequency.value = 58;
    humGain.gain.value = 0.008;

    humLfo.type = "sine";
    humLfo.frequency.value = 0.19;
    lfoGain.gain.value = 5;

    humLfo.connect(lfoGain).connect(humNode.frequency);
    humNode.connect(humGain).connect(audioCtx.destination);
    humNode.start();
    humLfo.start();
  }

  function startAmbient() {
    if (!ensureAudioContext()) return;
    if (audioCtx.state === "suspended") audioCtx.resume();
    ensureHum();
  }

  function uiClick() {
    startAmbient();
    pulseTone({ freq: 860, duration: 0.03, type: "triangle", gain: 0.012 });
  }

  function addTimedClass(el, className, ms = 700) {
    if (!el) return;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), ms);
  }

  function lockInput(ms = 1800, text = "SYSTEM FOCUS REALIGNMENT") {
    locked = true;
    overlay.textContent = text;
    overlay.classList.add("active");
    document.body.classList.add("input-locked");
    setTimeout(() => {
      locked = false;
      overlay.classList.remove("active");
      document.body.classList.remove("input-locked");
    }, ms);
  }

  function cinematicBeat({ text, lockMs, flickerMs = 900, scanlineMs = 1600, warningMs = 1300, stinger = 230 }) {
    startAmbient();
    pulseTone({ freq: stinger, duration: 0.16, type: "sawtooth", gain: 0.05 });
    setTimeout(() => pulseTone({ freq: stinger * 1.7, duration: 0.2, type: "triangle", gain: 0.035 }), 140);
    addTimedClass(desktopRoot, "fx-flicker", flickerMs);
    addTimedClass(desktopRoot, "fx-scanline-shift", scanlineMs);
    addTimedClass(taskbar, "fx-warning-pulse", warningMs);
    lockInput(lockMs, text);
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("button, .start-item, .icon, .task, .file-item, .tree-item")) uiClick();
  });

  document.addEventListener("keydown", (e) => {
    if (!locked) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

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
  }

  return { startAmbient, handleStateTransition };
}
