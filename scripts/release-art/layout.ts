import type { RenderItem } from "./types";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TilePlan {
  rect: Rect;
  item: number | null;
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

interface GridTier {
  max: number;
  cols: number;
  gap: number;
  maxH: number;
  step: number;
  fall: number;
  drop: number;
}

const MAX_TIER: GridTier = { max: 40, cols: 10, gap: 10, maxH: Infinity, step: 0.14, fall: 0.4, drop: 140 };

const GRID_TIERS: GridTier[] = [
  { max: 4, cols: 4, gap: 14, maxH: 220, step: 0.3, fall: 0.5, drop: 240 },
  { max: 6, cols: 3, gap: 14, maxH: 220, step: 0.3, fall: 0.5, drop: 240 },
  { max: 8, cols: 4, gap: 14, maxH: 220, step: 0.3, fall: 0.5, drop: 240 },
  { max: 10, cols: 5, gap: 12, maxH: 220, step: 0.22, fall: 0.45, drop: 200 },
  { max: 12, cols: 6, gap: 12, maxH: 220, step: 0.22, fall: 0.45, drop: 200 },
  { max: 18, cols: 6, gap: 12, maxH: Infinity, step: 0.16, fall: 0.4, drop: 160 },
  { max: 24, cols: 8, gap: 10, maxH: Infinity, step: 0.14, fall: 0.4, drop: 140 },
  { max: 30, cols: 10, gap: 10, maxH: Infinity, step: 0.14, fall: 0.4, drop: 140 },
  MAX_TIER,
];

const heroSlots = (count: number, hasShot: boolean): { slots: Slot[]; ghosts: Slot[] } => {
  const bottom: Slot[] = [
    { c: 0, r: 3, w: 2, h: 2 },
    { c: 2, r: 3, w: 2, h: 2 },
    { c: 4, r: 3, w: 2, h: 2 },
  ];
  if (count === 1) {
    const w = hasShot ? 5 : 4;
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
    tiles: plan.slots.map((slot, i) => ({ rect: rect(slot), item: i, land: 1 + i * 0.7 })),
    ghosts: plan.ghosts.map(rect),
    more: 0,
    fall: 0.55,
    drop: 360,
  };
};

const gridLayout = (count: number): Layout => {
  const tier = GRID_TIERS.find((t) => count <= t.max) ?? MAX_TIER;
  let more = 0;
  if (count > MAX_TIER.max) more = count - MAX_TIER.max + 1;
  const shown = count - more;
  const slots = shown + Number(more > 0);
  const rows = Math.ceil(slots / tier.cols);
  const cw = (GRID_AREA.w - GRID_PAD * 2 - tier.gap * (tier.cols - 1)) / tier.cols;
  const ch = Math.min(tier.maxH, (GRID_AREA.h - GRID_PAD * 2 - tier.gap * (rows - 1)) / rows);
  const boardH = GRID_PAD * 2 + rows * ch + tier.gap * (rows - 1);
  const board: Rect = { x: GRID_AREA.x, y: GRID_AREA.y + (GRID_AREA.h - boardH) / 2, w: GRID_AREA.w, h: boardH };
  const tiles = Array.from({ length: slots }, (_, i): TilePlan => {
    const row = Math.floor(i / tier.cols);
    const col = i % tier.cols;
    const inRow = Math.min(tier.cols, slots - row * tier.cols);
    const offset = ((tier.cols - inRow) * (cw + tier.gap)) / 2;
    return {
      rect: {
        x: board.x + GRID_PAD + offset + col * (cw + tier.gap),
        y: board.y + GRID_PAD + row * (ch + tier.gap),
        w: cw,
        h: ch,
      },
      item: i < shown ? i : null,
      land: 0.6 + (col + row * 0.8) * tier.step,
    };
  });
  return { mode: "grid", board, tiles, ghosts: [], more, fall: tier.fall, drop: tier.drop };
};

export const planLayout = (items: RenderItem[]): Layout => {
  if (items.length <= HERO_MAX) return heroLayout(items);
  return gridLayout(items.length);
};
