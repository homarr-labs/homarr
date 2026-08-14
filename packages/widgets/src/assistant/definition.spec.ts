import { describe, expect, it } from "vitest";

import { supportsAdvancedFocus } from "../definition";
import { definition } from ".";

describe("assistant widget definition", () => {
  it("stays compact without an explicit advanced-focus opt-in", () => {
    expect(supportsAdvancedFocus(definition)).toBe(false);
  });

  it("does not persist private conversation data in board options", () => {
    const options = definition.createOptions();

    expect(options).toEqual({});
  });
});
