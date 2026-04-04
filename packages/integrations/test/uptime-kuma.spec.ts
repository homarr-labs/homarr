import { describe, expect, test, vi } from "vitest";

import { UptimeKumaIntegration } from "../src/uptime-kuma/uptime-kuma-integration";
import type { UptimeKumaCheck } from "../src/interfaces/uptime-kuma/uptime-kuma-types";
import { ResponseError } from "@homarr/common/server";

// stub http helper
vi.mock("@homarr/core/infrastructure/http", async (importActual) => {
  const actual = (await importActual<any>()) as any;
  return {
    ...actual,
    fetchWithTrustedCertificatesAsync: vi.fn(),
  };
});

const makeIntegration = () =>
  new UptimeKumaIntegration({
    id: "test",
    name: "test",
    url: "https://example.com",
    externalUrl: null,
    decryptedSecrets: [],
  });

const fakeResponse = (data: unknown) => ({
  ok: true,
  json: async () => data,
} as const);

const fakeErrorResponse = (status: number) => ({
  ok: false,
  status,
  url: "",
} as const);

describe("UptimeKumaIntegration", () => {
  test("listChecksAsync should parse plain array", async () => {
    const checks: UptimeKumaCheck[] = [{ id: 1, name: "a", url: "", status: "Up" }, { id: 2, name: "b", status: "Down" }];
    (await import("@homarr/core/infrastructure/http")).fetchWithTrustedCertificatesAsync.mockResolvedValueOnce(
      fakeResponse(checks),
    );

    const integration = makeIntegration();
    const result = await integration.listChecksAsync();
    expect(result).toEqual(checks);
  });

  test("listChecksAsync should parse object with checks field", async () => {
    const checks: UptimeKumaCheck[] = [{ id: 5, name: "foo", status: 1 }];
    (await import("@homarr/core/infrastructure/http")).fetchWithTrustedCertificatesAsync.mockResolvedValueOnce(
      fakeResponse({ checks }),
    );
    const integration = makeIntegration();
    const result = await integration.listChecksAsync();
    expect(result).toEqual(checks);
  });

  test("getCheckAsync should return individual entry and throw if not found", async () => {
    const checks: UptimeKumaCheck[] = [{ id: 10, name: "a", status: "Up" }];
    (await import("@homarr/core/infrastructure/http")).fetchWithTrustedCertificatesAsync.mockResolvedValue(
      fakeResponse(checks),
    );
    const integration = makeIntegration();
    const single = await integration.getCheckAsync(10);
    expect(single.id).toBe(10);
    await expect(integration.getCheckAsync(999)).rejects.toThrow();
  });

  test("listChecksAsync should throw if response not ok", async () => {
    (await import("@homarr/core/infrastructure/http")).fetchWithTrustedCertificatesAsync.mockResolvedValueOnce(
      fakeErrorResponse(404),
    );
    const integration = makeIntegration();
    await expect(integration.listChecksAsync()).rejects.toBeInstanceOf(ResponseError);
  });
});
