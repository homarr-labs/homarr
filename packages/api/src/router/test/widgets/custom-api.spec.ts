import { stringify as stringifySuperJson } from "superjson";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { eq } from "@homarr/db";
import { boardUserPermissions, boards, customWidgetDefinitions, items, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

const mocks = vi.hoisted(() => ({
  executeRequest: vi.fn(async () => ({ ok: true, status: 200, statusText: "OK", data: { value: 42 } })),
}));

vi.mock("../../custom-widget/request-executor", () => ({
  executeCustomWidgetRequest: mocks.executeRequest,
  resolveSameOriginTarget: (_baseUrl: string, targetUrl: string | URL) => new URL(targetUrl),
}));

vi.mock("../../custom-widget/request-limits", () => ({
  acquireCustomWidgetRequestLimit: vi.fn(async () => async () => undefined),
}));

import { customApiRouter } from "../../widgets/custom-api";

const createSession = (userId: string): Session => ({
  user: { id: userId, permissions: [], colorScheme: "light" },
  expires: new Date(Date.now() + 60_000).toISOString(),
});

const queryRequest = {
  id: "status",
  kind: "query",
  method: "GET",
  pathTemplate: "/status/{name}",
  parameters: { name: "string" },
  auth: "inherit",
  minimumBoardPermission: "view",
} as const;

const actionRequest = {
  id: "toggle",
  kind: "action",
  method: "POST",
  pathTemplate: "/toggle",
  parameters: { enabled: "boolean" },
  bodyTemplate: { enabled: { $param: "enabled" } },
  auth: "inherit",
  minimumBoardPermission: "modify",
} as const;

const deleteRequest = {
  id: "delete",
  kind: "action",
  method: "DELETE",
  pathTemplate: "/resource",
  parameters: {},
  auth: "inherit",
  minimumBoardPermission: "full",
} as const;

const setup = async ({
  isPublic = true,
  method = "GET",
  requests = [queryRequest, actionRequest, deleteRequest],
}: {
  isPublic?: boolean;
  method?: "GET" | "POST";
  requests?: readonly Record<string, unknown>[];
} = {}) => {
  const db = createDb();
  const ownerId = createId();
  const boardId = createId();
  const itemId = createId();
  const definitionId = createId();
  await db.insert(users).values({ id: ownerId });
  await db.insert(boards).values({ id: boardId, name: createId(), creatorId: ownerId, isPublic });
  await db.insert(customWidgetDefinitions).values({
    id: definitionId,
    name: "Custom JSX",
    url: "https://example.com/api",
    method,
    authType: "none",
    displayType: "customJsx",
    displayConfig: stringifySuperJson({
      type: "customJsx",
      jsxApiVersion: 2,
      template: "<Text>{data.value}</Text>",
      networkScope: "public",
      requests,
    }),
    creatorId: ownerId,
  });
  await db.insert(items).values({
    id: itemId,
    boardId,
    kind: "customApi",
    options: stringifySuperJson({ definitionId, refreshInterval: 30 }),
  });
  return { db, ownerId, boardId, itemId, definitionId };
};

describe("customApiRouter v2", () => {
  beforeEach(() => mocks.executeRequest.mockClear());

  test("does not expose the removed raw subFetch procedure", () => {
    expect(Object.hasOwn(customApiRouter._def.procedures, "subFetch")).toBe(false);
  });

  test("allows anonymous queries only through a public board placement", async () => {
    const { db, itemId } = await setup();
    const caller = customApiRouter.createCaller({ db, deviceType: undefined, session: null });

    const result = await caller.queryRequest({ itemId, requestId: "status", params: { name: "homarr" } });

    expect(result).toMatchObject({ ok: true, status: 200, data: { value: 42 } });
    expect(mocks.executeRequest).toHaveBeenCalledOnce();
  });

  test("does not expose a placed definition through an inaccessible board", async () => {
    const { db, itemId } = await setup({ isPublic: false });
    const caller = customApiRouter.createCaller({ db, deviceType: undefined, session: null });

    await expect(caller.getData({ itemId })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.executeRequest).not.toHaveBeenCalled();
  });

  test("does not execute non-GET base data requests automatically", async () => {
    const { db, itemId } = await setup({ method: "POST" });
    const caller = customApiRouter.createCaller({ db, deviceType: undefined, session: null });

    await expect(caller.getData({ itemId })).resolves.toEqual({ type: "networkAccessNeedsReview" });
    expect(mocks.executeRequest).not.toHaveBeenCalled();
  });

  test("cannot select a request from a definition that is not attached to the item", async () => {
    const { db, itemId, ownerId } = await setup({ requests: [] });
    const otherDefinitionId = createId();
    await db.insert(customWidgetDefinitions).values({
      id: otherDefinitionId,
      name: "Other",
      url: "https://example.com/api",
      method: "GET",
      authType: "none",
      displayType: "customJsx",
      displayConfig: stringifySuperJson({
        type: "customJsx",
        jsxApiVersion: 2,
        template: "<Text />",
        networkScope: "public",
        requests: [queryRequest],
      }),
      creatorId: ownerId,
    });
    const caller = customApiRouter.createCaller({ db, deviceType: undefined, session: null });

    await expect(
      caller.queryRequest({ itemId, requestId: "status", params: { name: "homarr" } }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.executeRequest).not.toHaveBeenCalled();
  });

  test("rejects mismatched request kinds and typed parameters", async () => {
    const { db, itemId } = await setup();
    const caller = customApiRouter.createCaller({ db, deviceType: undefined, session: null });

    await expect(caller.queryRequest({ itemId, requestId: "toggle", params: { enabled: true } })).rejects.toMatchObject(
      { code: "NOT_FOUND" },
    );
    await expect(caller.queryRequest({ itemId, requestId: "status", params: { name: 42 } })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(mocks.executeRequest).not.toHaveBeenCalled();
  });

  test("rejects disabled definitions before any network request", async () => {
    const { db, itemId, definitionId } = await setup();
    await db
      .update(customWidgetDefinitions)
      .set({ enabled: false })
      .where(eq(customWidgetDefinitions.id, definitionId));
    const caller = customApiRouter.createCaller({ db, deviceType: undefined, session: null });

    await expect(caller.getData({ itemId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.executeRequest).not.toHaveBeenCalled();
  });

  test("requires modify permission for named actions", async () => {
    const { db, itemId } = await setup();
    const viewerId = createId();
    await db.insert(users).values({ id: viewerId });
    const caller = customApiRouter.createCaller({ db, deviceType: undefined, session: createSession(viewerId) });

    await expect(
      caller.executeAction({ itemId, requestId: "toggle", params: { enabled: true } }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.executeRequest).not.toHaveBeenCalled();
  });

  test("executes an authorized named action once with typed body substitution", async () => {
    const { db, itemId, boardId } = await setup({ isPublic: false });
    const editorId = createId();
    await db.insert(users).values({ id: editorId });
    await db.insert(boardUserPermissions).values({ boardId, userId: editorId, permission: "modify" });
    const caller = customApiRouter.createCaller({ db, deviceType: undefined, session: createSession(editorId) });

    const result = await caller.executeAction({ itemId, requestId: "toggle", params: { enabled: true } });

    expect(result.ok).toBe(true);
    expect(mocks.executeRequest).toHaveBeenCalledOnce();
    expect(mocks.executeRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: "POST", body: '{"enabled":true}' }),
    );
  });

  test("requires explicit confirmation before DELETE", async () => {
    const { db, itemId, ownerId } = await setup({ isPublic: false });
    const caller = customApiRouter.createCaller({ db, deviceType: undefined, session: createSession(ownerId) });

    await expect(caller.executeAction({ itemId, requestId: "delete", params: {} })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    expect(mocks.executeRequest).not.toHaveBeenCalled();
  });
});
