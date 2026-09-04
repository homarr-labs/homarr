import { describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.SECRET_ENCRYPTION_KEY = "ff3f4f7ce30e870c9630de9e5d244ffa81101a24ed0dfe5f064beb53a7e684f1";
  process.env.ENABLE_DNS_CACHING = "false";
});

const controllerCtor = vi.fn();
const controllerLogin = vi.fn().mockResolvedValue(true);

vi.mock("@homarr/redis", () => ({
  createGetSetChannel: () => ({
    getAsync: vi.fn().mockResolvedValue(null),
    setAsync: vi.fn().mockResolvedValue(undefined),
    removeAsync: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  ErrorWithMetadata: class extends Error {},
}));

vi.mock("@homarr/core/infrastructure/http", () => ({
  createCustomCheckServerIdentity: () => (() => undefined) as never,
  fetchWithTrustedCertificatesAsync: vi.fn(),
  createAxiosCertificateInstanceAsync: vi.fn().mockResolvedValue({}),
  createCertificateAgentAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@homarr/core/infrastructure/certificates", () => ({
  getTrustedCertificateHostnamesAsync: vi.fn().mockResolvedValue([]),
  getAllTrustedCertificatesAsync: vi.fn().mockResolvedValue([]),
}));

vi.mock("axios", () => ({
  AxiosError: Error,
  default: {
    create: vi.fn().mockReturnValue({}),
  },
}));

vi.mock("http-cookie-agent/http", () => ({
  HttpCookieAgent: class {},
  HttpsCookieAgent: class {},
}));

vi.mock("@homarr/node-unifi", () => {
  class FakeController {
    public options: Record<string, unknown>;
    constructor(options: Record<string, unknown>) {
      this.options = options;
      controllerCtor(options);
    }
    public async login(): Promise<true> {
      return await controllerLogin(this.options.port);
    }
    public async getSitesStats(): Promise<unknown[]> {
      return [];
    }
  }
  return { default: { Controller: FakeController } };
});

import { UnifiControllerIntegration } from "../unifi-controller-integration";

const createIntegration = (url: string) =>
  new UnifiControllerIntegration({
    id: "test-unifi",
    name: "Test Unifi",
    url,
    externalUrl: null,
    decryptedSecrets: [
      { kind: "username", value: "admin" },
      { kind: "password", value: "secret" },
    ],
  });

describe("UnifiControllerIntegration port resolution", () => {
  test("a URL without a port uses the UniFi OS port 443", async () => {
    controllerCtor.mockClear();
    controllerLogin.mockClear().mockResolvedValue(true);
    await createIntegration("http://192.168.1.1").getNetworkSummaryAsync();

    expect(controllerCtor).toHaveBeenCalledTimes(1);
    expect(controllerCtor).toHaveBeenCalledWith(expect.objectContaining({ host: "192.168.1.1", port: 443 }));
  });

  test("a connection failure on port 443 falls back to the self-hosted controller port 8443", async () => {
    controllerCtor.mockClear();
    controllerLogin
      .mockClear()
      .mockRejectedValueOnce(Object.assign(new Error("connect ECONNREFUSED"), { isAxiosError: true }))
      .mockResolvedValueOnce(true);

    await createIntegration("http://controller.lan").getNetworkSummaryAsync();

    expect(controllerCtor).toHaveBeenNthCalledWith(1, expect.objectContaining({ port: 443 }));
    expect(controllerCtor).toHaveBeenNthCalledWith(2, expect.objectContaining({ port: 8443 }));
  });

  test("https://controller.lan:8443 keeps the user-specified port", async () => {
    controllerCtor.mockClear();
    controllerLogin.mockClear().mockResolvedValue(true);
    await createIntegration("https://controller.lan:8443").getNetworkSummaryAsync();

    expect(controllerCtor).toHaveBeenCalledWith(expect.objectContaining({ host: "controller.lan", port: 8443 }));
  });

  test("https://192.168.1.1:8443 keeps the user-specified port", async () => {
    controllerCtor.mockClear();
    controllerLogin.mockClear().mockResolvedValue(true);
    await createIntegration("https://192.168.1.1:8443").getNetworkSummaryAsync();

    expect(controllerCtor).toHaveBeenCalledWith(expect.objectContaining({ host: "192.168.1.1", port: 8443 }));
  });

  test("an unusual port like 10443 is honored verbatim", async () => {
    controllerCtor.mockClear();
    controllerLogin.mockClear().mockResolvedValue(true);
    await createIntegration("https://192.168.1.1:10443").getNetworkSummaryAsync();

    expect(controllerCtor).toHaveBeenCalledWith(expect.objectContaining({ host: "192.168.1.1", port: 10443 }));
  });

  test("an authentication failure on port 443 does not try another port", async () => {
    controllerCtor.mockClear();
    controllerLogin.mockClear().mockRejectedValueOnce(
      Object.assign(new Error("Request failed with status code 401"), {
        isAxiosError: true,
        response: { status: 401 },
      }),
    );

    await expect(createIntegration("https://controller.lan").getNetworkSummaryAsync()).rejects.toThrow();

    expect(controllerCtor).toHaveBeenCalledTimes(1);
    expect(controllerCtor).toHaveBeenCalledWith(expect.objectContaining({ port: 443 }));
  });
});
