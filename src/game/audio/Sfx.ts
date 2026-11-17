/**
 * Sound effects generated in code (C74: no audio files), sfxr-style: short oscillator and noise
 * bursts with quick envelopes. The audio context is created on first use (browsers only allow
 * audio after a key press or click, which always happens before the first sound).
 */
type Wave = OscillatorType;

let ctx: AudioContext | undefined;
const audio = (): AudioContext | undefined => {
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
};
