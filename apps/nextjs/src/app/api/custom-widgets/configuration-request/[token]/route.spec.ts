// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  assertIntegrationBindings: vi.fn(),
  auth: vi.fn(),
  claimForUser: vi.fn(),
  complete: vi.fn(),
  configureDefinition: vi.fn(),
  configurePreview: vi.fn(),
  getForUser: vi.fn(),
  invalidateCache: vi.fn(),
  release: vi.fn(),
  retry: vi.fn(),
}));

vi.mock("@homarr/auth/next", () => ({ auth: routeMocks.auth }));
vi.mock("@homarr/api/custom-widget-configuration", () => ({
  assertCustomWidgetIntegrationBindings: routeMocks.assertIntegrationBindings,
  claimCustomWidgetConfigurationRequestForUser: routeMocks.claimForUser,
  completeCustomWidgetConfigurationRequest: routeMocks.complete,
  configureCustomWidgetSourceFromRequest: routeMocks.configureDefinition,
  configurePreviewSessionSource: routeMocks.configurePreview,
  getCustomWidgetConfigurationRequestForUser: routeMocks.getForUser,
  releaseCustomWidgetConfigurationRequest: routeMocks.release,
  retryCustomWidgetConfigurationRequest: routeMocks.retry,
}));
vi.mock("@homarr/custom-widgets/server", () => ({
  invalidateCustomWidgetResponseCache: routeMocks.invalidateCache,
}));
vi.mock("@homarr/db", () => ({ db: { kind: "test-db" } }));

import { GET, POST } from "./route";

const token = "owner-configuration-token";
const ownerId = "admin-owner";
const otherAdminId = "admin-other";

const createPendingRequest = (target: { type: "preview" | "definition"; id: string }) => ({
  id: token,
  userId: ownerId,
  target,
  widgetName: "Private status",
  sourceId: "default",
  sourceName: "Internal service",
  source: {
    baseUrl: "http://internal-owner-only.local",
    networkScope: "private" as const,
    auth: "bearer" as const,
  },
  kinds: ["apiKey" as const],
  expiresAt: Date.now() + 60_000,
  status: "pending" as const,
});

let pendingRequest = createPendingRequest({ type: "preview", id: "preview-owner" });

const context = { params: Promise.resolve({ token }) };
const getRequest = () => new Request(`http://homarr.test/api/custom-widgets/configuration-request/${token}`);
const postRequest = () =>
  new Request(`http://homarr.test/api/custom-widgets/configuration-request/${token}`, {
    method: "POST",
    body: JSON.stringify({
      baseUrl: "http://configured-owner-only.local",
      networkScope: "private",
      secrets: { apiKey: "owner-secret" },
    }),
  });

beforeEach(() => {
  vi.resetAllMocks();
  pendingRequest = createPendingRequest({ type: "preview", id: "preview-owner" });
  routeMocks.auth.mockResolvedValue({ user: { id: ownerId, permissions: ["admin"] } });
  routeMocks.getForUser.mockImplementation((_requestId: string, userId: string) =>
    userId === ownerId ? pendingRequest : null,
  );
  routeMocks.claimForUser.mockImplementation((_requestId: string, userId: string) =>
    userId === ownerId ? { ...pendingRequest, status: "applying" } : null,
  );
  routeMocks.complete.mockImplementation(() => ({ ...pendingRequest, status: "completed" }));
  routeMocks.configureDefinition.mockResolvedValue({ status: "configured" });
});

