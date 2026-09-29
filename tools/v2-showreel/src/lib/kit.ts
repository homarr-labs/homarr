// Reusable motion components. Each exposes update(t) driven by scene-local time.
import { E, clamp, seg, lerp, spring } from "./anim";
import { h, words, chars } from "./dom";

/** Word-by-word masked rise. */
export class Headline {
  el: HTMLElement;
  ws: HTMLElement[];
  constructor(
    text: string,
    opts: { size: number; cls?: string; accent?: string[]; color?: string; weight?: number; lh?: number } = {
      size: 96,
    },
  ) {
    const { el, words: ws } = words(text);
    this.el = h("div", { class: `display ${opts.cls ?? ""}` }, el);
    this.el.style.fontSize = `${opts.size}px`;
    if (opts.weight) this.el.style.fontWeight = String(opts.weight);
    if (opts.lh) this.el.style.lineHeight = String(opts.lh);
    if (opts.color) this.el.style.color = opts.color;
    this.ws = ws;
    const accent = new Set((opts.accent ?? []).map((w) => w.toLowerCase()));
    for (const w of ws)
      if (accent.has(w.textContent!.toLowerCase().replace(/[.,!?]/g, ""))) w.style.color = "var(--coral)";
  }
  update(t: number, tin: number, tout = Infinity, stagger = 0.055, dur = 0.75) {
    this.ws.forEach((w, i) => {
      const p = E.outExpo(seg(t, tin + i * stagger, tin + i * stagger + dur));
      const q = E.inCubic(seg(t, tout + i * stagger * 0.3, tout + i * stagger * 0.3 + 0.3));
      const y = (1 - p) * 115 - q * 115;
      const rot = (1 - p) * 7 - q * 4;
      w.style.transform = `translateY(${y.toFixed(2)}%) rotate(${rot.toFixed(2)}deg)`;
      // Rotated words can poke out of their mask while parked; hide them.
      w.style.visibility = p <= 0 || q >= 1 ? "hidden" : "visible";
    });
    return this;
  }
}

/** Per-character reveal with blur + scale, for punchier moments. */
export class CharPop {
  el: HTMLElement;
  cs: HTMLElement[];
  constructor(text: string, size: number, cls = "display") {
    const { el, chars: cs } = chars(text);
    this.el = h("div", { class: cls }, el);
    this.el.style.fontSize = `${size}px`;
    this.cs = cs;
  }
  update(t: number, tin: number, tout = Infinity, stagger = 0.03, from: "center" | "left" = "left") {
    const n = this.cs.length;
    this.cs.forEach((c, i) => {
      const order = from === "center" ? Math.abs(i - (n - 1) / 2) : i;
      const s0 = tin + order * stagger;
      const p = seg(t, s0, s0 + 0.6);
      const sp = spring(t - s0, 2.6, 0.5);
      const q = E.inExpo(seg(t, tout + order * stagger * 0.4, tout + order * stagger * 0.4 + 0.35));
      const y = (1 - sp) * 60 - q * 40;
      const sc = lerp(1.6, 1, E.outExpo(p)) * (1 - q * 0.3);
      c.style.transform = `translateY(${y.toFixed(2)}px) scale(${sc.toFixed(3)})`;
      c.style.opacity = String(clamp(p * 3) * (1 - q));
      const b = (1 - E.outCubic(p)) * 14 + q * 10;
      c.style.filter = b > 0.1 ? `blur(${b.toFixed(2)}px)` : "";
    });
    return this;
  }
}

/** Chapter marker: index + label with a drawn rule. */
export class Chapter {
  el: HTMLElement;
  num: HTMLElement;
  rule: HTMLElement;
  lab: HTMLElement;
  constructor(index: string, label: string) {
    this.num = h(
      "div",
      { class: "mono", style: "font-size:17px;font-weight:700;color:var(--coral);letter-spacing:.1em" },
      index,
    );
    this.rule = h("div", { style: "height:2px;width:64px;background:var(--coral);transform-origin:0 50%" });
    this.lab = h("div", { class: "label", style: "color:var(--text);opacity:.9" }, label);
    this.el = h("div", { class: "abs row", style: "gap:18px;left:96px;top:78px" }, this.num, this.rule, this.lab);
  }
  update(t: number, tin: number, tout = Infinity) {
    const p = E.outExpo(seg(t, tin, tin + 0.8));
    const q = E.inCubic(seg(t, tout, tout + 0.4));
    this.rule.style.transform = `scaleX(${(p * (1 - q)).toFixed(3)})`;
    this.num.style.opacity = String(p * (1 - q));
    this.num.style.transform = `translateX(${((1 - p) * -20).toFixed(1)}px)`;
    this.lab.style.clipPath = `inset(0 ${((1 - E.outQuart(seg(t, tin + 0.15, tin + 0.9))) * 100).toFixed(1)}% 0 0)`;
    this.lab.style.opacity = String(1 - q);
    return this;
  }
}

