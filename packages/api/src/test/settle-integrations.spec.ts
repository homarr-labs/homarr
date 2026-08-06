import { describe, expect, test, vi } from "vitest";

import { settleIntegrationQueries } from "../settle-integrations";

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

describe("settleIntegrationQueries", () => {
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
    const error = new Error("Integration unavailable");

    await expect(settleIntegrationQueries(integrations, () => Promise.reject(error))).rejects.toBe(error);
  });

  test("uses configured fallbacks when every integration fails", async () => {
    await expect(
      settleIntegrationQueries(integrations, () => Promise.reject(new Error("Integration unavailable")), {
        fallback: (integration) => integration.name,
      }),
    ).resolves.toEqual(["First", "Second"]);
  });
});
