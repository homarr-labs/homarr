import { describe, expect, test } from "vitest";

import { responsiveBoardLayoutsSchema } from "./board";
import { containerSectionOptionsDefaults, sectionSchema } from "./shared";

const mobile = {
  id: "mobile",
  name: "Mobile",
  columnCount: 3,
  breakpoint: 0,
  role: "mobile" as const,
};
const base = {
  id: "base",
  name: "Base",
  columnCount: 12,
  breakpoint: 768,
  role: "base" as const,
};

describe("responsiveBoardLayoutsSchema", () => {
  test("accepts protected layouts and custom layouts strictly between them", () => {
    expect(
      responsiveBoardLayoutsSchema.safeParse([
        mobile,
        { id: "tablet", name: "Tablet", columnCount: 6, breakpoint: 480, role: "custom" },
        base,
      ]).success,
    ).toBe(true);
  });

  test.each([
    { name: "missing Mobile", layouts: [{ ...mobile, role: "custom" }, base] },
    { name: "removable Base replacement", layouts: [mobile, { ...base, role: "custom" }] },
    { name: "non-zero Mobile breakpoint", layouts: [{ ...mobile, breakpoint: 320 }, base] },
    {
      name: "custom layout at Base breakpoint",
      layouts: [mobile, { id: "tablet", name: "Tablet", columnCount: 6, breakpoint: 768, role: "custom" }, base],
    },
    {
      name: "duplicate layout ID",
      layouts: [mobile, { ...base, id: mobile.id }],
    },
    {
      name: "mobile sidebar",
      layouts: [{ ...mobile, leftGutterColumnCount: 1 }, base],
    },
  ])("rejects $name", ({ layouts }) => {
    expect(responsiveBoardLayoutsSchema.safeParse(layouts).success).toBe(false);
  });
});

describe("section behavior validation", () => {
  test("normalizes a container to the current behavior defaults", () => {
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

  test("preserves configured container behavior", () => {
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
        scrollable: true,
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
        scrollable: true,
      },
    });
  });

  test("normalizes the legacy dynamic kind to a container", () => {
    expect(sectionSchema.parse({ id: "legacy", kind: "dynamic", layouts: [] })).toMatchObject({
      id: "legacy",
      kind: "container",
      layouts: [],
    });
  });

  test("rejects the legacy category kind", () => {
    expect(() => sectionSchema.parse({ id: "legacy", kind: "category", layouts: [] })).toThrow();
  });

  test.each([
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
