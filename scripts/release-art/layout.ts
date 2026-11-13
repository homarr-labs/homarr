import type { RenderItem } from "./items";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TilePlan {
  rect: Rect;
  item?: RenderItem;
  land: number;
}

export interface Layout {
  mode: "hero" | "grid";
  board: Rect;
  tiles: TilePlan[];
  ghosts: Rect[];
  more: number;
  fall: number;
  drop: number;
}

interface Slot {
  c: number;
  r: number;
  w: number;
  h: number;
}

const HERO_MAX = 3;
const HERO_BOARD: Rect = { x: 436, y: 40, w: 724, h: 550 };
const HERO_PAD = 14;
const HERO_GAP = 12;
const HERO_COLS = 6;
const HERO_ROWS = 5;

const GRID_AREA: Rect = { x: 40, y: 140, w: 1120, h: 450 };
const GRID_PAD = 14;
const GRID_MAX = 40;
const ROW_BREAKS = [4, 12, 30];
const ROOMY_MAX = 12;
const ROOMY = { gap: 12, maxH: 220, step: 0.22, fall: 0.45, drop: 200 };
const DENSE = { gap: 10, maxH: Infinity, step: 0.14, fall: 0.4, drop: 140 };

const heroSlots = (count: number, hasShot: boolean): { slots: Slot[]; ghosts: Slot[] } => {
  const bottom: Slot[] = [
    { c: 0, r: 3, w: 2, h: 2 },
    { c: 2, r: 3, w: 2, h: 2 },
    { c: 4, r: 3, w: 2, h: 2 },
  ];
  if (count === 1) {
    const w = 4 + Number(hasShot);
    return { slots: [{ c: 0, r: 0, w, h: 3 }], ghosts: [{ c: w, r: 0, w: HERO_COLS - w, h: 3 }, ...bottom] };
  }
  if (count === 2) {
    return {
      slots: [
        { c: 0, r: 0, w: 3, h: 3 },
        { c: 3, r: 0, w: 3, h: 3 },
      ],
      ghosts: bottom,
    };
  }
  return {
    slots: [
      { c: 0, r: 0, w: 2, h: 2 },
      { c: 2, r: 1, w: 2, h: 2 },
      { c: 4, r: 0, w: 2, h: 2 },
    ],
    ghosts: [{ c: 2, r: 0, w: 2, h: 1 }, { c: 0, r: 2, w: 2, h: 1 }, { c: 4, r: 2, w: 2, h: 1 }, ...bottom],
  };
};

const heroLayout = (items: RenderItem[]): Layout => {
  const cw = (HERO_BOARD.w - HERO_PAD * 2 - HERO_GAP * (HERO_COLS - 1)) / HERO_COLS;
  const ch = (HERO_BOARD.h - HERO_PAD * 2 - HERO_GAP * (HERO_ROWS - 1)) / HERO_ROWS;
  const rect = (s: Slot): Rect => ({
    x: HERO_BOARD.x + HERO_PAD + s.c * (cw + HERO_GAP),
    y: HERO_BOARD.y + HERO_PAD + s.r * (ch + HERO_GAP),
    w: s.w * cw + (s.w - 1) * HERO_GAP,
    h: s.h * ch + (s.h - 1) * HERO_GAP,
  });
  const plan = heroSlots(items.length, Boolean(items[0]?.screenshotUrl));
  return {
    mode: "hero",
    board: HERO_BOARD,
    tiles: plan.slots.map((slot, i) => ({ rect: rect(slot), item: items[i], land: 1 + i * 0.7 })),
    ghosts: plan.ghosts.map(rect),
    more: 0,
    fall: 0.55,
    drop: 360,
  };
};

const gridLayout = (items: RenderItem[]): Layout => {
  let more = 0;
  if (items.length > GRID_MAX) more = items.length - GRID_MAX + 1;
  const shown = items.slice(0, items.length - more);
  const slots = shown.length + Number(more > 0);
  let preset = DENSE;
  if (slots <= ROOMY_MAX) preset = ROOMY;
  const cols = Math.ceil(slots / (1 + ROW_BREAKS.filter((limit) => slots > limit).length));
  const rows = Math.ceil(slots / cols);
  const cw = (GRID_AREA.w - GRID_PAD * 2 - preset.gap * (cols - 1)) / cols;
  const ch = Math.min(preset.maxH, (GRID_AREA.h - GRID_PAD * 2 - preset.gap * (rows - 1)) / rows);
  const boardH = GRID_PAD * 2 + rows * ch + preset.gap * (rows - 1);
  const board: Rect = { x: GRID_AREA.x, y: GRID_AREA.y + (GRID_AREA.h - boardH) / 2, w: GRID_AREA.w, h: boardH };
  const tiles = Array.from({ length: slots }, (_, i): TilePlan => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const inRow = Math.min(cols, slots - row * cols);
    const offset = ((cols - inRow) * (cw + preset.gap)) / 2;
    return {
      rect: {
        x: board.x + GRID_PAD + offset + col * (cw + preset.gap),
        y: board.y + GRID_PAD + row * (ch + preset.gap),
        w: cw,
        h: ch,
      },
      item: shown[i],
      land: 0.6 + (col + row * 0.8) * preset.step,
    };
  });
  return { mode: "grid", board, tiles, ghosts: [], more, fall: preset.fall, drop: preset.drop };
};

export const planLayout = (items: RenderItem[]): Layout => {
  if (items.length <= HERO_MAX) return heroLayout(items);
  return gridLayout(items);
};
