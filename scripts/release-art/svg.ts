export const W = 1200;
export const H = 630;

export const COLOR = {
  red: "#fa5252",
  bg: "#100c0c",
  bg2: "#171212",
  panel: "#221b1b",
  panel2: "#2b2323",
  edge: "#3b3030",
  text: "#f6f1f1",
  muted: "#a99c9c",
  dim: "#6d6161",
  ink: "#1c1415",
};

export const EASE_OUT = "animation-timing-function:cubic-bezier(.2,.8,.2,1)";
export const EASE_IN = "animation-timing-function:cubic-bezier(.5,0,.9,.4)";

export const round1 = (n: number) => Math.round(n * 10) / 10;

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const roundRect = (x: number, y: number, w: number, h: number, r: number, attrs = "") =>
  `<rect x="${round1(x)}" y="${round1(y)}" width="${round1(w)}" height="${round1(h)}" rx="${r}" ${attrs}/>`;

export class Anim {
  private rules: string[] = [];
  private memo = new Map<string, string>();
  private count = 0;

  constructor(readonly duration: number) {}

  track(stops: Array<[number, string]>) {
    const key = JSON.stringify(stops);
    const hit = this.memo.get(key);
    if (hit) return hit;
    const name = `a${this.count++}`;
    const frames = stops.map(([t, css]) => `${round1((t / this.duration) * 1000) / 10}%{${css}}`).join("");
    this.rules.push(`@keyframes ${name}{${frames}}.${name}{animation:${name} ${this.duration}s linear infinite}`);
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
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d"><title id="t">${escapeXml(o.title)}</title><desc id="d">${escapeXml(o.desc)}</desc><defs>${o.defs}</defs><style>${o.css}\n@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>${o.body}</svg>`;
