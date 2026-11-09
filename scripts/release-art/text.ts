import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "opentype.js";
import { SCRIPT_DIR } from "./runtime";
import { C } from "./theme";

const loadFont = (file: string) => {
  const bytes = new Uint8Array(readFileSync(join(SCRIPT_DIR, "fonts", file)));
  return parse(bytes.buffer);
};

const fonts = {
  display: loadFont("inter-tight-latin-800-normal.woff"),
  bold: loadFont("inter-tight-latin-700-normal.woff"),
  medium: loadFont("inter-tight-latin-500-normal.woff"),
  monoBold: loadFont("jetbrains-mono-latin-700-normal.woff"),
};

export type FontKey = keyof typeof fonts;

export const f1 = (n: number) => Math.round(n * 10) / 10;

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const clean = (value: string, font: FontKey) => {
  const face = fonts[font];
  const kept = [...value.normalize("NFC").replace(/\s+/g, " ")].filter(
    (ch) => ch === " " || face.charToGlyph(ch).index !== 0,
  );
  return kept.join("").trim();
};

export const textWidth = (value: string, font: FontKey, size: number, ls = 0) => {
  const text = clean(value, font);
  return fonts[font].getAdvanceWidth(text, size, { letterSpacing: ls }) - (text.length ? ls * size : 0);
};

interface TextOptions {
  x: number;
  y: number;
  size: number;
  font?: FontKey;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  ls?: number;
}

export const txt = (value: string, o: TextOptions) => {
  const font = o.font ?? "bold";
  const ls = o.ls ?? 0;
  const text = clean(value, font);
  const width = textWidth(text, font, o.size, ls);
  let x = o.x;
  if (o.anchor === "middle") x = o.x - width / 2;
  if (o.anchor === "end") x = o.x - width;
  const d = fonts[font].getPath(text, x, o.y, o.size, { letterSpacing: ls }).toPathData(1);
  return `<path d="${d}" fill="${o.fill ?? C.text}"/>`;
};

export const fitSize = (value: string, maxW: number, font: FontKey, size: number, min: number, ls = 0) => {
  let fitted = size;
  while (fitted > min && textWidth(value, font, fitted, ls) > maxW) fitted -= 0.5;
  return fitted;
};

export const ellipsize = (value: string, maxW: number, font: FontKey, size: number, ls = 0) => {
  const text = clean(value, font);
  if (textWidth(text, font, size, ls) <= maxW) return text;
  let cut = text;
  while (cut.length > 1 && textWidth(`${cut}…`, font, size, ls) > maxW) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
};

export const fit = (value: string, maxW: number, font: FontKey, size: number, min: number, ls = 0) => {
  const fitted = fitSize(value, maxW, font, size, min, ls);
  return { text: ellipsize(value, maxW, font, fitted, ls), size: fitted };
};

export const wrap = (value: string, maxW: number, font: FontKey, size: number, maxLines: number, ls = 0) => {
  const words = clean(value, font).split(" ").filter(Boolean);
  const rows: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (!current || textWidth(next, font, size, ls) <= maxW) {
      current = next;
      continue;
    }
    rows.push(current);
    current = word;
  }
  if (current) rows.push(current);
  if (rows.length > maxLines) {
    const kept = rows.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1] ?? ""} ${rows.slice(maxLines).join(" ")}`;
    return kept.map((row) => ellipsize(row, maxW, font, size, ls));
  }
  return rows.map((row) => ellipsize(row, maxW, font, size, ls));
};

export const lines = (rows: string[], o: TextOptions & { lh: number }) =>
  rows.map((row, i) => txt(row, { ...o, y: o.y + i * o.lh })).join("");
