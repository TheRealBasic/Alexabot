const DEFAULT_SAMPLE_PATHS = {
  uiClick: "assets/audio/ui-click.mp3",
  cinematicStinger: "assets/audio/cinematic-stinger.mp3"
};

export function createAudioEngine({ masterVolume = 0.65, samplePaths = DEFAULT_SAMPLE_PATHS } = {}) {
  let audioCtx;
  let masterGain;
  let noiseBuffer;
  const buffers = new Map();

  function ensureAudioContext() {
    if (audioCtx) return true;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return false;
    try {
      audioCtx = new AudioContextCtor();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = Math.min(Math.max(masterVolume, 0), 1);
      masterGain.connect(audioCtx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function resumeIfNeeded() {
    if (!ensureAudioContext()) return false;
    if (audioCtx.state === "suspended") audioCtx.resume();
    return true;
  }

  function setMasterVolume(value = 1) {
    if (!ensureAudioContext()) return;
    const safeValue = Math.min(Math.max(Number(value) || 0, 0), 1);
    masterGain.gain.setTargetAtTime(safeValue, audioCtx.currentTime, 0.01);
  }

  function getNoiseBuffer() {
    if (noiseBuffer) return noiseBuffer;
    const frameCount = Math.max(1, Math.floor((audioCtx?.sampleRate || 44100) * 0.35));
    noiseBuffer = audioCtx.createBuffer(1, frameCount, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) data[i] = (Math.random() * 2 - 1) * 0.85;
    return noiseBuffer;
  }

  async function preloadOneShot(name, path) {
    if (!path || !ensureAudioContext()) return;
    try {
      const res = await fetch(path);
      if (!res.ok) return;
      const arrayBuffer = await res.arrayBuffer();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      buffers.set(name, decoded);
    } catch {
      // Fallback synthesis will be used.
    }
  }

  function scheduleLayeredSynth({
    time = audioCtx.currentTime,
    freq = 440,
    duration = 0.08,
    gain = 0.09,
    noiseMix = 0.32,
    transientFreq = 2100,
    noiseFreq = 2200
  } = {}) {
    const bodyOsc = audioCtx.createOscillator();
    const bodyGain = audioCtx.createGain();
    bodyOsc.type = "sine";
    bodyOsc.frequency.setValueAtTime(freq, time);
    bodyGain.gain.setValueAtTime(0.0001, time);
    bodyGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), time + 0.009);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    bodyOsc.connect(bodyGain).connect(masterGain);
    bodyOsc.start(time);
    bodyOsc.stop(time + duration + 0.02);

    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = getNoiseBuffer();
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(noiseFreq, time);
    noiseFilter.Q.setValueAtTime(1.4, time);
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, time);
    noiseGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * noiseMix), time + 0.004);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.55);
    noiseSource.connect(noiseFilter).connect(noiseGain).connect(masterGain);
    noiseSource.start(time);
    noiseSource.stop(time + duration + 0.02);

    const transientOsc = audioCtx.createOscillator();
    transientOsc.type = "triangle";
    transientOsc.frequency.setValueAtTime(transientFreq, time);
    transientOsc.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 2.5), time + 0.02);
    const transientGain = audioCtx.createGain();
    transientGain.gain.setValueAtTime(Math.max(0.0001, gain * 0.42), time);
    transientGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.028);
    transientOsc.connect(transientGain).connect(masterGain);
    transientOsc.start(time);
    transientOsc.stop(time + 0.04);
  }

  function playSample(name, { gain = 1, playbackRate = 1, when = 0 } = {}) {
    const buffer = buffers.get(name);
    if (!buffer || !resumeIfNeeded()) return false;
    const t = audioCtx.currentTime + when;
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    const amp = audioCtx.createGain();
    amp.gain.setValueAtTime(Math.max(0, gain), t);
    source.connect(amp).connect(masterGain);
    source.start(t);
    return true;
  }

  function playUiClick() {
    if (!resumeIfNeeded()) return;
    if (!playSample("uiClick", { gain: 0.42 })) {
      scheduleLayeredSynth({
        freq: 760,
        duration: 0.032,
        gain: 0.05,
        noiseMix: 0.45,
        transientFreq: 2900,
        noiseFreq: 3200
      });
    }
  }

  function playCinematicStinger({ baseFreq = 220 } = {}) {
    if (!resumeIfNeeded()) return;
    const playedSample = playSample("cinematicStinger", { gain: 0.55 });
    const t = audioCtx.currentTime;
    scheduleLayeredSynth({
      time: t,
      freq: baseFreq,
      duration: 0.18,
      gain: playedSample ? 0.035 : 0.09,
      noiseMix: 0.28,
      transientFreq: 1250,
      noiseFreq: Math.max(900, baseFreq * 5)
    });
    scheduleLayeredSynth({
      time: t + 0.12,
      freq: baseFreq * 1.55,
      duration: 0.16,
      gain: playedSample ? 0.03 : 0.075,
      noiseMix: 0.24,
      transientFreq: 1450,
      noiseFreq: Math.max(1200, baseFreq * 5.8)
    });
  }

  if (samplePaths?.uiClick) preloadOneShot("uiClick", samplePaths.uiClick);
  if (samplePaths?.cinematicStinger) preloadOneShot("cinematicStinger", samplePaths.cinematicStinger);

  return {
    playUiClick,
    playCinematicStinger,
    setMasterVolume
  };
}
