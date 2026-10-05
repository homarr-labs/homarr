import { describe, expect, test } from "vitest";

import { getEntityStateLabel } from "./state";

const labels = { on: "On", off: "Off", unavailable: "Unavailable", unknown: "Unknown" };

describe("getEntityStateLabel", () => {
  test("localizes known states and preserves custom states", () => {
    expect(getEntityStateLabel("on", labels)).toBe("On");
    expect(getEntityStateLabel("heating", labels)).toBe("heating");
  });

  test.each(["__proto__", "constructor", "toString"])("preserves prototype-like state %s", (state) => {
    expect(getEntityStateLabel(state, labels)).toBe(state);
  });
});
