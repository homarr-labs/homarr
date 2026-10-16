import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

import { localeCookieKey } from "@homarr/definitions";

const mocks = vi.hoisted(() => ({
  getRouting: vi.fn(),
  createI18nMiddleware: vi.fn(),
}));

vi.mock("@trpc/client", () => ({
  createTRPCClient: () => ({ frontend: { routing: { query: mocks.getRouting } } }),
  httpLink: vi.fn(),
}));

vi.mock("@homarr/api/shared", () => ({ getTrpcUrl: () => "http://backend:3002/api/trpc" }));

vi.mock("@homarr/translation/middleware", () => ({
  createI18nMiddleware: mocks.createI18nMiddleware,
}));

const loadProxy = async () => {
  vi.resetModules();
  return import("./proxy");
};

const createRequest = (pathname: string, locale?: string) => {
  const request = new NextRequest(`http://localhost${pathname}`);
  if (locale) request.cookies.set(localeCookieKey, locale);
  return request;
};

describe("locale and onboarding proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRouting.mockResolvedValue({ step: "finish", defaultLocale: "en" });
    mocks.createI18nMiddleware.mockImplementation((defaultLocale: string) => (request: NextRequest) => {
      request.headers.set("x-test-default-locale", defaultLocale);
      return NextResponse.next();
    });
  });

  it("redirects unfinished onboarding to /init", async () => {
    mocks.getRouting.mockResolvedValue({ step: "setup", defaultLocale: "en" });
    const { proxy } = await loadProxy();
    const response = await proxy(createRequest("/en/dashboard"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/init");
    expect(mocks.getRouting).toHaveBeenCalledOnce();
  });

  it("allows /init while onboarding is unfinished", async () => {
    mocks.getRouting.mockResolvedValue({ step: "start", defaultLocale: "en" });
    const { proxy } = await loadProxy();
    const response = await proxy(createRequest("/en/init"));
    expect(response.status).toBe(200);
    expect(mocks.getRouting).toHaveBeenCalledOnce();
  });

  it("allows administrator sign-in while onboarding is unfinished", async () => {
    mocks.getRouting.mockResolvedValue({ step: "setup", defaultLocale: "en" });
    const { proxy } = await loadProxy();
    const response = await proxy(createRequest("/en/auth/login"));
    expect(response.status).toBe(200);
  });

  it("does not treat nested routes ending in init or auth/login as onboarding access routes", async () => {
    mocks.getRouting.mockResolvedValue({ step: "setup", defaultLocale: "en" });
    const { proxy } = await loadProxy();
    const initResponse = await proxy(createRequest("/en/boards/init"));
    const loginResponse = await proxy(createRequest("/en/settings/auth/login"));
    expect(initResponse.headers.get("location")).toBe("http://localhost/init");
    expect(loginResponse.headers.get("location")).toBe("http://localhost/init");
  });

  it("uses the configured default locale for a missing or invalid locale cookie", async () => {
    mocks.getRouting.mockResolvedValue({ step: "finish", defaultLocale: "de" });
    const { proxy } = await loadProxy();
    await proxy(createRequest("/en/dashboard", "not-a-locale"));
    expect(mocks.getRouting).toHaveBeenCalledOnce();
    expect(mocks.createI18nMiddleware).toHaveBeenCalledWith("de");
  });

  it("keeps a valid locale cookie and avoids routing reads once onboarding has finished", async () => {
    const { proxy } = await loadProxy();
    await proxy(createRequest("/fr/dashboard", "fr"));
    const response = await proxy(createRequest("/fr/dashboard", "fr"));
    expect(response.status).toBe(200);
    expect(mocks.getRouting).toHaveBeenCalledOnce();
    expect(mocks.createI18nMiddleware).toHaveBeenCalledWith("en");
  });

  it("deduplicates concurrent cold-start backend reads", async () => {
    let finishRouting!: (routing: { step: string; defaultLocale: string }) => void;
    mocks.getRouting.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishRouting = resolve;
        }),
    );
    const { proxy } = await loadProxy();
    const responses = Array.from({ length: 50 }, () => proxy(createRequest("/en/dashboard", "not-a-locale")));
    await vi.waitFor(() => expect(mocks.getRouting).toHaveBeenCalledOnce());
    finishRouting({ step: "finish", defaultLocale: "de" });
    await expect(Promise.all(responses)).resolves.toHaveLength(50);
    expect(mocks.getRouting).toHaveBeenCalledOnce();
    expect(mocks.createI18nMiddleware).toHaveBeenCalledWith("de");
  });

  it("clears failed in-flight reads so the next request can recover", async () => {
    mocks.getRouting
      .mockRejectedValueOnce(new Error("temporary backend failure"))
      .mockResolvedValue({ step: "finish", defaultLocale: "en" });
    const { proxy } = await loadProxy();
    await expect(proxy(createRequest("/en/dashboard", "en"))).rejects.toThrow("temporary backend failure");
    await expect(proxy(createRequest("/en/dashboard", "en"))).resolves.toMatchObject({ status: 200 });
    expect(mocks.getRouting).toHaveBeenCalledTimes(2);
  });
});
