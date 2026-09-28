// Minimal DOM helpers for frame-driven animation.

type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { class?: string; style?: Partial<CSSStyleDeclaration> | string; html?: string; [k: string]: unknown } = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null) continue;
    if (key === "class") el.className = value as string;
    else if (key === "style") {
      if (typeof value === "string") el.style.cssText = value;
      else Object.assign(el.style, value);
    } else if (key === "html") el.innerHTML = value as string;
    else el.setAttribute(key, String(value));
  }
  for (const child of children) {
    if (child == null || child === false) continue;
    el.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return el;
}

export const div = (cls = "", ...children: Child[]) => h("div", { class: cls }, ...children);

export interface Tf {
  x?: number;
  y?: number;
  z?: number;
  s?: number;
  sx?: number;
  sy?: number;
  r?: number;
  rx?: number;
  ry?: number;
  skx?: number;
  o?: number;
  blur?: number;
  bright?: number;
  px?: boolean;
}

/** Apply a transform snapshot. Translation in px, rotations in degrees. */
export function tf(el: HTMLElement | SVGElement, t: Tf) {
  const s = t.s ?? 1;
  const sx = (t.sx ?? 1) * s;
  const sy = (t.sy ?? 1) * s;
  let str = `translate3d(${(t.x ?? 0).toFixed(2)}px,${(t.y ?? 0).toFixed(2)}px,${(t.z ?? 0).toFixed(2)}px)`;
  if (t.rx) str += ` rotateX(${t.rx.toFixed(3)}deg)`;
  if (t.ry) str += ` rotateY(${t.ry.toFixed(3)}deg)`;
  if (t.r) str += ` rotate(${t.r.toFixed(3)}deg)`;
  if (t.skx) str += ` skewX(${t.skx.toFixed(3)}deg)`;
  if (sx !== 1 || sy !== 1) str += ` scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
  el.style.transform = str;
  const o = t.o ?? 1;
  el.style.opacity = o.toFixed(3);
  el.style.visibility = o <= 0.001 ? "hidden" : "visible";
  const filters: string[] = [];
  if (t.blur && t.blur > 0.05) filters.push(`blur(${t.blur.toFixed(2)}px)`);
  if (t.bright != null && t.bright !== 1) filters.push(`brightness(${t.bright.toFixed(3)})`);
  el.style.filter = filters.join(" ");
}

export function show(el: HTMLElement, on: boolean) {
  el.style.display = on ? "" : "none";
}

/** Tabler icon placeholder, hydrated from node_modules before rendering starts. */
export function icon(name: string, size = 24, stroke = 2, cls = "") {
  const el = h("span", { class: `ti ${cls}`, "data-icon": name });
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.setProperty("--sw", String(stroke));
  return el;
}

/** Service logo from dashboard-icons. */
export function logo(name: string, size = 40, cls = "") {
  const ext = ["linkwarden", "plantit", "tubearchivist", "unmanic", "xteve"].includes(name) ? "png" : "svg";
  return h("img", { class: `svc ${cls}`, src: `assets/icons/${name}.${ext}`, width: size, height: size, alt: "" });
}

export async function hydrateIcons(root: ParentNode) {
  const nodes = [...root.querySelectorAll<HTMLElement>("[data-icon]")];
  const names = [...new Set(nodes.map((n) => n.dataset.icon!))];
  const cache = new Map<string, string>();
  await Promise.all(
    names.map(async (name) => {
      const [dir, file] = name.startsWith("filled:") ? ["filled", name.slice(7)] : ["outline", name];
      const res = await fetch(`node_modules/@tabler/icons/icons/${dir}/${file}.svg`);
      if (!res.ok) throw new Error(`missing icon ${name}`);
      cache.set(name, await res.text());
    }),
  );
  for (const n of nodes) n.innerHTML = cache.get(n.dataset.icon!)!;
}

/** Split text into per-character spans (words kept together). */
export function chars(text: string, cls = "ch") {
  const wrap = h("span", { class: "chars" });
  const out: HTMLElement[] = [];
  text.split(/(\s+)/).forEach((word) => {
    if (/^\s+$/.test(word)) {
      wrap.append(document.createTextNode(word));
      return;
    }
    const w = h("span", { class: "word" });
    for (const c of word) {
      const s = h("span", { class: cls }, c);
      out.push(s);
      w.append(s);
    }
    wrap.append(w);
  });
  return { el: wrap, chars: out };
}

/** Split text into word spans inside overflow masks. */
export function words(text: string) {
  const wrap = h("span", { class: "words" });
  const out: HTMLElement[] = [];
  text.split(/\s+/).forEach((word, i) => {
    if (i) wrap.append(document.createTextNode(" "));
    const mask = h("span", { class: "wmask" });
    const w = h("span", { class: "w" }, word);
    mask.append(w);
    out.push(w);
    wrap.append(mask);
  });
  return { el: wrap, words: out };
}

/** Layout offset of `el` inside `root`, ignoring transforms (transformed ancestors count as offsetParents in Chrome). */
export function offsetWithin(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let e: HTMLElement | null = el;
  while (e && e !== root) {
    x += e.offsetLeft;
    y += e.offsetTop;
    e = e.offsetParent as HTMLElement | null;
  }
  return [x, y] as const;
}
