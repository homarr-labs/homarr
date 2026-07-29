import { describe, expect, it } from "vitest";

import {
  countDuplicateTrpcPaths,
  normalizeTrpcPath,
  summarize,
  validateBrowserMeasurement,
} from "./dev-benchmark-lib.mts";

describe("development benchmark measurements", () => {
  it("normalizes tRPC input payloads before counting duplicates", () => {
    const first = "/api/trpc/board.get?batch=1&input=%7B%22json%22%3A1%7D";
    const second = "/api/trpc/board.get?batch=1&input=%7B%22json%22%3A2%7D";

    expect(normalizeTrpcPath(first)).toBe("/api/trpc/board.get?batch=1");
    expect(countDuplicateTrpcPaths([first, second, "/api/trpc/user.get"])).toBe(1);
  });

  it("reports median, p95, deviation, and high outliers", () => {
    expect(summarize([1, 2, 3, 4, 5, 6, 100])).toEqual({
      count: 7,
      medianMs: 4,
      p95Ms: 100,
      standardDeviationMs: 34,
      outliersMs: [100],
    });
  });

  it("averages both middle values for an even sample count", () => {
    expect(summarize([100, 200]).medianMs).toBe(150);
  });

  it("requires a successful authenticated board hydration and interaction", () => {
    expect(
      validateBrowserMeasurement({
        responseStatus: 307,
        domContentLoadedMs: 120,
        boardHydratedMs: null,
        firstInteractionMs: null,
      }),
    ).toEqual([
      "browser navigation returned HTTP 307",
      "board hydration marker is missing",
      "first interaction timing is missing",
    ]);
  });
});
