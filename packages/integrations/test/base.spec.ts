import { describe, expect, test, vi } from "vitest";

import { ResponseError } from "@homarr/common/server";
import { createDb } from "@homarr/db/test";

import type { IntegrationTestingInput } from "../src/base/integration";
import { Integration, RenderablePath } from "../src/base/integration";
import type { TestingResult } from "../src/base/test-connection/test-connection-service";

vi.mock("@homarr/db", async (importActual) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importActual<typeof import("@homarr/db")>();
  return {
    ...actual,
    db: createDb(),
  };
});

vi.mock("@homarr/core/infrastructure/certificates", async (importActual) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importActual<typeof import("@homarr/core/infrastructure/certificates")>();
  return {
    ...actual,
    getTrustedCertificateHostnamesAsync: vi.fn().mockImplementation(() => {
      return Promise.resolve([]);
    }),
  };
});

describe("Base integration", () => {
  test("testConnectionAsync should handle errors", async () => {
    const responseError = new ResponseError({ status: 500, url: "https://example.com" });
    const integration = new FakeIntegration(undefined, responseError);

    const result = await integration.testConnectionAsync();

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.type === "statusCode").toBe(true);
    if (result.error.type !== "statusCode") return;
    expect(result.error.data.statusCode).toBe(500);
    expect(result.error.data.url).toContain("https://example.com");
    expect(result.error.data.reason).toBe("internalServerError");
  });

  describe("externalUrl", () => {
    test("returns a URL for an absolute externalUrl", () => {
      const integration = new FakeIntegration(undefined, undefined, "https://example.com");
      const result = integration.callExternalUrl("/items/42");
      expect(result).toBeInstanceOf(URL);
      expect(result.toString()).toBe("https://example.com/items/42");
    });

    test("merges queryParams onto an absolute externalUrl", () => {
      const integration = new FakeIntegration(undefined, undefined, "https://example.com");
      const result = integration.callExternalUrl("/items", { id: "42", since: new Date("2026-01-01T00:00:00Z") });
      expect(result.toString()).toBe("https://example.com/items?id=42&since=2026-01-01T00%3A00%3A00.000Z");
    });

    test("returns a RenderablePath for a path-only externalUrl", () => {
      const integration = new FakeIntegration(undefined, undefined, "/cockpit/");
      const result = integration.callExternalUrl("/web/index.html");
      expect(result).toBeInstanceOf(RenderablePath);
      expect(result.toString()).toBe("/cockpit/web/index.html");
      expect(result.pathname).toBe("/cockpit/web/index.html");
      expect(result.hostname).toBe("");
    });

    test("merges queryParams onto a path-only externalUrl", () => {
      const integration = new FakeIntegration(undefined, undefined, "/cockpit/");
      const result = integration.callExternalUrl("/web/index.html", { id: "42" });
      expect(result.toString()).toBe("/cockpit/web/index.html?id=42");
    });

    test("merges path-embedded query with extra queryParams on a path-only externalUrl", () => {
      const integration = new FakeIntegration(undefined, undefined, "/signalk-server/");
      const result = integration.callExternalUrl("/items/42?width=100", { quality: "90" });
      expect(result.pathname).toBe("/signalk-server/items/42");
      expect(result.toString()).toBe("/signalk-server/items/42?width=100&quality=90");
    });

    test("falls back to integration.url when externalUrl is null and the integration url is absolute", () => {
      const integration = new FakeIntegration(undefined, undefined, null);
      const result = integration.callExternalUrl("/items/42");
      expect(result.toString()).toBe("https://example.com/items/42");
    });
  });
});

class FakeIntegration extends Integration {
  constructor(
    private testingResult?: TestingResult,
    private error?: Error,
    externalUrl: string | null = null,
  ) {
    super({
      id: "test",
      name: "Test",
      url: "https://example.com",
      decryptedSecrets: [],
      externalUrl,
    });
  }

  public callExternalUrl(
    path: `/${string}`,
    queryParams?: Record<string, string | Date | number | boolean | null | undefined>,
  ) {
    return this.externalUrl(path, queryParams);
  }

  // eslint-disable-next-line no-restricted-syntax
  protected testingAsync(_: IntegrationTestingInput): Promise<TestingResult> {
    if (this.error) {
      return Promise.reject(this.error);
    }

    return Promise.resolve(this.testingResult ?? { success: true });
  }
}
