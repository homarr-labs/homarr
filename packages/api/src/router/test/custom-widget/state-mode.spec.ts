import { describe, expect, test } from "vitest";

import { useProcessLocalCustomWidgetState } from "../../../custom-widget-state-mode";

describe("Custom Widget shared-state selection", () => {
  test.each([
    [{ NODE_ENV: "test", CI: undefined }, true],
    [{ NODE_ENV: "development", CI: "true" }, true],
    [{ NODE_ENV: "development", CI: "false" }, false],
    [{ NODE_ENV: "production", CI: "true" }, false],
    [{ NODE_ENV: "production", CI: "false" }, false],
    [{ NODE_ENV: "production", CI: undefined }, false],
  ])("uses process-local state only in tests: %o", (runtime, expected) => {
    expect(useProcessLocalCustomWidgetState(runtime)).toBe(expected);
  });
});
