// @vitest-environment node

import { stringify } from "superjson";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { eq } from "@homarr/db";
import { boards, boardUserPermissions, customWidgetDefinitions, items, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { GroupPermissionKey } from "@homarr/definitions";

import { customWidgetRouter } from "../custom-widget/custom-widget-router";
import { customApiRouter } from "../widgets/custom-api";

const createSession = (userId: string, permissions: GroupPermissionKey[] = []): Session => ({
  user: { id: userId, permissions, colorScheme: "light" },
  expires: new Date().toISOString(),
});

const createCustomWidgetCaller = (db: Database, session: Session | null) =>
  customWidgetRouter.createCaller({ db, deviceType: undefined, session });

const createCustomApiCaller = (db: Database, session: Session | null) =>
  customApiRouter.createCaller({ db, deviceType: undefined, session });

async function createFixtureAsync(db: Database) {
  const ownerId = createId();
  const viewerId = createId();
  const modifierId = createId();
  const unrelatedId = createId();
  const adminId = createId();
  const boardId = createId();
  const itemId = createId();
  const definitionId = createId();

  await db.insert(users).values(
    [ownerId, viewerId, modifierId, unrelatedId, adminId].map((id) => ({
      id,
      name: id,
    })),
  );
  await db.insert(boards).values({ id: boardId, name: `board-${boardId}`, creatorId: ownerId, isPublic: false });
  await db.insert(boardUserPermissions).values([
    { boardId, userId: viewerId, permission: "view" },
    { boardId, userId: modifierId, permission: "modify" },
  ]);
  await db.insert(customWidgetDefinitions).values({
    id: definitionId,
    name: "Restart service",
    description: "Restarts a service",
    url: "https://api.example.com/restart",
    method: "POST",
    displayType: "actionButton",
    displayConfig: stringify({
      type: "actionButton",
      buttonLabel: "Restart",
      confirmText: "Continue?",
    }),
    creatorId: adminId,
  });
  await db.insert(items).values({
    id: itemId,
    boardId,
    kind: "customApi",
    options: stringify({ definitionId, refreshInterval: 30 }),
  });

  return { ownerId, viewerId, modifierId, unrelatedId, adminId, boardId, itemId, definitionId };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("custom widget definition authorization", () => {
  it("restricts the full definition list to administrators", async () => {
    const db = createDb();
    const fixture = await createFixtureAsync(db);

    await expect(createCustomWidgetCaller(db, null).all()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    for (const userId of [fixture.ownerId, fixture.viewerId, fixture.modifierId, fixture.unrelatedId]) {
      await expect(createCustomWidgetCaller(db, createSession(userId)).all()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    }

    await expect(createCustomWidgetCaller(db, createSession(fixture.adminId, ["admin"])).all()).resolves.toEqual([
      expect.objectContaining({ id: fixture.definitionId, url: "https://api.example.com/restart" }),
    ]);
  });

  it("returns only safe definition summaries to board modifiers", async () => {
    const db = createDb();
    const fixture = await createFixtureAsync(db);

    const result = await createCustomWidgetCaller(db, createSession(fixture.modifierId)).available({
      boardId: fixture.boardId,
    });
    expect(result).toEqual([
      {
        id: fixture.definitionId,
        name: "Restart service",
        description: "Restarts a service",
        iconUrl: null,
        displayType: "actionButton",
        enabled: true,
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("api.example.com");

    for (const userId of [fixture.viewerId, fixture.unrelatedId]) {
      await expect(
        createCustomWidgetCaller(db, createSession(userId)).available({ boardId: fixture.boardId }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
  });
});

describe("custom widget action authorization", () => {
  it("requires an administrator even for users who can view or modify the board", async () => {
    const db = createDb();
    const fixture = await createFixtureAsync(db);
    const input = {
      boardId: fixture.boardId,
      itemId: fixture.itemId,
      definitionId: fixture.definitionId,
    };

    await expect(createCustomWidgetCaller(db, null).execute(input)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    for (const userId of [fixture.ownerId, fixture.viewerId, fixture.modifierId, fixture.unrelatedId]) {
      await expect(createCustomWidgetCaller(db, createSession(userId)).execute(input)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    }
  });

  it("executes for an administrator only when board, item, and definition are bound", async () => {
    const db = createDb();
    const fixture = await createFixtureAsync(db);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const caller = createCustomWidgetCaller(db, createSession(fixture.adminId, ["admin"]));

    await expect(
      caller.execute({
        boardId: fixture.boardId,
        itemId: fixture.itemId,
        definitionId: fixture.definitionId,
      }),
    ).resolves.toEqual({ success: true, responseInfo: { status: 204 } });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/restart",
      expect.objectContaining({ method: "POST", redirect: "error", signal: expect.any(AbortSignal) }),
    );
  });

  it.each(["board", "item", "definition"] as const)("rejects a mismatched %s binding", async (mismatch) => {
    const db = createDb();
    const fixture = await createFixtureAsync(db);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const input = {
      boardId: mismatch === "board" ? createId() : fixture.boardId,
      itemId: mismatch === "item" ? createId() : fixture.itemId,
      definitionId: mismatch === "definition" ? createId() : fixture.definitionId,
    };

    await expect(
      createCustomWidgetCaller(db, createSession(fixture.adminId, ["admin"])).execute(input),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects disabled definitions before sending a request", async () => {
    const db = createDb();
    const fixture = await createFixtureAsync(db);
    await db
      .update(customWidgetDefinitions)
      .set({ enabled: false })
      .where(eq(customWidgetDefinitions.id, fixture.definitionId));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createCustomWidgetCaller(db, createSession(fixture.adminId, ["admin"])).execute({
        boardId: fixture.boardId,
        itemId: fixture.itemId,
        definitionId: fixture.definitionId,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("custom API outbound request hardening", () => {
  it("rejects credential-bearing action URLs without exposing the credential", async () => {
    const db = createDb();
    const fixture = await createFixtureAsync(db);
    await db
      .update(customWidgetDefinitions)
      .set({ url: "https://operator:super-secret@private.example.com/restart" })
      .where(eq(customWidgetDefinitions.id, fixture.definitionId));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await createCustomWidgetCaller(db, createSession(fixture.adminId, ["admin"])).execute({
      boardId: fixture.boardId,
      itemId: fixture.itemId,
      definitionId: fixture.definitionId,
    });
    expect(result).toEqual({ success: false, errorCode: "REQUEST_FAILED", responseInfo: null });
    expect(JSON.stringify(result)).not.toMatch(/super-secret|private\.example\.com/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects redirects and redacts fetch errors", async () => {
    const db = createDb();
    const fixture = await createFixtureAsync(db);
    const fetchMock = vi
      .fn()
      .mockRejectedValue(
        new TypeError("Redirect to http://token:secret@internal.example.local/admin?apiKey=top-secret was rejected"),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createCustomWidgetCaller(db, createSession(fixture.adminId, ["admin"])).execute({
      boardId: fixture.boardId,
      itemId: fixture.itemId,
      definitionId: fixture.definitionId,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/restart",
      expect.objectContaining({ redirect: "error" }),
    );
    expect(result).toEqual({ success: false, errorCode: "REQUEST_FAILED", responseInfo: null });
    expect(JSON.stringify(result)).not.toMatch(/top-secret|internal\.example\.local|apiKey/);
  });

  it("aborts timed-out action requests and returns a stable failure", async () => {
    vi.useFakeTimers();
    const db = createDb();
    const fixture = await createFixtureAsync(db);
    const started = Promise.withResolvers<void>();
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      started.resolve();
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(new Error("Timed out calling http://internal.example.local?secret=timeout-secret"));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const request = createCustomWidgetCaller(db, createSession(fixture.adminId, ["admin"])).execute({
      boardId: fixture.boardId,
      itemId: fixture.itemId,
      definitionId: fixture.definitionId,
    });
    await started.promise;
    await vi.advanceTimersByTimeAsync(10_000);

    const result = await request;
    expect(result).toEqual({ success: false, errorCode: "REQUEST_FAILED", responseInfo: null });
    expect(JSON.stringify(result)).not.toMatch(/timeout-secret|internal\.example\.local/);
  });

  it("bounds action responses before reporting success", async () => {
    const db = createDb();
    const fixture = await createFixtureAsync(db);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("x".repeat(2 * 1024 * 1024 + 1))));

    await expect(
      createCustomWidgetCaller(db, createSession(fixture.adminId, ["admin"])).execute({
        boardId: fixture.boardId,
        itemId: fixture.itemId,
        definitionId: fixture.definitionId,
      }),
    ).resolves.toEqual({ success: false, errorCode: "REQUEST_FAILED", responseInfo: null });
  });

  it("binds data requests to a viewable item and never exposes backend error text", async () => {
    const db = createDb();
    const fixture = await createFixtureAsync(db);
    await db
      .update(customWidgetDefinitions)
      .set({
        displayType: "singleValue",
        method: "GET",
        displayConfig: stringify({ type: "singleValue", jsonPath: "$.value" }),
      })
      .where(eq(customWidgetDefinitions.id, fixture.definitionId));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Backend http://private.example.local/path?token=super-secret\nstack trace")),
    );

    const input = {
      boardId: fixture.boardId,
      itemId: fixture.itemId,
      definitionId: fixture.definitionId,
    };
    const error = await createCustomApiCaller(db, createSession(fixture.viewerId))
      .getData(input)
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: "INTERNAL_SERVER_ERROR", message: "Custom API request failed" });
    expect(JSON.stringify(error)).not.toMatch(/super-secret|private\.example\.local|stack trace/);

    await expect(createCustomApiCaller(db, createSession(fixture.unrelatedId)).getData(input)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      createCustomApiCaller(db, createSession(fixture.viewerId)).getData({ ...input, definitionId: createId() }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("bounds and disposes non-success data responses", async () => {
    const db = createDb();
    const fixture = await createFixtureAsync(db);
    await db
      .update(customWidgetDefinitions)
      .set({
        displayType: "singleValue",
        method: "GET",
        displayConfig: stringify({ type: "singleValue", jsonPath: "$.value" }),
      })
      .where(eq(customWidgetDefinitions.id, fixture.definitionId));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("x".repeat(2 * 1024 * 1024 + 1), { status: 502 })));

    const error = await createCustomApiCaller(db, createSession(fixture.viewerId))
      .getData({
        boardId: fixture.boardId,
        itemId: fixture.itemId,
        definitionId: fixture.definitionId,
      })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "INTERNAL_SERVER_ERROR", message: "Custom API request failed" });
    expect(JSON.stringify(error)).not.toContain("x".repeat(100));
  });

  it("redacts unsafe preview failures and rejects redirects", async () => {
    const db = createDb();
    const fixture = await createFixtureAsync(db);
    const fetchMock = vi.fn().mockRejectedValue(new Error("redirected to http://private.local?secret=value"));
    vi.stubGlobal("fetch", fetchMock);
    const caller = createCustomWidgetCaller(db, createSession(fixture.adminId, ["admin"]));

    const result = await caller.preview({
      url: "https://api.example.com/data",
      method: "GET",
      authType: "none",
      displayType: "singleValue",
      displayConfig: { type: "singleValue", jsonPath: "$.value", label: "Value", unit: "" },
      secrets: [],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/data",
      expect.objectContaining({ redirect: "error" }),
    );
    expect(result).toEqual({
      success: false,
      error: "Custom API preview failed",
      responseInfo: null,
      rawResponse: null,
    });
    expect(JSON.stringify(result)).not.toMatch(/private\.local|secret=value/);
  });
});
