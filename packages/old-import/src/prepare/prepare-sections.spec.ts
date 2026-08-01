import { parse } from "superjson";
import { describe, expect, test } from "vitest";

import { placePreparedSections, prepareSections } from "./prepare-sections";

describe("prepareSections", () => {
  test("maps legacy blocks into one root and durable containers", () => {
    const prepared = prepareSections("board", {
      categories: [{ id: "category", name: "Media", position: 1 }],
      wrappers: [{ id: "wrapper", position: 0 }],
    });
    const root = prepared.sections.find((section) => section.kind === "empty");
    const container = prepared.sections.find((section) => section.kind === "container");
    if (!root || !container) throw new Error("Expected a root and a container");

    expect(prepared.sections).toHaveLength(2);
    expect(root).toMatchObject({ boardId: "board", xOffset: 0, yOffset: 0 });
    expect(container).toMatchObject({ boardId: "board", xOffset: null, yOffset: null, name: null });
    expect(parse(container.options ?? "{}")).toMatchObject({
      title: "Media",
      showLabel: true,
      collapsible: true,
      showOpenAll: true,
    });
    expect(prepared.byLegacyId.get("category")?.id).toBe(container.id);
    expect(prepared.byLegacyId.get("wrapper")?.id).not.toBe(root.id);
  });

  test("places root content and containers in legacy order for every layout", () => {
    const prepared = prepareSections("board", {
      categories: [{ id: "category", name: "Media", position: 1 }],
      wrappers: [{ id: "wrapper", position: 0 }],
    });
    const wrapperPlacementId = prepared.byLegacyId.get("wrapper")?.id;
    const containerId = prepared.byLegacyId.get("category")?.id;
    if (!wrapperPlacementId || !containerId) throw new Error("Expected mapped section ids");

    const preparedItems = [
      {
        layouts: [
          {
            itemId: "root-item",
            layoutId: "layout",
            sectionId: wrapperPlacementId,
            xOffset: 1,
            yOffset: 0,
            width: 2,
            height: 2,
          },
        ],
      },
      {
        layouts: [
          {
            itemId: "container-item",
            layoutId: "layout",
            sectionId: containerId,
            xOffset: 0,
            yOffset: 1,
            width: 3,
            height: 2,
          },
        ],
      },
    ];

    const layouts = placePreparedSections(prepared, preparedItems, [{ id: "layout", columnCount: 12 }]);

    expect(preparedItems[0]?.layouts[0]).toMatchObject({
      sectionId: prepared.mainRootId,
      xOffset: 1,
      yOffset: 0,
    });
    expect(preparedItems[1]?.layouts[0]).toMatchObject({ sectionId: containerId, yOffset: 1 });
    expect(layouts).toEqual([
      {
        sectionId: containerId,
        layoutId: "layout",
        parentSectionId: prepared.mainRootId,
        xOffset: 0,
        yOffset: 2,
        width: 12,
        height: 3,
      },
    ]);
  });
});
