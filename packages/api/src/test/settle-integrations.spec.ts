import { beforeEach, describe, expect, test, vi } from "vitest";

import { PUBLIC_INTEGRATION_ERROR, settleIntegrationQueries, toPublicIntegrationError } from "../settle-integrations";

const mocks = vi.hoisted(() => ({
  logger: { warn: vi.fn() },
}));

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => mocks.logger,
}));

vi.mock("@homarr/core/infrastructure/logs/error", () => ({
  ErrorWithMetadata: Error,
}));

const integrations = [
  { id: "first", name: "First", kind: "plex" },
  { id: "second", name: "Second", kind: "jellyfin" },
];

beforeEach(() => vi.clearAllMocks());

describe("settleIntegrationQueries", () => {
  test("maps sensitive integration failures to a stable public code", () => {
    const error = new Error(
      "GET http://admin:password@nas.internal.local/private/path?token=secret returned\nprivate response body",
    );

    const publicError = toPublicIntegrationError(error);

    expect(publicError).toBe(PUBLIC_INTEGRATION_ERROR);
    expect(publicError).not.toMatch(/admin|password|nas\.internal|private|token|secret|response body/i);
  });

  test("returns an empty result when no integrations are configured", async () => {
    await expect(settleIntegrationQueries([], vi.fn())).resolves.toEqual([]);
  });

  test("keeps successful integrations when another integration fails", async () => {
    const error = new Error("Plex unavailable");

    await expect(
      settleIntegrationQueries(integrations, (integration) =>
        integration.id === "first" ? Promise.reject(error) : Promise.resolve(integration.name),
      ),
    ).resolves.toEqual(["Second"]);
  });

  test("rejects when every integration fails", async () => {
    const error = new Error("Integration unavailable with token=secret");

    await expect(settleIntegrationQueries(integrations, () => Promise.reject(error))).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "All integration queries failed",
      cause: error,
    });
    expect(mocks.logger.warn).toHaveBeenCalledTimes(integrations.length);
  });

  test("uses configured fallbacks when every integration fails", async () => {
    await expect(
      settleIntegrationQueries(integrations, () => Promise.reject(new Error("Integration unavailable")), {
        fallback: (integration) => integration.name,
      }),
    ).resolves.toEqual(["First", "Second"]);
  });

  test("can retain partial fallbacks while rejecting total failure", async () => {
    const error = new Error("Integration unavailable");
    const options = {
      fallback: (integration: (typeof integrations)[number]) => integration.name,
      throwOnAllFailures: true,
    };

    await expect(
      settleIntegrationQueries(
        integrations,
        (integration) => (integration.id === "first" ? Promise.reject(error) : Promise.resolve(integration.name)),
        options,
      ),
    ).resolves.toEqual(["First", "Second"]);
    await expect(settleIntegrationQueries(integrations, () => Promise.reject(error), options)).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "All integration queries failed",
      cause: error,
    });
  });
});
