import { describe, expect, test, vi } from "vitest";

import type { Path, QueryParams } from "@homarr/common";
import { ResponseError } from "@homarr/common/server";
import { createDb } from "@homarr/db/test";

import type { IntegrationInput, IntegrationTestingInput } from "../src/base/integration";
import { Integration } from "../src/base/integration";
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

  describe("externalUrl should build correct url / path", () => {
    test("with absolute externalUrl", () => {
      const integration = new FakeIntegration(undefined, undefined, { externalUrl: new URL("https://example.com") });

      const result = integration.buildExternalUrl("/items/42", { q: "search" });

      expect(result).toBeInstanceOf(URL);
      expect(result.toString()).toBe("https://example.com/items/42?q=search");
    });
    test("with path-only externalUrl", () => {
      const integration = new FakeIntegration(undefined, undefined, { externalUrl: "/cockpit/" });
      const result = integration.buildExternalUrl("/web/index.html", { id: "42" });
      expect(result).toBe("/cockpit/web/index.html?id=42");
    });
    test("with path-only externalUrl with embedded query and extra queryParams", () => {
      const integration = new FakeIntegration(undefined, undefined, { externalUrl: "/signalk-server/" });
      const result = integration.buildExternalUrl("/items/42?width=100", { quality: "90" });
      expect(result).toBe("/signalk-server/items/42?width=100&quality=90");
    });
    test("with path-only externalUrl preserves hash-bang fragment", () => {
      const integration = new FakeIntegration(undefined, undefined, { externalUrl: "/jellyfin/" });
      const result = integration.buildExternalUrl("/web/index.html#!/details?id=42&serverId=abc");
      expect(result).toBe("/jellyfin/web/index.html#!/details?id=42&serverId=abc");
    });
    test("with null externalUrl should fallback to integration url", () => {
      const integration = new FakeIntegration(undefined, undefined, {
        externalUrl: null,
        url: new URL("https://example.com"),
      });
      const result = integration.buildExternalUrl("/items/42", { q: "search" });
      expect(result.toString()).toBe("https://example.com/items/42?q=search");
    });
  });
});

class FakeIntegration extends Integration {
  constructor(
    private testingResult?: TestingResult,
    private error?: Error,
    overrides: Partial<IntegrationInput> = {},
  ) {
    super({
      id: "test",
      name: "Test",
      url: new URL("https://example.com"),
      decryptedSecrets: [],
      externalUrl: null,
      ...overrides,
    });
  }

  public buildExternalUrl(path: Path, queryParams?: QueryParams) {
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
