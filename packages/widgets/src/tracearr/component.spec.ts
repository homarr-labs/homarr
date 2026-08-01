import { describe, expect, it } from "vitest";

import { getAdvancedColumnWidth } from "./component";

describe("Tracearr advanced layout", () => {
  it("subtracts grid padding and the inter-column gap", () => {
    expect(getAdvancedColumnWidth(800, true)).toBe(376);
    expect(getAdvancedColumnWidth(801, true)).toBe(376.5);
  });

  it("subtracts only grid padding in a single-column layout", () => {
    expect(getAdvancedColumnWidth(799, false)).toBe(767);
  });
});
