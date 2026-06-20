import { describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";

import type { IntegrationTestingInput } from "../src/base/integration";
import { DashDotIntegration } from "../src/dashdot/dashdot-integration";

vi.mock("@homarr/db", async (importActual) => {
  const actual = await importActual<typeof import("@homarr/db")>();
  return {
    ...actual,
    db: createDb(),
  };
});

vi.mock("@homarr/core/infrastructure/certificates", async (importActual) => {
  const actual = await importActual<typeof import("@homarr/core/infrastructure/certificates")>();
  return {
    ...actual,
    getTrustedCertificateHostnamesAsync: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("@homarr/redis", () => ({}));

const createIntegration = (url: string) =>
  new DashDotIntegration({
    id: "test",
    name: "Dashdot",
    url,
    decryptedSecrets: [],
    externalUrl: null,
  });

describe("DashDot URL normalization", () => {
  test("url with /api suffix is stripped", async () => {
    const integration = createIntegration("http://dashdot:3001/api");
    // Access protected url() via testingAsync which calls this.url("/info")
    const url = (integration as unknown as { url: (path: string) => URL }).url("/info");
    expect(url.toString()).toBe("http://dashdot:3001/info");
  });

  test("url with /api/ trailing slash is stripped", async () => {
    const integration = createIntegration("http://dashdot:3001/api/");
    const url = (integration as unknown as { url: (path: string) => URL }).url("/info");
    expect(url.toString()).toBe("http://dashdot:3001/info");
  });

  test("url without /api suffix is unchanged", async () => {
    const integration = createIntegration("http://dashdot:3001");
    const url = (integration as unknown as { url: (path: string) => URL }).url("/info");
    expect(url.toString()).toBe("http://dashdot:3001/info");
  });

  test("url with /api only at end is stripped (not mid-path)", async () => {
    const integration = createIntegration("http://dashdot:3001/somepath/api");
    const url = (integration as unknown as { url: (path: string) => URL }).url("/info");
    expect(url.toString()).toBe("http://dashdot:3001/somepath/info");
  });

  test("url with path prefix other than /api is preserved", async () => {
    const integration = createIntegration("http://dashdot:3001/dashdot");
    const url = (integration as unknown as { url: (path: string) => URL }).url("/load/cpu");
    expect(url.toString()).toBe("http://dashdot:3001/dashdot/load/cpu");
  });
});
