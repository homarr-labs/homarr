import { describe, expect, test } from "vitest";

import { getDropSwapPlacements } from "../grid-drop-swap";
import type { SectionGridPlacement } from "../use-grid-layout-actions";

const first: SectionGridPlacement = { id: "first", type: "item", x: 0, y: 0, w: 1, h: 1 };
const second: SectionGridPlacement = { id: "second", type: "item", x: 1, y: 0, w: 1, h: 1 };
const third: SectionGridPlacement = { id: "third", type: "item", x: 2, y: 0, w: 2, h: 1 };
const initial = [first, second, third];

describe("grid drop swapping", () => {
  test("swaps equally-sized items when one takes the other's exact slot", () => {
    const current: SectionGridPlacement[] = [{ ...first, x: 1 }, { ...second, y: 1 }, third];

    expect(getDropSwapPlacements(initial, current, "first")).toEqual([{ ...first, x: 1 }, { ...second, x: 0 }, third]);
  });

  test("keeps push behavior for different sizes or partial placement", () => {
    const differentSize: SectionGridPlacement[] = [{ ...first, x: 2 }, second, { ...third, y: 1 }];
    const partialPlacement: SectionGridPlacement[] = [{ ...third, x: 1 }, first, { ...second, y: 1 }];

    expect(getDropSwapPlacements(initial, differentSize, "first")).toBeNull();
    expect(getDropSwapPlacements(initial, partialPlacement, "third")).toBeNull();
  });

  test("does nothing when the item did not move", () => {
    expect(getDropSwapPlacements(initial, initial, "first")).toBeNull();
  });
});
