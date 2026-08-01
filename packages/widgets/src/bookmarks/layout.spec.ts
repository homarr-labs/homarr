import { describe, expect, test } from "vitest";

import { getAdvancedBookmarkColumns, getBookmarkHostname } from "./component";

describe("bookmark display helpers", () => {
  test("uses bounded advanced columns", () => {
    expect(getAdvancedBookmarkColumns(900, 8)).toBe(3);
    expect(getAdvancedBookmarkColumns(120, 8)).toBe(1);
    expect(getAdvancedBookmarkColumns(900, 0)).toBe(1);
  });

  test("does not crash on malformed bookmark URLs", () => {
    expect(getBookmarkHostname("https://homarr.dev/docs")).toBe("homarr.dev");
    expect(getBookmarkHostname("not a URL")).toBe("not a URL");
    expect(getBookmarkHostname(null)).toBeUndefined();
  });
});
