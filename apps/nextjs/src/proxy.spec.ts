import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

import { localeCookieKey } from "@homarr/definitions";

const mocks = vi.hoisted(() => ({
  getRouting: vi.fn(),
  createI18nMiddleware: vi.fn(),
}));

vi.mock("@orpc/client", () => ({
  createORPCClient: () => ({ frontend: { routing: mocks.getRouting } }),
}));
vi.mock("@orpc/client/fetch", () => ({ RPCLink: class {} }));

vi.mock("@homarr/api/shared", () => ({ getRpcUrl: () => "http://backend:3002/rpc" }));

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
    vi.stubEnv("HOMARR_FRONTEND_MODE", undefined);
    vi.clearAllMocks();
    mocks.getRouting.mockResolvedValue({ step: "finish", defaultLocale: "en" });
    mocks.createI18nMiddleware.mockImplementation((defaultLocale: string) => (request: NextRequest) => {
      request.headers.set("x-test-default-locale", defaultLocale);
      return NextResponse.next();
    });
  });

  it("renders the worker shell without reading a host backend or adding a root trailing slash", async () => {
    vi.stubEnv("HOMARR_FRONTEND_MODE", "workers");
    const { proxy } = await loadProxy();
    const response = await proxy(createRequest("/"));
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://localhost/en/worker-shell");
    expect(mocks.getRouting).not.toHaveBeenCalled();
  });

  it("keeps normal localized Homarr routes inside the browser workspace", async () => {
    vi.stubEnv("HOMARR_FRONTEND_MODE", "workers");
    const { proxy } = await loadProxy();
    const response = await proxy(createRequest("/fr/boards/My-dashboard/settings"));
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://localhost/fr/worker-shell/boards/My-dashboard/settings",
    );
    const internal = await proxy(createRequest("/fr/worker-shell/boards/My-dashboard/settings"));
    expect(internal.headers.get("x-middleware-rewrite")).toBeNull();
    expect(mocks.getRouting).not.toHaveBeenCalled();
  });

  it("keeps TLS-terminated rewrites on the internal listener instead of the public host", async () => {
    vi.stubEnv("HOMARR_FRONTEND_MODE", "workers");
    vi.stubEnv("__NEXT_NO_MIDDLEWARE_URL_NORMALIZE", "1");
    const { proxy } = await loadProxy();
    const request = new NextRequest("https://0.0.0.0:3000/manage/boards", {
      headers: { Host: "homarr.example", "X-Forwarded-Proto": "https" },
    });
    const response = await proxy(request);
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://0.0.0.0:3000/en/worker-shell/manage/boards");
    expect(mocks.getRouting).not.toHaveBeenCalled();
  });

  it("blocks host-local API access while allowing the static frontend health check", async () => {
    vi.stubEnv("HOMARR_FRONTEND_MODE", "workers");
    const { proxy } = await loadProxy();
    const response = await proxy(createRequest("/api/trpc/board.getHomeBoard"));
    expect(response.status).toBe(404);
    const health = await proxy(createRequest("/api/frontend/health"));
    expect(health.status).toBe(200);
    expect(mocks.getRouting).not.toHaveBeenCalled();
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
