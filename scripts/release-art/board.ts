import { BLINK_CSS, mark, wordmark } from "./brand";
import { buildCopy } from "./copy";
import type { Copy } from "./copy";
import type { Layout, Rect, TilePlan } from "./layout";
import { Anim, EASE_IN, EASE_OUT, roundRect, svgDoc } from "./svg";
import { f1, fit, lines, txt, wrap } from "./text";
import { C, H, W } from "./theme";
import { moreMarkup, tileMarkup } from "./tiles";
import type { TileContent } from "./tiles";
import type { RenderItem } from "./types";

const DURATION = 8;
const HOLD_UNTIL = 7.3;
const FADE_AT = 7.65;
const HERO_TEXT_W = 350;

export interface BoardInput {
  version: string;
  items: RenderItem[];
  layout: Layout;
  contents: Array<TileContent | null>;
}

const ghostMarkup = (g: Rect) => {
  const bars = [0.55, 0.8, 0.4].map(
    (f, k) =>
      `<rect x="${f1(g.x + 14)}" y="${f1(g.y + 16 + k * 14)}" width="${f1((g.w - 28) * f)}" height="6" rx="3" fill="${C.edge}" opacity=".7"/>`,
  );
  const block = `<rect x="${f1(g.x + 14)}" y="${f1(g.y + g.h - 40)}" width="${f1(g.w - 28)}" height="24" rx="8" fill="${C.edge}" opacity=".35"/>`;
  const big = g.h > 130 && g.w > 80;
  return `${roundRect(g.x, g.y, g.w, g.h, 14, `fill="${C.bg2}" stroke="${C.edge}" stroke-opacity=".7"`)}${bars.join("")}${big ? block : ""}`;
};

const tileTracks = (a: Anim, plan: TilePlan, layout: Layout) => {
  const { land } = plan;
  const { fall, drop } = layout;
  const hold = Math.max(land, 0.2);
  return {
    tile: a.track([
      [0, `opacity:0;transform:translateY(-${drop}px)`],
      [Math.max(land - fall, 0.01), `opacity:1;transform:translateY(-${drop}px);${EASE_IN}`],
      [land, "opacity:1;transform:translateY(5px)"],
      [land + 0.16, `transform:translateY(0);${EASE_OUT}`],
      [HOLD_UNTIL, "opacity:1;transform:translateY(0)"],
      [FADE_AT, "opacity:0;transform:translateY(8px)"],
      [DURATION, `opacity:0;transform:translateY(-${drop}px)`],
    ]),
    hint: a.track([
      [0, "opacity:0"],
      [0.15, "opacity:.8"],
      [hold, "opacity:.8"],
      [hold + 0.01, "opacity:0"],
      [DURATION, "opacity:0"],
    ]),
    ring: a.track([
      [0, "opacity:0;transform:scale(1)"],
      [land, "opacity:0;transform:scale(1)"],
      [land + 0.01, "opacity:.9;transform:scale(1)"],
      [land + 0.7, "opacity:0;transform:scale(1.14)"],
      [DURATION, "opacity:0;transform:scale(1)"],
    ]),
  };
};

const tileGroup = (a: Anim, layout: Layout, plan: TilePlan, content: TileContent | null, index: number) => {
  const { rect } = plan;
  const hero = layout.mode === "hero";
  const tracks = tileTracks(a, plan, layout);
  const inner = content ? tileMarkup(content, rect.w, rect.h, `shot${index}`) : moreMarkup(layout.more, rect.w, rect.h);
  const glow = hero
    ? `<rect x="-6" y="-6" width="${f1(rect.w + 12)}" height="${f1(rect.h + 12)}" rx="22" fill="${C.red}" opacity=".16"/>`
    : "";
  const hint = hero
    ? `<rect class="${tracks.hint}" x="${f1(rect.x)}" y="${f1(rect.y)}" width="${f1(rect.w)}" height="${f1(rect.h)}" rx="14" fill="none" stroke="${C.red}" stroke-width="1.6" stroke-dasharray="6 6" opacity="0"/>`
    : "";
  let strokeOpacity = 0.55;
  let strokeWidth = 1;
  if (hero) {
    strokeOpacity = 0.9;
    strokeWidth = 1.5;
  }
  const frame = roundRect(
    0,
    0,
    rect.w,
    rect.h,
    14,
    `fill="${C.panel}" stroke="${C.red}" stroke-opacity="${strokeOpacity}" stroke-width="${strokeWidth}"`,
  );
  const ring = `<rect class="${tracks.ring}" x="${f1(rect.x)}" y="${f1(rect.y)}" width="${f1(rect.w)}" height="${f1(rect.h)}" rx="14" fill="none" stroke="${C.red}" stroke-width="2.5" opacity="0" style="transform-box:fill-box;transform-origin:center"/>`;
  return `${hint}<g class="${tracks.tile}"><g transform="translate(${f1(rect.x)} ${f1(rect.y)})">${glow}${frame}${inner}</g></g>${ring}`;
};

