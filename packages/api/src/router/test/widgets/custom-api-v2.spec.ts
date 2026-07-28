import { stringify as stringifySuperJson } from "superjson";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { encryptSecret } from "@homarr/common/server";
import { eq } from "@homarr/db";
import {
  boardUserPermissions,
  boards,
  customWidgetDefinitions,
  customWidgetSecrets,
  items,
  legacyCustomWidgetDefinitions,
  users,
} from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";

const mocks = vi.hoisted(() => {
  const executeRequestImplementation = async (
    _input: unknown,
    options?: { acquireRequestLimit?: () => Promise<() => Promise<void>> },
  ) => {
    const release = await options?.acquireRequestLimit?.();
    try {
      return { ok: true, status: 200, statusText: "OK", data: { value: 42 } };
    } finally {
      await release?.();
    }
  };
  return {
    acquireRequestLimit: vi.fn(async () => async () => undefined),
    invalidateCache: vi.fn(async () => undefined),
    executeRequestImplementation,
    executeRequest: vi.fn(executeRequestImplementation),
  };
});

vi.mock("../../custom-widget/request-executor", () => ({
  executeCustomWidgetRequest: mocks.executeRequest,
  invalidateCustomWidgetResponseCache: mocks.invalidateCache,
}));

vi.mock("../../custom-widget/request-limits", () => ({
  acquireCustomWidgetRequestLimit: mocks.acquireRequestLimit,
}));

import { serializeCustomWidgetDefinition } from "../../custom-widget/stored-definition";
import { customApiRouter } from "../../widgets/custom-api";

const definition: HomarrCustomWidgetV2 = {
  $schema: "homarr-custom-widget-v2",
  name: "Router test widget",
  sources: {
    default: {
      name: "API",
      baseUrl: "https://example.com",
      networkScope: "public",
      auth: "none",
    },
  },
  requests: {
    "load-status": {
      source: "default",
      kind: "query",
      method: "GET",
      path: "/status",
      auth: "inherit",
      permission: "view",
      trigger: "load",
    },
    status: {
      source: "default",
      kind: "query",
      method: "GET",
      path: "/status/{param:name}",
      auth: "inherit",
      permission: "view",
      trigger: "manual",
    },
    "private-status": {
      source: "default",
      kind: "query",
      method: "GET",
      path: "/private-status",
      auth: "inherit",
      permission: "modify",
      trigger: "manual",
    },
    toggle: {
      source: "default",
      kind: "action",
      method: "POST",
      path: "/toggle",
      body: { enabled: { $param: "enabled" } },
      auth: "inherit",
      permission: "modify",
      trigger: "manual",
    },
    delete: {
      source: "default",
      kind: "action",
      method: "DELETE",
      path: "/resource",
      auth: "inherit",
      permission: "full",
      trigger: "manual",
      confirmation: { title: "Delete resource", message: "Delete this resource?", destructive: true },
    },
  },
  options: {},
  template: "<Text>{data['load-status']?.value}</Text>",
};

const createSession = (userId: string): Session => ({
  user: { id: userId, permissions: [], colorScheme: "light" },
  expires: new Date(Date.now() + 60_000).toISOString(),
});

async function setup(isPublic = true, customDefinition = definition, apiKey?: string) {
  const db = createDb();
  const ownerId = createId();
  const boardId = createId();
  const itemId = createId();
  const definitionId = createId();
  await db.insert(users).values({ id: ownerId });
  await db.insert(boards).values({ id: boardId, name: createId(), creatorId: ownerId, isPublic });
  await db.insert(customWidgetDefinitions).values({
    id: definitionId,
    ...serializeCustomWidgetDefinition(customDefinition),
    creatorId: ownerId,
  });
  if (apiKey) {
    await db.insert(customWidgetSecrets).values({
      definitionId,
      sourceId: "default",
      kind: "apiKey",
      encryptedValue: encryptSecret(apiKey),
      updatedAt: new Date(),
    });
  }
  await db.insert(items).values({
    id: itemId,
    boardId,
    kind: "customApi",
    options: stringifySuperJson({ definitionId, configuration: {}, configurationVersion: 1 }),
  });
  return { db, ownerId, boardId, itemId, definitionId };
}

