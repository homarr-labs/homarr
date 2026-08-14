import { TRPCError } from "@trpc/server";
import { describe, expect, test } from "vitest";

import { throwIfDockerOperationsFailed } from "../../docker/docker-operation-results";

describe("Docker operation results", () => {
  test("accepts an all-success result", async () => {
    const results = await Promise.allSettled([Promise.resolve(), Promise.resolve()]);

    expect(() => throwIfDockerOperationsFailed(results)).not.toThrow();
  });

  test("throws a sanitized error after a partial failure", async () => {
    const results = await Promise.allSettled([
      Promise.resolve(),
      Promise.reject(new Error("sensitive Docker daemon response")),
    ]);

    expect(() => throwIfDockerOperationsFailed(results)).toThrow(
      new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "One or more Docker container operations failed",
      }),
    );
  });
});
