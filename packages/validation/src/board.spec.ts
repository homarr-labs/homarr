import { describe, expect, test } from "vitest";

import { responsiveBoardLayoutsSchema } from "./board";

const mobile = { id: "mobile", name: "Mobile", columnCount: 3, breakpoint: 0, role: "mobile" as const };
const base = { id: "base", name: "Base", columnCount: 12, breakpoint: 768, role: "base" as const };

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
  ])("rejects $name", ({ layouts }) => {
    expect(responsiveBoardLayoutsSchema.safeParse(layouts).success).toBe(false);
  });
});
