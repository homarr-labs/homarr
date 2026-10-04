import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { sessionFromKey, handle } = vi.hoisted(() => ({
  sessionFromKey: vi.fn().mockResolvedValue(null),
  handle: vi.fn(),
}));
vi.mock("trpc-to-openapi", () => ({ createOpenApiFetchHandler: handle }));
vi.mock("@homarr/api", () => ({ createTRPCContext: vi.fn() }));
vi.mock("@homarr/api/open-api", () => ({ openApiRouter: {} }));
vi.mock("@homarr/auth/api-key", () => ({ API_KEY_HEADER_NAME: "ApiKey", getSessionFromApiKeyAsync: sessionFromKey }));
vi.mock("@homarr/common/server", () => ({ ipAddressFromHeaders: () => "127.0.0.1" }));
vi.mock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => ({ info: vi.fn(), error: vi.fn() }) }));
vi.mock("@homarr/core/infrastructure/logs/error", () => ({ ErrorWithMetadata: Error }));
vi.mock("@homarr/db", () => ({ db: {} }));

import { GET, OPTIONS } from "./route";

describe("REST API browser access", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows an API-key preflight without authentication or cookies", () => {
    const response = OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-headers")).toBe("Content-Type, ApiKey");
    expect(response.headers.get("access-control-allow-methods")).toContain("PATCH");
    expect(response.headers.has("access-control-allow-credentials")).toBe(false);
    expect(sessionFromKey).not.toHaveBeenCalled();
    expect(handle).not.toHaveBeenCalled();
  });

  it.each([200, 401, 403, 500])("exposes a %s API response to the calling browser", async (status) => {
    handle.mockResolvedValueOnce(Response.json({ status }, { status }));
    const request = new NextRequest("https://homarr.example/api/info", {
      headers: { Origin: "https://homarr.dev", ApiKey: "test-id.test-token" },
    });
    const response = await GET(request);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ status });
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.has("access-control-allow-credentials")).toBe(false);
    expect(sessionFromKey).toHaveBeenCalledWith({}, "test-id.test-token", "127.0.0.1", expect.any(String));
  });

  it("does not substitute a session cookie for an API key", async () => {
    handle.mockResolvedValueOnce(Response.json({ message: "Unauthorized" }, { status: 401 }));
    await GET(new NextRequest("https://homarr.example/api/info", { headers: { Cookie: "authjs.session-token=test" } }));
    expect(sessionFromKey).toHaveBeenCalledWith({}, null, "127.0.0.1", expect.any(String));
  });
});
