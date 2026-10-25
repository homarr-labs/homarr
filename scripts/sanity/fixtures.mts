import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const fixtureId = "board-containers-v1";
export const fixtureTime = "2026-10-25T12:00:00.000Z";
export const scenarios = [
  {
    id: "container-footprints-desktop",
    title: "Saved container footprints",
    viewport: { width: 1280, height: 900 },
    edit: false,
  },
  {
    id: "container-footprints-tablet",
    title: "Dense tablet containers",
    viewport: { width: 876, height: 760 },
    edit: false,
  },
  {
    id: "container-footprints-mobile",
    title: "Narrow viewport containers",
    viewport: { width: 390, height: 844 },
    edit: false,
  },
  {
    id: "board-editing-desktop",
    title: "Resize, move, collapse and reload",
    viewport: { width: 1280, height: 900 },
    edit: true,
  },
] as const;
export type ScenarioId = (typeof scenarios)[number]["id"];
export interface Placement {
  id: string;
  parent: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
export const placements: Placement[] = [
  { id: "empty", parent: "root", x: 0, y: 0, w: 2, h: 1 },
  { id: "populated", parent: "root", x: 2, y: 0, w: 2, h: 1 },
  { id: "labeled", parent: "root", x: 4, y: 0, w: 2, h: 1 },
  { id: "scrollable", parent: "root", x: 6, y: 0, w: 2, h: 1 },
  { id: "large", parent: "root", x: 0, y: 2, w: 4, h: 2 },
  { id: "nested", parent: "root", x: 4, y: 2, w: 4, h: 2 },
  { id: "nested-child", parent: "nested", x: 0, y: 0, w: 2, h: 1 },
  { id: "editable", parent: "root", x: 0, y: 5, w: 2, h: 2 },
  { id: "collapsible", parent: "root", x: 4, y: 5, w: 2, h: 2 },
];
export const mobilePlacements: Placement[] = [
  { id: "empty", parent: "root", x: 0, y: 0, w: 2, h: 1 },
  { id: "populated", parent: "root", x: 0, y: 1, w: 2, h: 1 },
  { id: "labeled", parent: "root", x: 0, y: 2, w: 2, h: 1 },
  { id: "scrollable", parent: "root", x: 0, y: 3, w: 2, h: 1 },
  { id: "large", parent: "root", x: 0, y: 5, w: 3, h: 2 },
  { id: "nested", parent: "root", x: 0, y: 8, w: 3, h: 2 },
  { id: "nested-child", parent: "nested", x: 0, y: 0, w: 2, h: 1 },
  { id: "editable", parent: "root", x: 0, y: 11, w: 2, h: 2 },
  { id: "collapsible", parent: "root", x: 0, y: 14, w: 2, h: 2 },
];
export const fixtureHash = createHash("sha256")
  .update(readFileSync(new URL("./fixtures.mts", import.meta.url)))
  .update(readFileSync(new URL("./seed.mts", import.meta.url)))
  .digest("hex");
