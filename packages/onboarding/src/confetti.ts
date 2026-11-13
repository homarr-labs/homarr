import type { Options } from "canvas-confetti";

export const celebrateWithConfetti = (options: Options) => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  void import("canvas-confetti")
    .then(({ default: confetti }) => confetti({ ...options, disableForReducedMotion: true }))
    .catch(() => undefined);
};
