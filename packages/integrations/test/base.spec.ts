import { X509Certificate } from "node:crypto";
import tls from "node:tls";
import { afterEach, describe, expect, test, vi } from "vitest";

import { RequestError, ResponseError } from "@homarr/common/server";
import { createDb } from "@homarr/db/test";

import { IntegrationRequestError } from "../src/base/errors/http/integration-request-error";
import type { IntegrationTestingInput } from "../src/base/integration";
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

const createCertificateRequestError = () =>
  new RequestError<"certificate">(
    { type: "certificate", reason: "untrusted", code: "DEPTH_ZERO_SELF_SIGNED_CERT" },
    { cause: new Error("self-signed certificate") },
  );

const mockCertificateFetch = () =>
  vi.spyOn(tls, "connect").mockImplementation(((_options: tls.ConnectionOptions, callback?: () => void) => {
    queueMicrotask(() => callback?.());
    return {
      getPeerX509Certificate: () => new X509Certificate(tls.rootCertificates[0] ?? ""),
      destroy: vi.fn(),
      once: vi.fn(),
    } as unknown as tls.TLSSocket;
  }) as unknown as typeof tls.connect);

describe("Base integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("testConnectionAsync should read the certificate from the integration URL by default", async () => {
    const connectSpy = mockCertificateFetch();
    const error = new IntegrationRequestError(
      { id: "test", name: "Test", url: "https://example.com" },
      { cause: createCertificateRequestError() },
    );
    const integration = new FakeIntegration(undefined, error);

    const result = await integration.testConnectionAsync();

    expect(result.success).toBe(false);
    if (result.success || result.error.type !== "certificate") throw new Error("Expected a certificate error");
    expect(result.error.data.url).toBe("https://example.com/");
    expect(connectSpy).toHaveBeenCalledWith(
      expect.objectContaining({ host: "example.com", servername: "example.com", port: 443 }),
      expect.any(Function),
    );
  });

  test("testConnectionAsync should read the certificate from the URL of the failed request", async () => {
    const connectSpy = mockCertificateFetch();
    const error = new IntegrationRequestError(
      { id: "test", name: "Test", url: "https://example.com" },
      { cause: createCertificateRequestError(), url: "https://secondary.example.com:9200" },
    );
    const integration = new FakeIntegration(undefined, error);

    const result = await integration.testConnectionAsync();

    expect(result.success).toBe(false);
    if (result.success || result.error.type !== "certificate") throw new Error("Expected a certificate error");
    expect(result.error.data.url).toBe("https://secondary.example.com:9200/");
    expect(connectSpy).toHaveBeenCalledWith(
      expect.objectContaining({ host: "secondary.example.com", port: 9200 }),
      expect.any(Function),
    );
  });

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
});

class FakeIntegration extends Integration {
  constructor(
    private testingResult?: TestingResult,
    private error?: Error,
  ) {
    super({
      id: "test",
      name: "Test",
      url: "https://example.com",
      decryptedSecrets: [],
      externalUrl: null,
    });
  }

  // eslint-disable-next-line no-restricted-syntax
  protected testingAsync(_: IntegrationTestingInput): Promise<TestingResult> {
    if (this.error) {
      return Promise.reject(this.error);
    }

    return Promise.resolve(this.testingResult ?? { success: true });
  }
}
