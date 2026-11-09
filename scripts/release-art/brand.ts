import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./runtime";
import { f1, txt } from "./text";
import { C } from "./theme";

const LOGO_W = 483.71;
const LOGO_H = 327.04;
const EYE_PATHS = [3, 4];

const logoPaths = () => {
  const src = readFileSync(join(REPO_ROOT, "apps/docs/public/img/logo.svg"), "utf8");
  const paths = [...src.matchAll(/<path class="cls-1" d="([^"]+)"/g)].flatMap((match) => match[1] ?? []);
  if (paths.length <= Math.max(...EYE_PATHS)) throw new Error("apps/docs/public/img/logo.svg: unexpected structure");
  return paths;
};

export const mark = (cx: number, cy: number, width: number) => {
  const paths = logoPaths();
  const scale = width / LOGO_W;
  const body = paths.filter((_, i) => !EYE_PATHS.includes(i));
  const eyes = paths.filter((_, i) => EYE_PATHS.includes(i));
  const eyeAttrs = ' class="blink" style="transform-box:fill-box;transform-origin:center"';
  const x = f1(cx - width / 2);
  const y = f1(cy - (width * (LOGO_H / LOGO_W)) / 2);
  return `<g transform="translate(${x} ${y}) scale(${scale.toFixed(4)})" fill="${C.red}">${body.map((d) => `<path d="${d}"/>`).join("")}${eyes.map((d) => `<path d="${d}"${eyeAttrs}/>`).join("")}</g>`;
};

export const wordmark = (x: number, y: number, size: number) =>
  txt("Homarr", { x, y, size, font: "display", fill: C.text, ls: -0.03 });

export const BLINK_CSS =
  ".blink{animation:blink 4s steps(1) infinite}@keyframes blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}";