describe("Custom JSX v2 board router", () => {
  beforeEach(() => {
    mocks.acquireRequestLimit.mockClear();
    mocks.executeRequest.mockReset();
    mocks.executeRequest.mockImplementation(mocks.executeRequestImplementation);
    mocks.invalidateCache.mockClear();
  });

  test("allows public queries only through the definition placed on an accessible board", async () => {
    const { db, itemId } = await setup();
    const caller = customApiRouter.createCaller({
      db,
      deviceType: undefined,
      session: null,
      clientAddress: "198.51.100.10",
    });

    await expect(caller.queryRequest({ itemId, requestId: "status", params: { name: "homarr" } })).resolves.toEqual(
      expect.objectContaining({ ok: true, data: { value: 42 } }),
    );
    await expect(caller.queryRequest({ itemId, requestId: "missing", params: {} })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(mocks.executeRequest).toHaveBeenCalledOnce();
    expect(mocks.acquireRequestLimit).toHaveBeenCalledWith(
      expect.objectContaining({ userId: undefined, anonymousId: "198.51.100.10" }),
    );
  });

  test("redacts apiKeyQuery transport details from anonymous load and manual query results", async () => {
    const apiKey = "api-key-query-secret";
    const credentialedDefinition: HomarrCustomWidgetV2 = {
      ...definition,
      sources: {
        default: {
          name: "API",
          baseUrl: "https://example.com",
          networkScope: "public",
          auth: { type: "apiKeyQuery", name: "access_token" },
        },
      },
    };
    const { db, itemId } = await setup(true, credentialedDefinition, apiKey);
    mocks.executeRequest.mockImplementation(async (input) => {
      const request = input as {
        targetUrl: URL;
        auth?: { headerName?: string | null; secrets: Array<{ kind: string; value: string }> };
      };
      const secret = request.auth?.secrets.find(({ kind }) => kind === "apiKey")?.value;
      const tokenizedUrl = new URL(request.targetUrl);
      tokenizedUrl.searchParams.set(request.auth?.headerName ?? "api_key", secret ?? "");
      const failure = new Error(`Transport failed for ${tokenizedUrl.toString()}`);
      failure.name = `SocketError:${tokenizedUrl.toString()}`;
      throw failure;
    });
    const caller = customApiRouter.createCaller({
      db,
      deviceType: undefined,
      session: null,
      clientAddress: "198.51.100.10",
    });

    const loadResult = await caller.getData({ itemId });
    const queryError = await caller.queryRequest({ itemId, requestId: "status", params: { name: "homarr" } }).then(
      () => undefined,
      (cause: unknown) => cause,
    );

    expect(loadResult.status["load-status"]).toMatchObject({
      ok: false,
      status: 0,
      error: "Request failed",
    });
    expect(queryError).toMatchObject({
      code: "BAD_GATEWAY",
      message: "External request failed",
    });
    expect((queryError as Error).cause).toBeUndefined();
    expect(mocks.executeRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: expect.objectContaining({
          type: "apiKeyQuery",
          headerName: "access_token",
          secrets: [{ kind: "apiKey", value: apiKey }],
        }),
      }),
      expect.any(Object),
    );
    expect(JSON.stringify(loadResult)).not.toContain(apiKey);
    expect(JSON.stringify(loadResult)).not.toContain("access_token");
    expect(String(queryError)).not.toContain(apiKey);
    expect(String(queryError)).not.toContain("access_token");
  });

  test("requires authentication before invalidating board-authorized query caches", async () => {
    const { db, itemId } = await setup();
    const viewerId = createId();
    await db.insert(users).values({ id: viewerId });
    const anonymous = customApiRouter.createCaller({
      db,
      deviceType: undefined,
      session: null,
      clientAddress: "198.51.100.10",
    });

    await expect(anonymous.refreshQueries({ itemId, all: true })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.invalidateCache).not.toHaveBeenCalled();

    const authenticated = customApiRouter.createCaller({
      db,
      deviceType: undefined,
      session: createSession(viewerId),
      clientAddress: "198.51.100.10",
    });
    await expect(authenticated.refreshQueries({ itemId, all: true })).resolves.toEqual({
      requestIds: ["load-status", "status"],
    });
    expect(mocks.invalidateCache).toHaveBeenCalledOnce();
    expect(mocks.invalidateCache).toHaveBeenCalledWith([
      expect.stringMatching(new RegExp(`^custom-jsx:${itemId}:.+:load-status:$`, "u")),
      expect.stringMatching(new RegExp(`^custom-jsx:${itemId}:.+:status:$`, "u")),
    ]);
    expect(mocks.acquireRequestLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "query",
        userId: viewerId,
        itemId,
      }),
    );
    expect(mocks.executeRequest).not.toHaveBeenCalled();
  });

  test("queues valid load requests within the per-viewer concurrency limit", async () => {
    const requests = Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => [
        `load-${index}`,
        {
          source: "default",
          kind: "query" as const,
          method: "GET" as const,
          path: `/status/${index}`,
          auth: "inherit" as const,
          permission: "view" as const,
          trigger: "load" as const,
        },
      ]),
    );
    const { db, itemId } = await setup(true, { ...definition, requests });
    let active = 0;
    let maximumActive = 0;
    mocks.executeRequest.mockImplementation(async (_input, options) => {
      const release = await options?.acquireRequestLimit?.();
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      try {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return { ok: true, status: 200, statusText: "OK", data: { value: active } };
      } finally {
        active -= 1;
        await release?.();
      }
    });
    const caller = customApiRouter.createCaller({
      db,
      deviceType: undefined,
      session: null,
      clientAddress: "198.51.100.10",
    });

    const result = await caller.getData({ itemId });

    expect(Object.keys(result.data)).toHaveLength(6);
    expect(mocks.executeRequest).toHaveBeenCalledTimes(6);
    expect(maximumActive).toBe(4);
  });

  test("hides private boards and disabled definitions before executing a request", async () => {
    const privateSetup = await setup(false);
    const anonymous = customApiRouter.createCaller({
      db: privateSetup.db,
      deviceType: undefined,
      session: null,
    });
    await expect(
      anonymous.queryRequest({ itemId: privateSetup.itemId, requestId: "status", params: { name: "homarr" } }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const enabledSetup = await setup();
    await enabledSetup.db
      .update(customWidgetDefinitions)
      .set({ enabled: false })
      .where(eq(customWidgetDefinitions.id, enabledSetup.definitionId));
    const publicCaller = customApiRouter.createCaller({ db: enabledSetup.db, deviceType: undefined, session: null });
    await expect(publicCaller.getData({ itemId: enabledSetup.itemId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      publicCaller.queryRequest({ itemId: enabledSetup.itemId, requestId: "status", params: { name: "homarr" } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const ownerCaller = customApiRouter.createCaller({
      db: enabledSetup.db,
      deviceType: undefined,
      session: createSession(enabledSetup.ownerId),
    });
    await expect(
      ownerCaller.executeAction({ itemId: enabledSetup.itemId, requestId: "toggle", params: { enabled: true } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.executeRequest).not.toHaveBeenCalled();
  });

  test("surfaces a real preserved v1 placement as migration-required", async () => {
    const { db, itemId, definitionId, ownerId } = await setup();
    await db.delete(customWidgetDefinitions).where(eq(customWidgetDefinitions.id, definitionId));
    await db.insert(legacyCustomWidgetDefinitions).values({
      id: definitionId,
      name: "Legacy weather",
      url: "https://example.com/weather",
      displayConfig: stringifySuperJson({ type: "singleValue", jsonPath: "$.temperature" }),
      creatorId: ownerId,
    });
    const caller = customApiRouter.createCaller({ db, deviceType: undefined, session: null });

    await expect(caller.getData({ itemId })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: "LEGACY_CUSTOM_WIDGET_MIGRATION_REQUIRED",
    });
    expect(mocks.executeRequest).not.toHaveBeenCalled();
  });

  test("rejects request-kind and parameter mismatches", async () => {
    const { db, itemId, ownerId } = await setup();
    const caller = customApiRouter.createCaller({ db, deviceType: undefined, session: createSession(ownerId) });

    await expect(caller.queryRequest({ itemId, requestId: "toggle", params: { enabled: true } })).rejects.toMatchObject(
      { code: "NOT_FOUND" },
    );
    await expect(caller.queryRequest({ itemId, requestId: "status", params: {} })).rejects.toThrow();
    expect(mocks.executeRequest).not.toHaveBeenCalled();
  });

  test("enforces modify permission and renders an authorized action body", async () => {
    const { db, itemId, boardId } = await setup(false);
    const editorId = createId();
    await db.insert(users).values({ id: editorId });
    const caller = customApiRouter.createCaller({ db, deviceType: undefined, session: createSession(editorId) });

    await expect(
      caller.executeAction({ itemId, requestId: "toggle", params: { enabled: true } }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await db.insert(boardUserPermissions).values({ boardId, userId: editorId, permission: "modify" });
    await expect(caller.executeAction({ itemId, requestId: "toggle", params: { enabled: true } })).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );
    expect(mocks.executeRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: "POST", body: '{"enabled":true}' }),
      expect.objectContaining({ acquireRequestLimit: expect.any(Function) }),
    );
  });

  test("requires confirmation and full permission for DELETE actions", async () => {
    const { db, itemId, boardId, ownerId } = await setup(false);
    const owner = customApiRouter.createCaller({ db, deviceType: undefined, session: createSession(ownerId) });
    await expect(owner.executeAction({ itemId, requestId: "delete", params: {} })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });

    const editorId = createId();
    await db.insert(users).values({ id: editorId });
    await db.insert(boardUserPermissions).values({ boardId, userId: editorId, permission: "modify" });
    const editor = customApiRouter.createCaller({ db, deviceType: undefined, session: createSession(editorId) });
    await expect(
      editor.executeAction({ itemId, requestId: "delete", params: {}, confirmed: true }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(owner.executeAction({ itemId, requestId: "delete", params: {}, confirmed: true })).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );
  });
});
