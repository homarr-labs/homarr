import type { IconModel } from "./assets";
import type { RenderItem } from "./items";
import { clamp, COLOR, round1, roundRect } from "./svg";
import { fitText, textLines, textPath, wrapText } from "./text";

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

const tileScale = (w: number, h: number) => clamp(Math.min(w / 224, h / 201), 0.8, 1.9);

const isRich = (w: number, h: number) => w >= RICH_MIN_W && h >= RICH_MIN_H;

const image = (uri: string, cx: number, cy: number, size: number) =>
  `<image href="${uri}" x="${round1(cx - size / 2)}" y="${round1(cy - size / 2)}" width="${round1(size)}" height="${round1(size)}" preserveAspectRatio="xMidYMid meet"/>`;

const plate = (cx: number, cy: number, size: number, attrs: string) =>
  roundRect(cx - size / 2, cy - size / 2, size, size, round1(size * 0.24), attrs);

const iconMarkup = (icon: IconModel, cx: number, cy: number, size: number) => {
  if (icon.type === "monogram") {
    const letter = textPath(icon.letter, {
      x: cx,
      y: cy + size * 0.19,
      size: size * 0.52,
      font: "display",
      anchor: "middle",
      fill: COLOR.red,
    });
    return `${plate(cx, cy, size, `fill="${COLOR.panel2}" stroke="${COLOR.edge}"`)}${letter}`;
  }
  if (icon.type === "glyph") {
    const box = size * 0.8;
    const paths = GLYPH_PATHS.map((d) => `<path d="${d}"/>`).join("");
    return `<g transform="translate(${round1(cx - box / 2)} ${round1(cy - box / 2)}) scale(${(box / 24).toFixed(3)})" fill="none" stroke="${COLOR.red}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths}</g>`;
  }
  if (!icon.plate) return image(icon.uri, cx, cy, size);
  return `${plate(cx, cy, size, 'fill="#efe9e9"')}${image(icon.uri, cx, cy, size * 0.74)}`;
};

const pill = (right: number, top: number, s: number) => {
  const w = 54 * s;
  const h = 24 * s;
  const label = textPath("NEW", {
    x: right - w / 2,
    y: top + h / 2 + 11.5 * s * 0.39,
    size: 11.5 * s,
    font: "monoBold",
    anchor: "middle",
    fill: COLOR.ink,
    ls: 0.08,
  });
  return `${roundRect(right - w, top, w, h, h / 2, `fill="${COLOR.red}"`)}${label}`;
};

const dot = (w: number) => `<circle cx="${round1(w - 14)}" cy="14" r="4" fill="${COLOR.red}"/>`;

const richTile = (c: TileContent, w: number, h: number) => {
  const s = tileScale(w, h);
  const pad = 22 * s;
  const iconSize = 62 * s;
  const name = fitText(c.item.name, w - pad * 2, "display", 28 * s, 16, -0.02);
  const nameY = pad + iconSize + 44 * s;
  const textY = nameY + 22 * s;
  const lh = 17 * s;
  const maxLines = clamp(Math.floor((h - pad - textY) / lh) + 1, 1, 4);
  const body = textLines(wrapText(c.text, w - pad * 2, "medium", 13.5 * s, maxLines), {
    x: pad,
    y: textY,
    lh,
    size: 13.5 * s,
    font: "medium",
    fill: COLOR.muted,
  });
  const title = textPath(name.text, { x: pad, y: nameY, size: name.size, font: "display", ls: -0.02 });
  return `${iconMarkup(c.icon, pad + iconSize / 2, pad + iconSize / 2, iconSize)}${pill(w - pad, pad, s)}${title}${body}`;
};

const compactTile = (c: TileContent, w: number, h: number) => {
  const iconSize = Math.round(clamp(Math.min(w * 0.48, h * 0.38), 28, 72));
  const label = fitText(c.item.name, w - 12, "bold", 13.5, 9.5);
  const top = (h - (iconSize + 12 + label.size)) / 2;
  const name = textPath(label.text, {
    x: w / 2,
    y: top + iconSize + 12 + label.size * 0.75,
    size: label.size,
    font: "bold",
    anchor: "middle",
  });
  return `${iconMarkup(c.icon, w / 2, top + iconSize / 2, iconSize)}${name}${dot(w)}`;
};

const cornerBadge = (rich: boolean, w: number, s: number) => {
  if (rich) return pill(w - 14, 14, Math.min(s * 0.9, 1.1));
  return dot(w);
};

const shotTile = (c: TileContent, w: number, h: number, id: string) => {
  const s = tileScale(w, h);
  const pad = 18 * s;
  const shade = Math.min(h * 0.4, 96 * s);
  const name = fitText(c.item.name, w - pad * 2 - 12, "display", 22 * s, 13, -0.01);
  const title = textPath(name.text, { x: pad, y: h - pad, size: name.size, font: "display", ls: -0.01 });
  const shot = `<image href="${c.shot}" x="0" y="0" width="${round1(w)}" height="${round1(h)}" preserveAspectRatio="none"/><rect x="0" y="${round1(h - shade)}" width="${round1(w)}" height="${round1(shade)}" fill="url(#shade)"/>`;
  return `<clipPath id="${id}">${roundRect(0, 0, w, h, 14)}</clipPath><g clip-path="url(#${id})">${shot}</g>${cornerBadge(isRich(w, h), w, s)}${title}`;
};

export const tileMarkup = (c: TileContent, w: number, h: number, id: string) => {
  if (c.shot) return shotTile(c, w, h, id);
  if (isRich(w, h)) return richTile(c, w, h);
  return compactTile(c, w, h);
};

export const moreMarkup = (count: number, w: number, h: number) => {
  const size = clamp(Math.min(w * 0.36, h * 0.34), 20, 44);
  const number = textPath(`+${count}`, {
    x: w / 2,
    y: h / 2 + size * 0.2,
    size,
    font: "display",
    anchor: "middle",
    fill: COLOR.red,
  });
  const label = textPath("MORE", {
    x: w / 2,
    y: h / 2 + size * 0.2 + 20,
    size: 11,
    font: "monoBold",
    anchor: "middle",
    fill: COLOR.muted,
    ls: 0.14,
  });
  return `${number}${label}`;
};