/** Plain text typewriter with caret. */
export class TypeLine {
  el: HTMLElement;
  txt: HTMLElement;
  caret: HTMLElement;
  constructor(
    public text: string,
    cls = "",
    caretColor = "var(--coral)",
  ) {
    this.txt = h("span");
    this.caret = h("span", { class: "caret" });
    this.caret.style.background = caretColor;
    this.el = h("span", { class: cls }, this.txt, this.caret);
  }
  update(t: number, t0: number, cps = 28, caretUntil = Infinity) {
    const n = Math.max(0, Math.min(this.text.length, Math.floor((t - t0) * cps)));
    this.txt.textContent = this.text.slice(0, n);
    const typing = t >= t0 && n < this.text.length;
    const blink = typing || Math.floor(t * 2.2) % 2 === 0;
    this.caret.style.opacity = t < t0 - 0.4 || t > caretUntil ? "0" : blink ? "1" : "0";
    return n >= this.text.length;
  }
  get duration() {
    return this.text.length;
  }
}

export type Tok = [string, string?];

/** Syntax-highlighted code typewriter: lines of [text, class] tokens. */
export class CodeType {
  el: HTMLElement;
  spans: { el: HTMLElement; text: string; start: number }[] = [];
  lines: HTMLElement[] = [];
  caret: HTMLElement;
  total = 0;
  lineStart: number[] = [];
  constructor(code: Tok[][], cls = "mono") {
    this.el = h("div", { class: cls });
    this.caret = h("span", { class: "caret" });
    let n = 0;
    code.forEach((line) => {
      const ln = h("div", { style: "white-space:pre;min-height:1.5em" });
      this.lineStart.push(n);
      line.forEach(([text, c]) => {
        const s = h("span", { class: c ? `tok-${c}` : "" });
        this.spans.push({ el: s, text, start: n });
        n += text.length;
        ln.append(s);
      });
      n += 1; // newline
      this.lines.push(ln);
      this.el.append(ln);
    });
    this.total = n;
  }
  /** Reveal n characters. Returns index of the current line. */
  set(n: number, showCaret = true) {
    let caretHost: HTMLElement | null = null;
    for (const s of this.spans) {
      const k = clamp(n - s.start, 0, s.text.length);
      s.el.textContent = s.text.slice(0, k);
      if (n >= s.start && n <= s.start + s.text.length) caretHost = s.el;
    }
    let line = 0;
    this.lineStart.forEach((st, i) => {
      if (n >= st) line = i;
    });
    if (showCaret && caretHost) caretHost.after(this.caret);
    else if (showCaret) this.lines[line]?.append(this.caret);
    this.caret.style.display = showCaret ? "" : "none";
    return line;
  }
}

/** Number that counts up with easing. */
export function countTo(
  el: HTMLElement,
  t: number,
  t0: number,
  t1: number,
  to: number,
  from = 0,
  fmt = (v: number) => String(Math.round(v)),
) {
  el.textContent = fmt(lerp(from, to, E.outExpo(seg(t, t0, t1))));
}

/** Draw an SVG path progressively. Requires pathLength="1". */
export function drawPath(p: SVGPathElement | SVGGeometryElement, a: number, b = 0) {
  p.style.strokeDasharray = "1 1";
  const len = clamp(a - b);
  p.style.strokeDasharray = `${len} ${2}`;
  p.style.strokeDashoffset = String(-b);
}

export const svgNS = "http://www.w3.org/2000/svg";
export function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) {
  const el = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/** Evaluate point on cubic bezier. */
export function bez(p0: number[], p1: number[], p2: number[], p3: number[], t: number) {
  const u = 1 - t;
  return [0, 1].map(
    (i) => u * u * u * p0[i]! + 3 * u * u * t * p1[i]! + 3 * u * t * t * p2[i]! + t * t * t * p3[i]!,
  ) as [number, number];
}

/** Typewriter that keeps its final layout: untyped text is present but transparent, so wrapping never jumps. */
export class TypeBlock {
  el: HTMLElement;
  shown: HTMLElement;
  rest: HTMLElement;
  caret: HTMLElement;
  constructor(
    public text: string,
    cls = "",
    caretColor = "var(--coral)",
  ) {
    this.shown = h("span");
    this.rest = h("span", { style: "color:transparent" });
    this.caret = h("span", { class: "caret" });
    this.caret.style.background = caretColor;
    this.caret.style.marginRight = "-3px";
    this.el = h("span", { class: cls }, this.shown, this.caret, this.rest);
  }
  update(t: number, t0: number, cps = 28, caretUntil = Infinity) {
    const n = Math.max(0, Math.min(this.text.length, Math.floor((t - t0) * cps)));
    this.shown.textContent = this.text.slice(0, n);
    this.rest.textContent = this.text.slice(n);
    const typing = t >= t0 && n < this.text.length;
    const blink = typing || Math.floor(t * 2.2) % 2 === 0;
    this.caret.style.opacity = t < t0 - 0.4 || t > caretUntil ? "0" : blink ? "1" : "0";
    return n >= this.text.length;
  }
  end(t0: number, cps = 28) {
    return t0 + this.text.length / cps;
  }
}
