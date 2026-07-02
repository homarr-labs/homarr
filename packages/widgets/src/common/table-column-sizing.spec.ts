import { describe, expect, test } from "vitest";

import { getResponsiveTableColumnSizes } from "./table-column-sizing";

describe("getResponsiveTableColumnSizes", () => {
  const baseColumnSizes = {
    actions: 2,
    name: 16,
    progress: 6,
  };

  test("keeps base sizes for narrow tables", () => {
    expect(getResponsiveTableColumnSizes(baseColumnSizes, 320, { name: { maxSize: 32 } })).toEqual(baseColumnSizes);
  });

  test("grows configured columns with table width", () => {
    expect(getResponsiveTableColumnSizes(baseColumnSizes, 768, { name: { maxSize: 32 } })).toEqual({
      ...baseColumnSizes,
      name: 24,
    });
  });

  test("does not grow past max size", () => {
    expect(getResponsiveTableColumnSizes(baseColumnSizes, 2000, { name: { maxSize: 32 } })).toEqual({
      ...baseColumnSizes,
      name: 32,
    });
  });

  test("does not shrink below base size when max size is smaller than the base", () => {
    expect(getResponsiveTableColumnSizes(baseColumnSizes, 2000, { name: { maxSize: 12 } })).toEqual(baseColumnSizes);
  });
});