const heroSub = (items: RenderItem[], copy: Copy) => {
  const only = items[0];
  if (items.length === 1 && only?.kind === "widget") {
    const blurb = only.description || only.oneLiner || "";
    return lines(wrap(blurb, 340, "medium", 19, 4), { x: 56, y: 452, lh: 27, size: 19, font: "medium", fill: C.muted });
  }
  const names = wrap(items.map((item) => item.name).join("  ·  "), HERO_TEXT_W, "monoBold", 15, 2, 0.02);
  const rows = lines(names, { x: 56, y: 452, lh: 22, size: 15, font: "monoBold", fill: C.muted, ls: 0.02 });
  if (copy.widgets > 0) return rows;
  let pronoun = "them";
  if (items.length === 1) pronoun = "it";
  const hint = txt(`Add ${pronoun} under Management › Integrations.`, {
    x: 56,
    y: 452 + (names.length - 1) * 22 + 32,
    size: 15,
    font: "medium",
    fill: C.dim,
  });
  return `${rows}${hint}`;
};

const heroHead = (items: RenderItem[], copy: Copy) => {
  const first = fit(copy.lines[0], HERO_TEXT_W, "display", 72, 28, -0.04);
  const second = fit(copy.lines[1], HERO_TEXT_W, "display", 72, 28, -0.04);
  return [
    mark(84, 82, 56),
    wordmark(124, 96, 36),
    txt(copy.eyebrow, { x: 56, y: 262, size: 14, font: "monoBold", fill: C.red, ls: 0.14 }),
    txt(first.text, { x: 54, y: 336, size: first.size, font: "display", ls: -0.04 }),
    txt(second.text, { x: 54, y: 400, size: second.size, font: "display", fill: C.red, ls: -0.04 }),
    heroSub(items, copy),
  ].join("");
};

const gridHead = (copy: Copy) => {
  const headline = fit(copy.single, 700, "display", 42, 24, -0.03);
  return [
    mark(84, 68, 56),
    wordmark(124, 82, 36),
    txt(headline.text, { x: 1160, y: 84, size: headline.size, font: "display", anchor: "end", ls: -0.03 }),
    txt(`HOMARR ${copy.version} · IN THE BOX`, {
      x: 1160,
      y: 112,
      size: 13,
      font: "monoBold",
      anchor: "end",
      fill: C.red,
      ls: 0.14,
    }),
  ].join("");
};

const defs = (board: Rect) =>
  `<clipPath id="bclip">${roundRect(board.x, board.y, board.w, board.h, 20)}</clipPath><pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#fff" opacity=".08"/></pattern><radialGradient id="glow" cx="12%" cy="8%" r="70%"><stop offset="0" stop-color="${C.red}" stop-opacity=".22"/><stop offset="1" stop-color="${C.red}" stop-opacity="0"/></radialGradient><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bg}" stop-opacity="0"/><stop offset="1" stop-color="${C.bg}" stop-opacity=".88"/></linearGradient>`;

export const buildSvg = (input: BoardInput) => {
  const { layout, items, version } = input;
  const copy = buildCopy(items, version);
  const a = new Anim(DURATION);
  const { board } = layout;
  const ghosts = layout.ghosts.map(ghostMarkup).join("");
  const tiles = layout.tiles.map((plan, i) => tileGroup(a, layout, plan, input.contents[i] ?? null, i)).join("");
  let head = gridHead(copy);
  if (layout.mode === "hero") head = heroHead(items, copy);
  const body = [
    `<rect width="${W}" height="${H}" rx="22" fill="${C.bg}"/><rect width="${W}" height="${H}" rx="22" fill="url(#glow)"/>`,
    `<g>${roundRect(board.x, board.y, board.w, board.h, 20, `fill="${C.bg2}" stroke="${C.edge}"`)}${roundRect(board.x, board.y, board.w, board.h, 20, 'fill="url(#dots)"')}</g>`,
    `<g clip-path="url(#bclip)">${ghosts}${tiles}</g>`,
    head,
  ].join("");
  return svgDoc({
    title: `Homarr ${copy.version}: ${copy.single}`,
    desc: `Release art for Homarr ${copy.version}. ${copy.single} land on a board: ${items.map((item) => item.name).join(", ")}.`,
    defs: defs(board),
    css: `${BLINK_CSS}\n${a.css}`,
    body,
  });
};
