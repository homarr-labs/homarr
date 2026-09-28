import type { LogoState } from "../three/logo";

export interface Fx {
  flash: number; // 0..1 white flash
  flashColor: string;
  shake: number; // px amplitude
  ca: number; // chromatic aberration px
  fade: number; // 0..1 black
  zoom: number; // world zoom punch
  grain: number;
  vignette: number;
  glBlur: number;
}

export interface Ctx {
  logo: LogoState;
  fx: Fx;
  frame: number;
}

export type CueKind =
  | "hit" // big impact
  | "boom" // sub drop / huge impact
  | "whoosh"
  | "swish" // short whoosh
  | "riser" // build (duration)
  | "click"
  | "pop"
  | "tick" // UI tick
  | "type" // typing range (duration)
  | "zap" // electric beam
  | "chime" // success
  | "buzz" // phone buzz
  | "glitch"
  | "stamp"
  | "key" // key press
  | "reverse"; // reverse cymbal into a hit (ends at t)

export interface Cue {
  t: number;
  kind: CueKind;
  dur?: number;
  gain?: number;
  pitch?: number;
  pan?: number;
}

export interface Scene {
  name: string;
  start: number;
  end: number;
  bg?: HTMLElement;
  fg: HTMLElement;
  cues: Cue[];
  /** Reading holds: scene-local [from, to, speed] ranges played slower than authored. */
  warp?: [number, number, number][];
  update(t: number, ctx: Ctx): void;
}

/** Map between authored scene time and output time for a set of slow-motion holds. */
export function timeWarp(warp: [number, number, number][] = []) {
  const w = [...warp].sort((a, b) => a[0] - b[0]);
  const toOut = (t: number) => {
    let u = t;
    for (const [a, b, sp] of w) if (t > a) u += (Math.min(t, b) - a) * (1 / sp - 1);
    return u;
  };
  const toLocal = (u: number) => {
    let cur = 0;
    let o = 0;
    for (const [a, b, sp] of w) {
      if (u <= o + (a - cur)) return cur + (u - o);
      o += a - cur;
      cur = a;
      const len = (b - a) / sp;
      if (u <= o + len) return a + (u - o) * sp;
      o += len;
      cur = b;
    }
    return cur + (u - o);
  };
  return { toOut, toLocal };
}
