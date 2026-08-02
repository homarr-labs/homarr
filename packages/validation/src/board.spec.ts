import { describe, expect, it } from "vitest";

import { categorySectionOptionsDefaults, dynamicSectionOptionsDefaults, sectionSchema } from "./shared";

describe("section behavior validation", () => {
  it("normalizes a legacy category to the current behavior defaults", () => {
    const result = sectionSchema.parse({
      id: "category",
      name: "Media",
      kind: "category",
      yOffset: 0,
      xOffset: 0,
    });

    expect(result).toMatchObject({
      collapsed: true,
      options: categorySectionOptionsDefaults,
    });
  });

  it("normalizes a legacy dynamic section to the current behavior defaults", () => {
    const result = sectionSchema.parse({
      id: "dynamic",
      kind: "dynamic",
      options: {
        title: "Media",
        customCssClasses: [],
        borderColor: "",
      },
      layouts: [],
    });

    expect(result).toMatchObject({
      collapsed: false,
      options: {
        ...dynamicSectionOptionsDefaults,
        title: "Media",
      },
    });
  });

  it("accepts a configured category rail", () => {
    const result = sectionSchema.parse({
      id: "category",
      name: "Navigation",
      kind: "category",
      yOffset: 0,
      xOffset: 0,
      collapsed: false,
      options: {
        showLabel: false,
        collapsible: false,
        showOpenAll: false,
        railPlacement: "left",
        columnCount: 3,
      },
    });

    expect(result).toMatchObject({
      options: {
        showLabel: false,
        collapsible: false,
        showOpenAll: false,
        railPlacement: "left",
        columnCount: 3,
      },
    });
  });
});
