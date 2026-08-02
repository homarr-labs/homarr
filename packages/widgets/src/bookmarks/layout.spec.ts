import { describe, expect, test } from "vitest";

import { getAdvancedBookmarkColumns, getBookmarkHostname, getCompactBookmarkLayout } from "./component";

describe("bookmark display helpers", () => {
  test("uses bounded advanced columns", () => {
    expect(getAdvancedBookmarkColumns(900, 8)).toBe(3);
    expect(getAdvancedBookmarkColumns(120, 8)).toBe(1);
    expect(getAdvancedBookmarkColumns(900, 0)).toBe(1);
  });

  test("uses container geometry to keep compact cards legible", () => {
    expect(getCompactBookmarkLayout(420, 220, 4, "gridHorizontal")).toMatchObject({
      columns: 2,
      hideHostname: false,
      hideTitle: false,
      minimumItemSize: 48,
    });

    expect(getCompactBookmarkLayout(180, 80, 4, "row")).toMatchObject({
      columns: 4,
      hideHostname: true,
      hideTitle: true,
      minimumItemSize: 96,
    });
  });

  test("does not crash on malformed bookmark URLs", () => {
    expect(getBookmarkHostname("https://homarr.dev/docs")).toBe("homarr.dev");
    expect(getBookmarkHostname("not a URL")).toBe("not a URL");
    expect(getBookmarkHostname(null)).toBeUndefined();
  });
});
