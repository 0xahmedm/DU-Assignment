/**
 * Sound effects generated in code (C74: no audio files), sfxr-style: short oscillator and noise
 * bursts with quick envelopes. The audio context is created on first use (browsers only allow
 * audio after a key press or click, which always happens before the first sound).
 */
type Wave = OscillatorType;

let ctx: AudioContext | undefined;
const MUTE_KEY = 'seal-chambers.muted';
let muted = (() => {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();
const audio = (): AudioContext | undefined => {
  if (muted) return undefined;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return undefined; // no audio (e.g. a headless test browser): play silently
  }
};

function tone(wave: Wave, from: number, to: number, ms: number, volume = 0.12, delayMs = 0): void {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + delayMs / 1000;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + ms / 1000);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + ms / 1000 + 0.02);
}

function noise(ms: number, volume = 0.1, highpass = 800): void {
  const a = audio();
  if (!a) return;
  const len = Math.floor((a.sampleRate * ms) / 1000);
  const buffer = a.createBuffer(1, len, a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  const filter = a.createBiquadFilter();
  const gain = a.createGain();
  src.buffer = buffer;
  filter.type = 'highpass';
  filter.frequency.value = highpass;
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(a.destination);
  src.start();
}

export const Sfx = {
  swing: () => noise(70, 0.05, 2500),
  hit: () => {
    tone('square', 420, 140, 90, 0.1);
    noise(60, 0.08, 1200);
  },
  clang: () => {
    tone('triangle', 1400, 1300, 160, 0.09);
    tone('triangle', 1870, 1750, 140, 0.06);
  },
  kill: () => {
    tone('sawtooth', 300, 60, 220, 0.1);
    noise(180, 0.1, 400);
  },
  defeat: () => {
    tone('sawtooth', 440, 55, 600, 0.12);
    tone('square', 220, 40, 700, 0.06, 80);
  },
  swap: () => tone('sine', 520, 880, 120, 0.08),
  bolt: () => tone('square', 900, 1600, 80, 0.05),
  dash: () => noise(120, 0.07, 1800),
  mirror: () => tone('triangle', 700, 1050, 90, 0.07),

  // Movement and crates (C58: every action answers). Frequent sounds stay quiet.
  jump: () => tone('square', 280, 470, 70, 0.025),
  /** `impact` 0..1: how hard the landing was. */
  land: (impact: number) => {
    tone('sine', 150, 60, 80, 0.04 + 0.05 * impact);
    noise(50, 0.02 + 0.04 * impact, 500);
  },
  pickUp: () => tone('square', 190, 320, 60, 0.035),
  putDown: () => {
    tone('sine', 170, 80, 70, 0.06);
    noise(40, 0.04, 500);
  },
  throw: () => noise(110, 0.045, 1400),
  crateLand: () => {
    tone('sine', 120, 45, 100, 0.08);
    noise(70, 0.06, 300);
  },
  /** An action the game refuses (no room to put the crate down, Throw in the air, Dash while carrying). */
  refuse: () => tone('square', 150, 115, 90, 0.035),

  // Puzzle state changes (C52: every state change gets a sound).
  plateDown: () => tone('triangle', 340, 250, 60, 0.05),
  plateUp: () => tone('triangle', 250, 340, 60, 0.03),
  doorOpen: () => {
    tone('sawtooth', 110, 230, 200, 0.03);
    noise(160, 0.025, 250);
  },
  doorClose: () => {
    tone('sawtooth', 230, 100, 180, 0.03);
    noise(120, 0.03, 250);
  },
  receiverOn: () => tone('sine', 880, 1320, 150, 0.05),
  /** Something passes through a gate (C106): a quick airy sweep. */
  gate: () => {
    tone('sine', 300, 1200, 130, 0.05);
    noise(90, 0.025, 2200);
  },
  gateOn: () => tone('triangle', 400, 800, 140, 0.045),
  gateOff: () => tone('triangle', 700, 350, 120, 0.03),
  receiverOff: () => tone('sine', 700, 440, 110, 0.03),
  /** The exit opens: a rising three-note chord. */
  exitOpen: () => {
    tone('sine', 523, 523, 260, 0.06);
    tone('sine', 659, 659, 240, 0.05, 70);
    tone('sine', 784, 784, 300, 0.05, 140);
  },
  // Menu (C108): a soft tick when the selection moves, a short rise to open, a fall to go back.
  menuMove: () => tone('square', 520, 560, 30, 0.018),
  menuSelect: () => tone('triangle', 440, 660, 90, 0.045),
  menuBack: () => tone('triangle', 520, 360, 80, 0.035),
  /** An upgrade is taken. */
  pick: () => {
    tone('triangle', 660, 990, 120, 0.06);
    tone('triangle', 880, 1320, 160, 0.05, 90);
  },

  get muted(): boolean {
    return muted;
  },
  /** M toggles all sound; remembered on this browser. */
  toggleMute(): boolean {
    muted = !muted;
    try {
      window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // not remembered; still muted for this session
    }
    return muted;
  },
};
