import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ authenticate: vi.fn(), handle: vi.fn(), context: vi.fn() }));

vi.mock("@trpc/server/adapters/fetch", () => ({ fetchRequestHandler: mocks.handle }));
vi.mock("@homarr/api", () => ({ appRouter: {}, createTRPCContext: mocks.context }));
vi.mock("@homarr/api/shared", () => ({ trpcPath: "/api/trpc" }));
vi.mock("@homarr/auth/api-key", () => ({
  API_KEY_HEADER_NAME: "ApiKey",
  getSessionFromApiKeyAsync: mocks.authenticate,
}));
vi.mock("@homarr/auth/next", () => ({ auth: (handler: unknown) => handler }));
vi.mock("@homarr/common/server", () => ({ ipAddressFromHeaders: () => null }));
vi.mock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => ({ error: vi.fn() }) }));
vi.mock("@homarr/core/infrastructure/logs/error", () => ({ ErrorWithMetadata: Error }));
vi.mock("@homarr/db", () => ({ db: {} }));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticate.mockResolvedValue(null);
  mocks.handle.mockImplementation(async ({ createContext }: { createContext: () => unknown }) => {
    createContext();
    return Response.json({ ok: true });
  });
});

test.each(["", "invalid", "revoked.secret"])(
  "an explicit invalid API key (%s) never falls back to a browser session",
  async (key) => {
    const request = Object.assign(
      new NextRequest("https://homarr.test/api/trpc/info.getInfo", {
        headers: { ApiKey: key, Cookie: "authjs.session-token=admin-session" },
      }),
      { auth: { user: { id: "admin", permissions: ["admin"] } } },
    );

    const response = await GET(request, { params: Promise.resolve({ trpc: "info.getInfo" }) });
    if (!(response instanceof Response)) throw new Error("Expected a route response");

    expect(response.status).toBe(401);
    expect(mocks.handle).not.toHaveBeenCalled();
  },
);

test("a read-only API key takes precedence over an administrator browser session", async () => {
  const keySession = { user: { id: "owner", permissions: ["admin"] }, apiKey: { readOnly: true, oauthClientId: null } };
  mocks.authenticate.mockResolvedValue(keySession);
  const request = Object.assign(
    new NextRequest("https://homarr.test/api/trpc/info.getInfo", {
      headers: { ApiKey: "read.secret" },
    }),
    { auth: { user: { id: "admin", permissions: ["admin"] } } },
  );

  const response = await GET(request, { params: Promise.resolve({ trpc: "info.getInfo" }) });
  if (!(response instanceof Response)) throw new Error("Expected a route response");

  expect(response.status).toBe(200);
  expect(mocks.context).toHaveBeenCalledWith({ session: keySession, headers: request.headers });
});
