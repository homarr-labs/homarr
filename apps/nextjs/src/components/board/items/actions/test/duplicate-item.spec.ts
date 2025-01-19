import { describe, expect, test, vi } from "vitest";

import type { Board } from "~/app/[locale]/boards/_types";
import { duplicateItemCallback } from "../duplicate-item";
import * as emptyPosition from "../empty-position";
import { createEmptySection, createItem } from "./shared";

describe("item actions duplicate-item", () => {
  test("should copy it in the same section", () => {
    const spy = vi.spyOn(emptyPosition, "getFirstEmptyPosition");
    spy.mockReturnValue({ xOffset: 5, yOffset: 5 });
    const currentSection = createEmptySection("2", 1);
    const currentItem = createItem({
      id: "1",
      xOffset: 1,
      yOffset: 3,
      width: 3,
      height: 2,
      kind: "minecraftServerStatus",
      integrationIds: ["1"],
      options: { address: "localhost" },
      advancedOptions: { customCssClasses: ["test"] },
    });
    const otherItem = createItem({
      id: "2",
    });
    currentSection.items.push(currentItem, otherItem);
    const input = {
      columnCount: 10,
      sections: [createEmptySection("1", 0), currentSection, createEmptySection("3", 2)],
    } satisfies Pick<Board, "sections" | "columnCount">;

    const result = duplicateItemCallback({ itemId: currentItem.id })(input as unknown as Board);

    const section = result.sections.find((section) => section.id === "2");
    expect(section?.items.length).toBe(3);
    const duplicatedItem = section?.items.find((item) => item.id !== currentItem.id && item.id !== otherItem.id);

    expect(duplicatedItem).toEqual(
      expect.objectContaining({
        kind: "minecraftServerStatus",
        xOffset: 5,
        yOffset: 5,
        width: 3,
        height: 2,
        integrationIds: ["1"],
        options: { address: "localhost" },
        advancedOptions: { customCssClasses: ["test"] },
      }),
    );
  });
});
