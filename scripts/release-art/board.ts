import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RenderItem } from "./items";
import type { Layout, Rect, TilePlan } from "./layout";
import { Anim, COLOR, EASE_IN, EASE_OUT, round1, roundRect, svgDoc } from "./svg";
import { fitText, textLines, textPath, wrapText } from "./text";
import { moreMarkup, tileMarkup } from "./tiles";
import type { TileContent } from "./tiles";

const DURATION = 8;
const HOLD_UNTIL = 7.3;
const FADE_AT = 7.65;
const HERO_TEXT_W = 350;

const LOGO_FILE = join(import.meta.dirname, "../../apps/docs/public/img/logo.svg");
const LOGO_W = 483.71;
const LOGO_H = 327.04;
const EYE_PATHS = [3, 4];
const BLINK_CSS =
  ".blink{animation:blink 4s steps(1) infinite}@keyframes blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}";

interface Copy {
  single: string;
  lines: [string, string];
  eyebrow: string;
  version: string;
  widgets: number;
}

const plural = (count: number, singular: string) => {
  if (count === 1) return singular;
  return `${singular}s`;
};

const buildCopy = (items: RenderItem[], rawVersion: string): Copy => {
  const version = rawVersion.replace(/^v/, "");
  const integrations = items.filter((item) => item.kind === "integration").length;
  const widgets = items.length - integrations;
  const ints = `${integrations} new ${plural(integrations, "integration")}`;
  const wids = `${widgets} new ${plural(widgets, "widget")}`;
  const first = items[0]?.name ?? "";
  let copy = {
    single: ints,
    lines: [`${integrations} new`, plural(integrations, "integration")] as [string, string],
    eyebrow: `NEW INTEGRATIONS · ${version}`,
  };
  if (integrations > 0 && widgets > 0) {
    copy = { single: `${ints} & ${wids}`, lines: [ints, `& ${wids}`], eyebrow: `WHAT'S NEW · ${version}` };
  } else if (widgets === 1) {
    copy = { single: `New widget: ${first}`, lines: ["New widget", first], eyebrow: `NEW WIDGET · ${version}` };
  } else if (widgets > 1) {
    copy = { single: wids, lines: [`${widgets} new`, "widgets"], eyebrow: `NEW WIDGETS · ${version}` };
  }
  return { ...copy, version, widgets };
};

