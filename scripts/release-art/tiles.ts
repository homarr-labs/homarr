import type { IconModel } from "./assets";
import { roundRect } from "./svg";
import { clamp, f1, fit, lines, txt, wrap } from "./text";
import { C } from "./theme";
import type { RenderItem } from "./types";

export interface TileContent {
  item: RenderItem;
  text: string;
  icon: IconModel;
  shot: string | null;
}

const GLYPH_PATHS = [
  "M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1",
  "M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1",
  "M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1",
  "M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1",
];

const RICH_MIN_W = 160;
const RICH_MIN_H = 150;

const image = (uri: string, cx: number, cy: number, size: number) =>
  `<image href="${uri}" x="${f1(cx - size / 2)}" y="${f1(cy - size / 2)}" width="${f1(size)}" height="${f1(size)}" preserveAspectRatio="xMidYMid meet"/>`;

const plate = (cx: number, cy: number, size: number, fill: string, attrs = "") =>
  roundRect(cx - size / 2, cy - size / 2, size, size, f1(size * 0.24), `fill="${fill}"${attrs ? ` ${attrs}` : ""}`);

export const iconMarkup = (icon: IconModel, cx: number, cy: number, size: number) => {
  if (icon.type === "monogram") {
    const letter = txt(icon.letter, {
      x: cx,
      y: cy + size * 0.19,
      size: size * 0.52,
      font: "display",
      anchor: "middle",
      fill: C.red,
    });
    return `${plate(cx, cy, size, C.panel2, `stroke="${C.edge}"`)}${letter}`;
  }
  if (icon.type === "glyph") {
    const box = size * 0.8;
    const paths = GLYPH_PATHS.map((d) => `<path d="${d}"/>`).join("");
    return `<g transform="translate(${f1(cx - box / 2)} ${f1(cy - box / 2)}) scale(${f1((box / 24) * 100) / 100})" fill="none" stroke="${C.red}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths}</g>`;
  }
  if (!icon.plate) return image(icon.uri, cx, cy, size);
  return `${plate(cx, cy, size, "#efe9e9")}${image(icon.uri, cx, cy, size * 0.74)}`;
};

const pill = (right: number, top: number, s: number) => {
  const w = 54 * s;
  const h = 24 * s;
  const label = txt("NEW", {
    x: right - w / 2,
    y: top + h / 2 + 11.5 * s * 0.39,
    size: 11.5 * s,
    font: "monoBold",
    anchor: "middle",
    fill: C.ink,
    ls: 0.08,
  });
  return `${roundRect(right - w, top, w, h, h / 2, `fill="${C.red}"`)}${label}`;
};

const dot = (w: number) => `<circle cx="${f1(w - 14)}" cy="14" r="4" fill="${C.red}"/>`;

export const isRich = (w: number, h: number) => w >= RICH_MIN_W && h >= RICH_MIN_H;

const richTile = (c: TileContent, w: number, h: number) => {
  const s = clamp(Math.min(w / 224, h / 201), 0.8, 1.9);
  const pad = 22 * s;
  const iconSize = 62 * s;
  const name = fit(c.item.name, w - pad * 2, "display", 28 * s, 16, -0.02);
  const nameY = pad + iconSize + 44 * s;
  const textY = nameY + 22 * s;
  const lh = 17 * s;
  const maxLines = clamp(Math.floor((h - pad - textY) / lh) + 1, 1, 4);
  const body = lines(wrap(c.text, w - pad * 2, "medium", 13.5 * s, maxLines), {
    x: pad,
    y: textY,
    lh,
    size: 13.5 * s,
    font: "medium",
    fill: C.muted,
  });
  return `${iconMarkup(c.icon, pad + iconSize / 2, pad + iconSize / 2, iconSize)}${pill(w - pad, pad, s)}${txt(name.text, { x: pad, y: nameY, size: name.size, font: "display", ls: -0.02 })}${body}`;
};

const compactTile = (c: TileContent, w: number, h: number) => {
  const iconSize = Math.round(clamp(Math.min(w * 0.48, h * 0.38), 28, 72));
  const label = fit(c.item.name, w - 12, "bold", 13.5, 9.5);
  const top = (h - (iconSize + 12 + label.size)) / 2;
  const name = txt(label.text, {
    x: w / 2,
    y: top + iconSize + 12 + label.size * 0.75,
    size: label.size,
    font: "bold",
    anchor: "middle",
  });
  return `${iconMarkup(c.icon, w / 2, top + iconSize / 2, iconSize)}${name}${dot(w)}`;
};

const shotTile = (c: TileContent, w: number, h: number, id: string) => {
  const rich = isRich(w, h);
  const s = clamp(Math.min(w / 224, h / 201), 0.8, 1.9);
  const pad = 18 * s;
  const shade = Math.min(h * 0.4, 96 * s);
  const name = fit(c.item.name, w - pad * 2 - 12, "display", 22 * s, 13, -0.01);
  const badge = rich ? pill(w - 14, 14, Math.min(s * 0.9, 1.1)) : dot(w);
  return `<clipPath id="${id}">${roundRect(0, 0, w, h, 14)}</clipPath><g clip-path="url(#${id})"><image href="${c.shot}" x="0" y="0" width="${f1(w)}" height="${f1(h)}" preserveAspectRatio="none"/><rect x="0" y="${f1(h - shade)}" width="${f1(w)}" height="${f1(shade)}" fill="url(#shade)"/></g>${badge}${txt(name.text, { x: pad, y: h - pad, size: name.size, font: "display", ls: -0.01 })}`;
};

export const tileMarkup = (c: TileContent, w: number, h: number, id: string) => {
  if (c.shot) return shotTile(c, w, h, id);
  if (isRich(w, h)) return richTile(c, w, h);
  return compactTile(c, w, h);
};

export const moreMarkup = (count: number, w: number, h: number) => {
  const size = clamp(Math.min(w * 0.36, h * 0.34), 20, 44);
  const number = txt(`+${count}`, {
    x: w / 2,
    y: h / 2 + size * 0.2,
    size,
    font: "display",
    anchor: "middle",
    fill: C.red,
  });
  const label = txt("MORE", {
    x: w / 2,
    y: h / 2 + size * 0.2 + 20,
    size: 11,
    font: "monoBold",
    anchor: "middle",
    fill: C.muted,
    ls: 0.14,
  });
  return `${number}${label}`;
};
