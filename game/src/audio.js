// game/src/audio.js — all sound is synthesised with WebAudio for Sky Courier (~/workspace/makefun/flight-entry/)
// Engine hum follows throttle, plus chimes, whistles, thuds and a little title melody.
// Nothing is loaded from a file; the context starts on the first user gesture.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let engineFilter = null;
  let windSource = null;
  let windGain = null;
  let windFilter = null;
  let muted = false;
  let melodyTimer = 0;
  let melodyStep = 0;

  // Gentle island melody (C major pentatonic-ish), played on the title screen.
  const MELODY = [72, 76, 79, 81, 79, 76, 74, 72, 0, 76, 79, 81, 84, 81, 79, 76];

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);

      // Engine: two detuned saws through a low-pass, pitch follows throttle.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'square';
      engineOsc2.frequency.value = 110;
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineOsc2.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      engineOsc2.start();

      // Wind: looped noise through a band-pass, gain follows airspeed.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      windSource = ctx.createBufferSource();
      windSource.buffer = buf;
      windSource.loop = true;
      windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 900;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      windSource.start();
      return true;
    } catch (err) {
      ctx = null;
      return false;
    }
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, freq) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq || 800;
    const g = ctx.createGain();
    g.gain.value = vol || 0.3;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0);
  }

  return {
    // Call from any user gesture (key/click) so the browser lets audio start.
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
    },
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    // Continuous engine + wind, called every frame while flying.
    setFlight(throttle, speed, airborne) {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const target = airborne ? 0.05 + throttle * 0.075 : 0.0;
      engineGain.gain.setTargetAtTime(target, t, 0.1);
      engineOsc.frequency.setTargetAtTime(52 + throttle * 68, t, 0.1);
      engineOsc2.frequency.setTargetAtTime(104 + throttle * 130, t, 0.1);
      engineFilter.frequency.setTargetAtTime(320 + throttle * 900, t, 0.15);
      windGain.gain.setTargetAtTime(airborne ? Math.min(0.12, speed * 0.00045) : 0, t, 0.2);
      windFilter.frequency.setTargetAtTime(600 + speed * 3, t, 0.2);
    },
    ring() {
      tone(880, 0.16, 'sine', 0.25);
      tone(1318, 0.3, 'sine', 0.2, 0.07);
    },
    combo(level) {
      const base = 660 + level * 110;
      tone(base, 0.14, 'triangle', 0.22);
      tone(base * 1.5, 0.22, 'triangle', 0.18, 0.06);
    },
    dropWhistle() {
      tone(900, 0.7, 'sine', 0.14, 0, 320);
    },
    thud() {
      noiseBurst(0.18, 0.35, 300);
      tone(120, 0.2, 'sine', 0.3, 0, 60);
    },
    score() {
      tone(1046, 0.12, 'triangle', 0.2);
      tone(1568, 0.2, 'triangle', 0.18, 0.08);
    },
    land() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.2, i * 0.11));
    },
    crash() {
      noiseBurst(0.7, 0.5, 500);
      tone(90, 0.6, 'sawtooth', 0.25, 0, 40);
    },
    click() {
      tone(1200, 0.06, 'square', 0.12);
    },
    takeoff() {
      tone(220, 0.5, 'sawtooth', 0.12, 0, 440);
    },
    // Short low-fuel warning beep, called at most once every few seconds.
    fuelWarn() {
      tone(620, 0.12, 'square', 0.14);
      tone(620, 0.12, 'square', 0.14, 0.18);
    },
    // One soft melody note per call while on the title screen.
    melodyTick(dt) {
      if (!ctx || muted) return;
      melodyTimer -= dt;
      if (melodyTimer > 0) return;
      melodyTimer = 0.34;
      const note = MELODY[melodyStep % MELODY.length];
      melodyStep++;
      if (note > 0) {
        const freq = 440 * Math.pow(2, (note - 69) / 12);
        tone(freq, 0.5, 'sine', 0.09);
        tone(freq / 2, 0.5, 'sine', 0.05);
      }
    },
  };
}
