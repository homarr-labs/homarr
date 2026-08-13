import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

import { localeCookieKey } from "@homarr/definitions";

const mocks = vi.hoisted(() => ({
  getOnboardingStep: vi.fn(),
  getDefaultLocale: vi.fn(),
  createI18nMiddleware: vi.fn(),
}));

vi.mock("@homarr/db/proxy-reader", () => ({
  getDefaultLocaleForProxyAsync: mocks.getDefaultLocale,
  getOnboardingStepForProxyAsync: mocks.getOnboardingStep,
}));

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
    mocks.getOnboardingStep.mockResolvedValue("finish");
    mocks.getDefaultLocale.mockResolvedValue("en");
    mocks.createI18nMiddleware.mockImplementation((defaultLocale: string) => (request: NextRequest) => {
      request.headers.set("x-test-default-locale", defaultLocale);
      return NextResponse.next();
    });
  });

  it("redirects unfinished onboarding to /init", async () => {
    mocks.getOnboardingStep.mockResolvedValue("integrations");
    const { proxy } = await loadProxy();

    const response = await proxy(createRequest("/en/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/init");
    expect(mocks.getOnboardingStep).toHaveBeenCalledOnce();
  });

  it("allows /init while onboarding is unfinished", async () => {
    mocks.getOnboardingStep.mockResolvedValue("start");
    const { proxy } = await loadProxy();

    const response = await proxy(createRequest("/en/init"));

    expect(response.status).toBe(200);
    expect(mocks.getOnboardingStep).not.toHaveBeenCalled();
    expect(mocks.getDefaultLocale).toHaveBeenCalledOnce();
  });

  it("allows administrator sign-in while onboarding is unfinished", async () => {
    mocks.getOnboardingStep.mockResolvedValue("setup");
    const { proxy } = await loadProxy();

    const response = await proxy(createRequest("/en/auth/login"));

    expect(response.status).toBe(200);
    expect(mocks.getOnboardingStep).not.toHaveBeenCalled();
  });

  it("uses the configured default locale for a missing or invalid locale cookie", async () => {
    mocks.getDefaultLocale.mockResolvedValue("de");
    const { proxy } = await loadProxy();

    await proxy(createRequest("/en/dashboard", "not-a-locale"));

    expect(mocks.getDefaultLocale).toHaveBeenCalledOnce();
    expect(mocks.createI18nMiddleware).toHaveBeenCalledWith("de");
  });

  it("keeps a valid locale cookie and does not query the configured default", async () => {
    const { proxy } = await loadProxy();

    const response = await proxy(createRequest("/fr/dashboard", "fr"));

    expect(response.status).toBe(200);
    expect(mocks.getDefaultLocale).not.toHaveBeenCalled();
    expect(mocks.createI18nMiddleware).toHaveBeenCalledWith("en");
  });

  it("deduplicates concurrent cold-start database reads", async () => {
    let finishOnboarding!: (step: string) => void;
    let finishLocale!: (locale: string) => void;
    mocks.getOnboardingStep.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          finishOnboarding = resolve;
        }),
    );
    mocks.getDefaultLocale.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          finishLocale = resolve;
        }),
    );
    const { proxy } = await loadProxy();
    const responses = Array.from({ length: 50 }, () => proxy(createRequest("/en/dashboard", "not-a-locale")));

    await vi.waitFor(() => expect(mocks.getOnboardingStep).toHaveBeenCalledOnce());
    finishOnboarding("finish");
    await vi.waitFor(() => expect(mocks.getDefaultLocale).toHaveBeenCalledOnce());
    finishLocale("de");

    await expect(Promise.all(responses)).resolves.toHaveLength(50);
    expect(mocks.getOnboardingStep).toHaveBeenCalledOnce();
    expect(mocks.getDefaultLocale).toHaveBeenCalledOnce();
  });

  it("clears failed in-flight reads so the next request can recover", async () => {
    mocks.getOnboardingStep.mockRejectedValueOnce(new Error("temporary database failure")).mockResolvedValue("finish");
    const { proxy } = await loadProxy();

    await expect(proxy(createRequest("/en/dashboard", "en"))).rejects.toThrow("temporary database failure");
    await expect(proxy(createRequest("/en/dashboard", "en"))).resolves.toMatchObject({ status: 200 });

    expect(mocks.getOnboardingStep).toHaveBeenCalledTimes(2);
  });
});
