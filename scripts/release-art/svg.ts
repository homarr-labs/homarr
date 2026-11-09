import { f1 } from "./text";
import { H, W } from "./theme";

export const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const roundRect = (x: number, y: number, w: number, h: number, r: number, attrs = "") =>
  `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${r}"${attrs ? ` ${attrs}` : ""}/>`;

export const EASE_OUT = "animation-timing-function:cubic-bezier(.2,.8,.2,1)";
export const EASE_IN = "animation-timing-function:cubic-bezier(.5,0,.9,.4)";

export class Anim {
  private rules: string[] = [];
  private memo = new Map<string, string>();
  private count = 0;

  constructor(readonly dur: number) {}

  track(stops: Array<[number, string]>) {
    const key = JSON.stringify(stops);
    const hit = this.memo.get(key);
    if (hit) return hit;
    const name = `a${this.count++}`;
    const frames = stops.map(([t, css]) => `${f1((t / this.dur) * 1000) / 10}%{${css}}`).join("");
    this.rules.push(`@keyframes ${name}{${frames}}.${name}{animation:${name} ${this.dur}s linear infinite}`);
    this.memo.set(key, name);
    return name;
  }

  get css() {
    return this.rules.join("\n");
  }
}

interface DocOptions {
  title: string;
  desc: string;
  defs: string;
  css: string;
  body: string;
}

export const svgDoc = (o: DocOptions) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d"><title id="t">${esc(o.title)}</title><desc id="d">${esc(o.desc)}</desc><defs>${o.defs}</defs><style>${o.css}\n@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>${o.body}</svg>`;
