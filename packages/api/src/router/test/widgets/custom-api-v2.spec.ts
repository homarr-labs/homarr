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
}));

vi.mock("../../custom-widget/request-executor", () => ({
  executeCustomWidgetRequest: mocks.executeRequest,
  invalidateCustomWidgetResponseCache: vi.fn(),
}));

vi.mock("../../custom-widget/request-limits", () => ({
  acquireCustomWidgetRequestLimit: vi.fn(async () => async () => undefined),
}));

import { serializeCustomWidgetDefinition } from "../../custom-widget/stored-definition";
import { customApiRouter } from "../../widgets/custom-api";

const definition: HomarrCustomWidgetV2 = {
  $schema: "homarr-custom-widget-v2",
  name: "Router test widget",
  sources: [
    {
      id: "default",
      name: "API",
      baseUrl: "https://example.com",
      networkScope: "public",
      auth: { type: "none" },
    },
  ],
  requests: [
    {
      id: "load-status",
      sourceId: "default",
      kind: "query",
      method: "GET",
      pathTemplate: "/status",
      parameters: {},
      auth: "inherit",
      minimumBoardPermission: "view",
      trigger: "load",
    },
    {
      id: "status",
      sourceId: "default",
      kind: "query",
      method: "GET",
      pathTemplate: "/status/{name}",
      parameters: { name: "string" },
      auth: "inherit",
      minimumBoardPermission: "view",
      trigger: "manual",
    },
    {
      id: "toggle",
      sourceId: "default",
      kind: "action",
      method: "POST",
      pathTemplate: "/toggle",
      parameters: { enabled: "boolean" },
      bodyTemplate: { enabled: { $param: "enabled" } },
      auth: "inherit",
      minimumBoardPermission: "modify",
      trigger: "manual",
    },
    {
      id: "delete",
      sourceId: "default",
      kind: "action",
      method: "DELETE",
      pathTemplate: "/resource",
      parameters: {},
      auth: "inherit",
      minimumBoardPermission: "full",
      trigger: "manual",
    },
  ],
  optionsSchema: { type: "object", properties: {}, additionalProperties: false },
  defaultOptions: {},
  template: "<Text>{data['load-status']?.value}</Text>",
};

const createSession = (userId: string): Session => ({
  user: { id: userId, permissions: [], colorScheme: "light" },
  expires: new Date(Date.now() + 60_000).toISOString(),
});

async function setup(isPublic = true) {
  const db = createDb();
  const ownerId = createId();
  const boardId = createId();
  const itemId = createId();
  const definitionId = createId();
  await db.insert(users).values({ id: ownerId });
  await db.insert(boards).values({ id: boardId, name: createId(), creatorId: ownerId, isPublic });
  await db.insert(customWidgetDefinitions).values({
    id: definitionId,
    ...serializeCustomWidgetDefinition(definition),
    creatorId: ownerId,
  });
  await db.insert(items).values({
    id: itemId,
    boardId,
    kind: "customApi",
    options: stringifySuperJson({ definitionId, configuration: {}, configurationVersion: 1 }),
  });
  return { db, ownerId, boardId, itemId, definitionId };
}

describe("Custom JSX v2 board router", () => {
  beforeEach(() => mocks.executeRequest.mockClear());

  test("allows public queries only through the definition placed on an accessible board", async () => {
    const { db, itemId } = await setup();
    const caller = customApiRouter.createCaller({ db, deviceType: undefined, session: null });

    await expect(caller.queryRequest({ itemId, requestId: "status", params: { name: "homarr" } })).resolves.toEqual(
      expect.objectContaining({ ok: true, data: { value: 42 } }),
    );
    await expect(caller.queryRequest({ itemId, requestId: "missing", params: {} })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(mocks.executeRequest).toHaveBeenCalledOnce();
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
    expect(mocks.executeRequest).not.toHaveBeenCalled();
  });

  test("rejects request-kind and parameter mismatches", async () => {
    const { db, itemId, ownerId } = await setup();
    const caller = customApiRouter.createCaller({ db, deviceType: undefined, session: createSession(ownerId) });

    await expect(caller.queryRequest({ itemId, requestId: "toggle", params: { enabled: true } })).rejects.toMatchObject(
      { code: "NOT_FOUND" },
    );
    await expect(caller.queryRequest({ itemId, requestId: "status", params: { name: 42 } })).rejects.toThrow();
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
