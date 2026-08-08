import { describe, expect, it } from "vitest";

import {
  countDuplicateTrpcPaths,
  normalizeTrpcPath,
  summarize,
  validateBrowserMeasurement,
} from "./dev-benchmark-lib.mts";

describe("development benchmark measurements", () => {
  it("preserves tRPC input payloads when counting duplicates", () => {
    const first = "/api/trpc/board.get?batch=1&input=%7B%22json%22%3A1%7D";
    const second = "/api/trpc/board.get?batch=1&input=%7B%22json%22%3A2%7D";

    expect(normalizeTrpcPath(first)).toBe("/api/trpc/board.get?batch=1&input=%7B%22json%22%3A1%7D");
    expect(countDuplicateTrpcPaths([first, second, first, "/api/trpc/user.get"])).toBe(1);
  });

  it("reports median, p95, deviation, and high outliers", () => {
    expect(summarize([1, 2, 3, 4, 5, 6, 100])).toEqual({
      count: 7,
      min: 1,
      median: 4,
      p95: null,
      max: 100,
      standardDeviation: 34,
      outliers: [100],
    });
  });

  it("averages both middle values for an even sample count", () => {
    expect(summarize([100, 200]).median).toBe(150);
    expect(summarize(Array.from({ length: 20 }, (_, index) => index + 1)).p95).toBe(19);
  });

  it("requires a successful authenticated board hydration and interaction", () => {
    expect(
      validateBrowserMeasurement({
        responseStatus: 307,
        domContentLoadedMs: 120,
        boardHydratedMs: null,
        widgetsReadyMs: null,
        widgetCount: 0,
        coldImmediateInteractionMs: null,
        postIdleWarmInteractionMs: null,
      }),
    ).toEqual([
      "browser navigation returned HTTP 307",
      "board hydration marker is missing",
      "widget readiness marker is missing",
      "representative board contains no widgets",
      "cold immediate interaction timing is missing",
      "post-idle warm interaction timing is missing",
    ]);
  });
});
