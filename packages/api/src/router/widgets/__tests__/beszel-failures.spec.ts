import { describe, expect, it } from "vitest";

import { everyBeszelIntegrationFailed } from "../beszel-failures";

describe("everyBeszelIntegrationFailed", () => {
  it("keeps partial successes", () => {
    expect(everyBeszelIntegrationFailed([{ error: "offline" }, {}])).toBe(false);
  });

  it("detects when every integration failed", () => {
    expect(everyBeszelIntegrationFailed([{ error: "offline" }, { error: "timeout" }])).toBe(true);
  });

  it("allows an empty integration selection", () => {
    expect(everyBeszelIntegrationFailed([])).toBe(false);
  });
});
