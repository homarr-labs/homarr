import { afterEach, describe, expect, test } from "vitest";

import { getDemoStatsValues } from "./stats";

const previousDemoMode = process.env.DEMO_MODE;

afterEach(() => {
  if (previousDemoMode === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = previousDemoMode;
});

describe("demo integration statistics", () => {
  test("returns showcase values only for seeded demo sources", () => {
    process.env.DEMO_MODE = "true";

    expect(getDemoStatsValues({ kind: "sonarr", url: "https://demo.homarr.dev" })).toMatchObject({
      shows: 74,
      episodes: 3_986,
    });
    expect(getDemoStatsValues({ kind: "mealie", url: "https://demo.homarr.dev" })).toEqual({
      recipes: 318,
      users: 14,
      categories: 28,
      tags: 76,
    });
    expect(getDemoStatsValues({ kind: "sonarr", url: "https://sonarr.example.com" })).toBeUndefined();
    expect(getDemoStatsValues({ kind: "mock", url: "https://demo.homarr.dev" })).toBeUndefined();
  });

  test("does not replace live statistics outside demo mode", () => {
    process.env.DEMO_MODE = "false";

    expect(getDemoStatsValues({ kind: "sonarr", url: "https://demo.homarr.dev" })).toBeUndefined();
  });
});
