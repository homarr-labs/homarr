import { describe, expect, test } from "vitest";

import { getSectionItemsForLayout } from "../use-open-section-apps";

describe("getSectionItemsForLayout", () => {
  test("includes items in recursively nested containers", () => {
    const board = {
      sections: [
        { id: "root", kind: "empty" },
        {
          id: "first",
          kind: "container",
          layouts: [{ layoutId: "desktop", parentSectionId: "root" }],
        },
        {
          id: "second",
          kind: "container",
          layouts: [{ layoutId: "desktop", parentSectionId: "first" }],
        },
      ],
      items: [
        { id: "direct", layouts: [{ layoutId: "desktop", sectionId: "root" }] },
        { id: "nested", layouts: [{ layoutId: "desktop", sectionId: "second" }] },
      ],
    };

    expect(getSectionItemsForLayout(board, "root", "desktop").map((item) => item.id)).toEqual(["direct", "nested"]);
  });

  test("uses containment from only the requested responsive layout", () => {
    const board = {
      sections: [
        { id: "root", kind: "empty" },
        { id: "other", kind: "empty" },
        {
          id: "container",
          kind: "container",
          layouts: [
            { layoutId: "mobile", parentSectionId: "root" },
            { layoutId: "desktop", parentSectionId: "other" },
          ],
        },
      ],
      items: [
        {
          id: "app",
          layouts: [
            { layoutId: "mobile", sectionId: "container" },
            { layoutId: "desktop", sectionId: "container" },
          ],
        },
      ],
    };

    expect(getSectionItemsForLayout(board, "root", "mobile").map((item) => item.id)).toEqual(["app"]);
    expect(getSectionItemsForLayout(board, "root", "desktop")).toEqual([]);
  });

  test("does not loop when malformed section containment is cyclic", () => {
    const board = {
      sections: [
        {
          id: "root",
          kind: "container",
          layouts: [{ layoutId: "desktop", parentSectionId: "child" }],
        },
        {
          id: "child",
          kind: "container",
          layouts: [{ layoutId: "desktop", parentSectionId: "root" }],
        },
      ],
      items: [{ id: "app", layouts: [{ layoutId: "desktop", sectionId: "child" }] }],
    };

    expect(getSectionItemsForLayout(board, "root", "desktop").map((item) => item.id)).toEqual(["app"]);
  });
});