describe("Custom Widget source configuration ownership", () => {
  test("does not reveal another administrator's request, source, or internal URL", async () => {
    routeMocks.auth.mockResolvedValue({ user: { id: otherAdminId, permissions: ["admin"] } });

    const response = await GET(getRequest() as never, context);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(routeMocks.getForUser).toHaveBeenCalledWith(token, otherAdminId);
    expect(JSON.stringify(body)).not.toContain("Private status");
    expect(JSON.stringify(body)).not.toContain("Internal service");
    expect(JSON.stringify(body)).not.toContain("internal-owner-only.local");
  });

  test("returns source configuration details to the administrator who created the request", async () => {
    const response = await GET(getRequest() as never, context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      widgetName: "Private status",
      sourceName: "Internal service",
      source: { baseUrl: "http://internal-owner-only.local" },
      status: "pending",
    });
    expect(routeMocks.getForUser).toHaveBeenCalledWith(token, ownerId);
  });

  test.each([
    ["preview", "preview-owner"],
    ["definition", "definition-owner"],
  ] as const)("prevents another administrator from configuring the originating %s", async (type, id) => {
    pendingRequest = createPendingRequest({ type, id });
    routeMocks.auth.mockResolvedValue({ user: { id: otherAdminId, permissions: ["admin"] } });

    const response = await POST(postRequest() as never, context);

    expect(response.status).toBe(404);
    expect(routeMocks.getForUser).toHaveBeenCalledWith(token, otherAdminId);
    expect(routeMocks.claimForUser).not.toHaveBeenCalled();
    expect(routeMocks.configurePreview).not.toHaveBeenCalled();
    expect(routeMocks.configureDefinition).not.toHaveBeenCalled();
    expect(routeMocks.complete).not.toHaveBeenCalled();
    expect(routeMocks.release).not.toHaveBeenCalled();
  });

  test.each([
    ["preview", "preview-owner"],
    ["definition", "definition-owner"],
  ] as const)("allows the request owner to configure the originating %s", async (type, id) => {
    pendingRequest = createPendingRequest({ type, id });

    const response = await POST(postRequest() as never, context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "completed" });
    expect(routeMocks.claimForUser).toHaveBeenCalledWith(token, ownerId);
    expect(routeMocks.complete).toHaveBeenCalledWith(token);
    expect(routeMocks.release).toHaveBeenCalledWith(token);
    if (type === "preview") {
      expect(routeMocks.configurePreview).toHaveBeenCalledWith(
        id,
        ownerId,
        "default",
        expect.objectContaining({ baseUrl: "http://configured-owner-only.local" }),
        [{ sourceId: "default", kind: "apiKey", value: "owner-secret" }],
      );
      expect(routeMocks.configureDefinition).not.toHaveBeenCalled();
      return;
    }
    expect(routeMocks.configureDefinition).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        definitionId: id,
        sourceId: "default",
        secrets: [{ sourceId: "default", kind: "apiKey", value: "owner-secret" }],
      }),
    );
    expect(routeMocks.configurePreview).not.toHaveBeenCalled();
  });

  test("does not mutate or release when another request already holds the claim", async () => {
    routeMocks.claimForUser.mockResolvedValue(null);

    const response = await POST(postRequest() as never, context);

    expect(response.status).toBe(409);
    expect(routeMocks.configurePreview).not.toHaveBeenCalled();
    expect(routeMocks.configureDefinition).not.toHaveBeenCalled();
    expect(routeMocks.complete).not.toHaveBeenCalled();
    expect(routeMocks.release).not.toHaveBeenCalled();
  });

  test.each([
    ["preview", "preview-owner"],
    ["definition", "definition-owner"],
  ] as const)("does not reopen the claim when the %s mutation outcome is ambiguous", async (type, id) => {
    pendingRequest = createPendingRequest({ type, id });
    const error = new Error(`${type} mutation failed`);
    if (type === "preview") routeMocks.configurePreview.mockRejectedValue(error);
    else routeMocks.configureDefinition.mockRejectedValue(error);

    await expect(POST(postRequest() as never, context)).rejects.toThrow(error);

    expect(routeMocks.release).toHaveBeenCalledWith(token);
    expect(routeMocks.retry).not.toHaveBeenCalled();
    expect(routeMocks.complete).not.toHaveBeenCalled();
  });

  test("releases a definition claim without completing when its source binding changed", async () => {
    pendingRequest = createPendingRequest({ type: "definition", id: "definition-owner" });
    routeMocks.configureDefinition.mockResolvedValue({ status: "binding-changed" });

    const response = await POST(postRequest() as never, context);

    expect(response.status).toBe(409);
    expect(routeMocks.release).toHaveBeenCalledWith(token);
    expect(routeMocks.retry).toHaveBeenCalledWith(token);
    expect(routeMocks.complete).not.toHaveBeenCalled();
  });

  test("does not report completion when completion state cannot be persisted", async () => {
    routeMocks.complete.mockResolvedValue(null);

    const response = await POST(postRequest() as never, context);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "The source was configured, but the setup request could not be completed. Request a new setup link.",
    });
    expect(routeMocks.configurePreview).toHaveBeenCalledOnce();
    expect(routeMocks.complete).toHaveBeenCalledWith(token);
    expect(routeMocks.release).toHaveBeenCalledWith(token);
    expect(routeMocks.retry).not.toHaveBeenCalled();
  });

  test("does not reopen the request when completion persistence throws after target mutation", async () => {
    const error = new Error("completion persistence failed");
    routeMocks.complete.mockRejectedValue(error);

    await expect(POST(postRequest() as never, context)).rejects.toThrow(error);

    expect(routeMocks.configurePreview).toHaveBeenCalledOnce();
    expect(routeMocks.retry).not.toHaveBeenCalled();
    expect(routeMocks.release).toHaveBeenCalledWith(token);
  });
});
