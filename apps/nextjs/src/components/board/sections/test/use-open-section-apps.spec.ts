import { describe, expect, test } from "vitest";

import { getSectionItemsForLayout } from "../use-open-section-apps";

describe("getSectionItemsForLayout", () => {
  test("includes items in recursively nested dynamic sections", () => {
    const board = {
      sections: [
        { id: "category", kind: "category" },
        {
          id: "first",
          kind: "dynamic",
          layouts: [{ layoutId: "desktop", parentSectionId: "category" }],
        },
        {
          id: "second",
          kind: "dynamic",
          layouts: [{ layoutId: "desktop", parentSectionId: "first" }],
        },
      ],
      items: [
        { id: "direct", layouts: [{ layoutId: "desktop", sectionId: "category" }] },
        { id: "nested", layouts: [{ layoutId: "desktop", sectionId: "second" }] },
      ],
    };

    expect(getSectionItemsForLayout(board, "category", "desktop").map((item) => item.id)).toEqual(["direct", "nested"]);
  });

  test("uses containment from only the requested responsive layout", () => {
    const board = {
      sections: [
        { id: "category", kind: "category" },
        { id: "other", kind: "category" },
        {
          id: "dynamic",
          kind: "dynamic",
          layouts: [
            { layoutId: "mobile", parentSectionId: "category" },
            { layoutId: "desktop", parentSectionId: "other" },
          ],
        },
      ],
      items: [
        {
          id: "app",
          layouts: [
            { layoutId: "mobile", sectionId: "dynamic" },
            { layoutId: "desktop", sectionId: "dynamic" },
          ],
        },
      ],
    };

    expect(getSectionItemsForLayout(board, "category", "mobile").map((item) => item.id)).toEqual(["app"]);
    expect(getSectionItemsForLayout(board, "category", "desktop")).toEqual([]);
  });

  test("does not loop when malformed section containment is cyclic", () => {
    const board = {
      sections: [
        {
          id: "root",
          kind: "dynamic",
          layouts: [{ layoutId: "desktop", parentSectionId: "child" }],
        },
        {
          id: "child",
          kind: "dynamic",
          layouts: [{ layoutId: "desktop", parentSectionId: "root" }],
        },
      ],
      items: [{ id: "app", layouts: [{ layoutId: "desktop", sectionId: "child" }] }],
    };

    expect(getSectionItemsForLayout(board, "root", "desktop").map((item) => item.id)).toEqual(["app"]);
  });
});
