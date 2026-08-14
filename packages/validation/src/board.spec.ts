import { describe, expect, it } from "vitest";

import { containerSectionOptionsDefaults, sectionSchema } from "./shared";

describe("section behavior validation", () => {
  it("normalizes a container to the current behavior defaults", () => {
    const result = sectionSchema.parse({
      id: "container",
      kind: "container",
      layouts: [],
    });

    expect(result).toMatchObject({
      collapsed: false,
      options: containerSectionOptionsDefaults,
    });
  });

  it("preserves configured container behavior", () => {
    const result = sectionSchema.parse({
      id: "container",
      kind: "container",
      options: {
        title: "Operations",
        customCssClasses: ["dense"],
        borderColor: "#123456",
        showLabel: false,
        collapsible: true,
        showOpenAll: true,
      },
      layouts: [],
    });

    expect(result).toMatchObject({
      collapsed: false,
      options: {
        title: "Operations",
        customCssClasses: ["dense"],
        borderColor: "#123456",
        showLabel: false,
        collapsible: true,
        showOpenAll: true,
      },
    });
  });

  it("normalizes the legacy dynamic kind to a container", () => {
    expect(sectionSchema.parse({ id: "legacy", kind: "dynamic", layouts: [] })).toMatchObject({
      id: "legacy",
      kind: "container",
      layouts: [],
    });
  });

  it("rejects the legacy category kind", () => {
    expect(() => sectionSchema.parse({ id: "legacy", kind: "category", layouts: [] })).toThrow();
  });

  it.each([
    { xOffset: 0.5, yOffset: 0, width: 1, height: 1 },
    { xOffset: -1, yOffset: 0, width: 1, height: 1 },
    { xOffset: 0, yOffset: 0, width: 0, height: 1 },
    { xOffset: 0, yOffset: 0, width: 1, height: 0 },
  ])("rejects invalid container grid geometry: %o", (layout) => {
    expect(() =>
      sectionSchema.parse({
        id: "container",
        kind: "container",
        layouts: [{ layoutId: "layout", parentSectionId: "root", ...layout }],
      }),
    ).toThrow();
  });
});