const mark = (cx: number, cy: number, width: number) => {
  const src = readFileSync(LOGO_FILE, "utf8");
  const paths = [...src.matchAll(/<path class="cls-1" d="([^"]+)"/g)].flatMap((match) => match[1] ?? []);
  if (paths.length <= Math.max(...EYE_PATHS)) throw new Error("apps/docs/public/img/logo.svg: unexpected structure");
  const body = paths.filter((_, i) => !EYE_PATHS.includes(i));
  const eyes = paths.filter((_, i) => EYE_PATHS.includes(i));
  const eyeAttrs = ' class="blink" style="transform-box:fill-box;transform-origin:center"';
  const x = round1(cx - width / 2);
  const y = round1(cy - (width * (LOGO_H / LOGO_W)) / 2);
  const scale = (width / LOGO_W).toFixed(4);
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="${COLOR.red}">${body.map((d) => `<path d="${d}"/>`).join("")}${eyes.map((d) => `<path d="${d}"${eyeAttrs}/>`).join("")}</g>`;
};

const wordmark = (x: number, y: number, size: number) =>
  textPath("Homarr", { x, y, size, font: "display", fill: COLOR.text, ls: -0.03 });

const ghostMarkup = (g: Rect) => {
  const bars = [0.55, 0.8, 0.4].map(
    (share, k) =>
      `<rect x="${round1(g.x + 14)}" y="${round1(g.y + 16 + k * 14)}" width="${round1((g.w - 28) * share)}" height="6" rx="3" fill="${COLOR.edge}" opacity=".7"/>`,
  );
  const parts = [
    roundRect(g.x, g.y, g.w, g.h, 14, `fill="${COLOR.bg2}" stroke="${COLOR.edge}" stroke-opacity=".7"`),
    ...bars,
  ];
  if (g.h > 130 && g.w > 80) {
    parts.push(
      `<rect x="${round1(g.x + 14)}" y="${round1(g.y + g.h - 40)}" width="${round1(g.w - 28)}" height="24" rx="8" fill="${COLOR.edge}" opacity=".35"/>`,
    );
  }
  return parts.join("");
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
  const tracks = tileTracks(a, plan, layout);
  const inner =
    (content && tileMarkup(content, rect.w, rect.h, `shot${index}`)) || moreMarkup(layout.more, rect.w, rect.h);
  let glow = "";
  let hint = "";
  let stroke = 'stroke-opacity="0.55" stroke-width="1"';
  if (layout.mode === "hero") {
    glow = roundRect(-6, -6, rect.w + 12, rect.h + 12, 22, `fill="${COLOR.red}" opacity=".16"`);
    hint = roundRect(
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      14,
      `class="${tracks.hint}" fill="none" stroke="${COLOR.red}" stroke-width="1.6" stroke-dasharray="6 6" opacity="0"`,
    );
    stroke = 'stroke-opacity="0.9" stroke-width="1.5"';
  }
  const frame = roundRect(0, 0, rect.w, rect.h, 14, `fill="${COLOR.panel}" stroke="${COLOR.red}" ${stroke}`);
  const ring = roundRect(
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    14,
    `class="${tracks.ring}" fill="none" stroke="${COLOR.red}" stroke-width="2.5" opacity="0" style="transform-box:fill-box;transform-origin:center"`,
  );
  return `${hint}<g class="${tracks.tile}"><g transform="translate(${round1(rect.x)} ${round1(rect.y)})">${glow}${frame}${inner}</g></g>${ring}`;
};

const heroSub = (items: RenderItem[], copy: Copy) => {
  const only = items[0];
  if (items.length === 1 && only?.kind === "widget") {
    const blurb = only.description || only.oneLiner || "";
    return textLines(wrapText(blurb, 340, "medium", 19, 4), {
      x: 56,
      y: 452,
      lh: 27,
      size: 19,
      font: "medium",
      fill: COLOR.muted,
    });
  }
  const names = wrapText(items.map((item) => item.name).join("  ·  "), HERO_TEXT_W, "monoBold", 15, 2, 0.02);
  const rows = textLines(names, { x: 56, y: 452, lh: 22, size: 15, font: "monoBold", fill: COLOR.muted, ls: 0.02 });
  if (copy.widgets > 0) return rows;
  let pronoun = "them";
  if (items.length === 1) pronoun = "it";
  const hint = textPath(`Add ${pronoun} under Management › Integrations.`, {
    x: 56,
    y: 452 + (names.length - 1) * 22 + 32,
    size: 15,
    font: "medium",
    fill: COLOR.dim,
  });
  return `${rows}${hint}`;
};

const heroHead = (items: RenderItem[], copy: Copy) => {
  const first = fitText(copy.lines[0], HERO_TEXT_W, "display", 72, 28, -0.04);
  const second = fitText(copy.lines[1], HERO_TEXT_W, "display", 72, 28, -0.04);
  return [
    mark(84, 82, 56),
    wordmark(124, 96, 36),
    textPath(copy.eyebrow, { x: 56, y: 262, size: 14, font: "monoBold", fill: COLOR.red, ls: 0.14 }),
    textPath(first.text, { x: 54, y: 336, size: first.size, font: "display", ls: -0.04 }),
    textPath(second.text, { x: 54, y: 400, size: second.size, font: "display", fill: COLOR.red, ls: -0.04 }),
    heroSub(items, copy),
  ].join("");
};

const gridHead = (copy: Copy) => {
  const headline = fitText(copy.single, 700, "display", 42, 24, -0.03);
  return [
    mark(84, 68, 56),
    wordmark(124, 82, 36),
    textPath(headline.text, { x: 1160, y: 84, size: headline.size, font: "display", anchor: "end", ls: -0.03 }),
    textPath(`HOMARR ${copy.version} · IN THE BOX`, {
      x: 1160,
      y: 112,
      size: 13,
      font: "monoBold",
      anchor: "end",
      fill: COLOR.red,
      ls: 0.14,
    }),
  ].join("");
};

const defs = (board: Rect) =>
  `<clipPath id="bclip">${roundRect(board.x, board.y, board.w, board.h, 20)}</clipPath><pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#fff" opacity=".08"/></pattern><radialGradient id="glow" cx="12%" cy="8%" r="70%"><stop offset="0" stop-color="${COLOR.red}" stop-opacity=".22"/><stop offset="1" stop-color="${COLOR.red}" stop-opacity="0"/></radialGradient><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COLOR.bg}" stop-opacity="0"/><stop offset="1" stop-color="${COLOR.bg}" stop-opacity=".88"/></linearGradient>`;

interface BoardInput {
  version: string;
  items: RenderItem[];
  layout: Layout;
  contents: Array<TileContent | null>;
}

export const buildSvg = ({ version, items, layout, contents }: BoardInput) => {
  const copy = buildCopy(items, version);
  const a = new Anim(DURATION);
  const { board } = layout;
  const ghosts = layout.ghosts.map(ghostMarkup).join("");
  const tiles = layout.tiles.map((plan, i) => tileGroup(a, layout, plan, contents[i] ?? null, i)).join("");
  let head = gridHead(copy);
  if (layout.mode === "hero") head = heroHead(items, copy);
  const body = [
    `<rect width="1200" height="630" rx="22" fill="${COLOR.bg}"/><rect width="1200" height="630" rx="22" fill="url(#glow)"/>`,
    `<g>${roundRect(board.x, board.y, board.w, board.h, 20, `fill="${COLOR.bg2}" stroke="${COLOR.edge}"`)}${roundRect(board.x, board.y, board.w, board.h, 20, 'fill="url(#dots)"')}</g>`,
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
