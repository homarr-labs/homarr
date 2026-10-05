// Pure timing helpers. Every visual value in the reel is a function of time.

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const map = (t: number, a: number, b: number, c: number, d: number) => lerp(c, d, seg(t, a, b));

export const E = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  outQuart: (t: number) => 1 - (1 - t) ** 4,
  inQuart: (t: number) => t ** 4,
  inOutQuart: (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
  outQuint: (t: number) => 1 - (1 - t) ** 5,
  inOutQuint: (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  inExpo: (t: number) => (t <= 0 ? 0 : 2 ** (10 * t - 10)),
  inOutExpo: (t: number) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2,
  outBack: (t: number, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
  inBack: (t: number, s = 1.70158) => (s + 1) * t ** 3 - s * t * t,
  outCirc: (t: number) => Math.sqrt(1 - (t - 1) ** 2),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
};

/** Analytic damped spring from 0 to 1. `t` in seconds. */
export function spring(t: number, freq = 3.2, damp = 0.42) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * freq;
  const wd = w * Math.sqrt(1 - damp * damp);
  return 1 - Math.exp(-damp * w * t) * (Math.cos(wd * t) + ((damp * w) / wd) * Math.sin(wd * t));
}

/** Seeded, stateless pseudo random in [0, 1). */
export function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/** Smooth 1D value noise, stateless. */
export function noise(x: number, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(rand(i + seed * 97.3), rand(i + 1 + seed * 97.3), u) * 2 - 1;
}

/** Envelope: 0 → 1 during [a, a+inD], holds, 1 → 0 during [b-outD, b]. */
export function env(t: number, a: number, b: number, inD = 0.5, outD = 0.4, ei = E.outExpo, eo = E.inCubic) {
  if (t < a || t > b) return 0;
  const i = ei(seg(t, a, a + inD));
  const o = 1 - eo(seg(t, b - outD, b));
  return Math.min(i, o);
}

/** Beat pulse: sharp attack, exponential decay after each hit time. */
export function pulse(t: number, hits: number[], decay = 6) {
  let v = 0;
  for (const h of hits) if (t >= h) v = Math.max(v, Math.exp(-(t - h) * decay));
  return v;
}

// Tempo of the soundtrack (MOKKA – Synthetic Pleasures); scene lengths are whole bars of it.
export const BPM = 93;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
