import { stringify as stringifySuperJson } from "superjson";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { eq } from "@homarr/db";
import { boardUserPermissions, boards, customWidgetDefinitions, items, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";

const mocks = vi.hoisted(() => ({
  executeRequest: vi.fn(async () => ({ ok: true, status: 200, statusText: "OK", data: { value: 42 } })),
  invalidateResponseCache: vi.fn(),
}));

vi.mock("../../custom-widget/request-executor", () => ({
  executeCustomWidgetRequest: mocks.executeRequest,
  invalidateCustomWidgetResponseCache: mocks.invalidateResponseCache,
}));

vi.mock("../../custom-widget/request-limits", () => ({
  acquireCustomWidgetRequestLimit: vi.fn(async () => async () => undefined),
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

async function setup(
  isPublic = true,
  customDefinition: HomarrCustomWidgetV2 = definition,
  configuration: Record<string, unknown> = {},
) {
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
  await db.insert(items).values({
    id: itemId,
    boardId,
    kind: "customApi",
    options: stringifySuperJson({ definitionId, configuration, configurationVersion: 1 }),
  });
  return { db, ownerId, boardId, itemId, definitionId };
}

describe("Custom JSX v2 board router", () => {
  beforeEach(() => {
    mocks.executeRequest.mockClear();
    mocks.invalidateResponseCache.mockClear();
  });

  test("refreshes the server response cache for a placed widget", async () => {
    const { db, itemId, ownerId } = await setup();
    const caller = customApiRouter.createCaller({ db, deviceType: undefined, session: createSession(ownerId) });

    await caller.refresh({ itemId });

    expect(mocks.invalidateResponseCache).toHaveBeenCalledWith([
      expect.stringMatching(new RegExp(`^custom-jsx:${itemId}:[a-f0-9]{16}:$`, "u")),
    ]);
  });

  test("loads placed widgets and public queries for anonymous visitors on public boards", async () => {
    const { db, itemId } = await setup();
    const caller = customApiRouter.createCaller({ db, deviceType: undefined, session: null });

    await expect(caller.getData({ itemId })).resolves.toMatchObject({
      template: definition.template,
      data: { "load-status": { value: 42 } },
      status: { "load-status": { ok: true } },
    });
    await expect(caller.queryRequest({ itemId, requestId: "status", params: { name: "homarr" } })).resolves.toEqual(
      expect.objectContaining({ ok: true, data: { value: 42 } }),
    );
    await expect(caller.queryRequest({ itemId, requestId: "missing", params: {} })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(mocks.executeRequest).toHaveBeenCalledTimes(2);
  });

  test("uses current defaults when an updated option no longer accepts the stored value", async () => {
    const updatedDefinition: HomarrCustomWidgetV2 = {
      ...definition,
      options: {
        limit: { label: "Limit", control: "slider", default: 5, min: 1, max: 10 },
      },
      template: "<Text>{options.limit}</Text>",
    };
    const { db, itemId } = await setup(true, updatedDefinition, { limit: "5", removed: true });
    const caller = customApiRouter.createCaller({ db, deviceType: undefined, session: null });

    await expect(caller.getData({ itemId })).resolves.toMatchObject({ options: { limit: 5 } });
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
    await expect(anonymous.getData({ itemId: privateSetup.itemId })).rejects.toMatchObject({ code: "NOT_FOUND" });

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
