import { createOpenApiFetchHandler } from "trpc-to-openapi";
import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { boards, layouts, sections, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { GroupPermissionKey } from "@homarr/definitions";

import { openApiRouter } from "../open-api";

vi.mock("@homarr/auth", () => ({
  hashPasswordAsync: (password: string) => Promise.resolve(`hashed.${password}`),
}));

const ownerId = createId();
const strangerId = createId();

const createSession = (userId: string, permissions: GroupPermissionKey[]): Session => ({
  user: { id: userId, permissions, colorScheme: "light" },
  expires: new Date(Date.now() + 100_000).toISOString(),
});

/** Sends a request through the same adapter the /api route uses in production */
const callAsync = async (
  db: Database,
  session: Session | null,
  method: string,
  path: string,
  body?: unknown,
): Promise<number> => {
  const request = new Request(`http://localhost:7575${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const response = await createOpenApiFetchHandler({
    req: request,
    endpoint: "/",
    router: openApiRouter,
    createContext: () => ({ session, db, deviceType: undefined }),
  });

  return response.status;
};

/** A private board owned by someone else than the caller under test */
const createPrivateBoardAsync = async () => {
  const db = createDb();
  const boardId = createId();

  await db.insert(users).values([{ id: ownerId }, { id: strangerId }]);
  await db.insert(boards).values({ id: boardId, name: "private", creatorId: ownerId, isPublic: false });
  await db.insert(sections).values({ id: createId(), boardId, kind: "empty", xOffset: 0, yOffset: 0 });
  await db.insert(layouts).values({ id: createId(), boardId, name: "Base", columnCount: 12, breakpoint: 0 });

  return { db, boardId };
};

describe("board endpoints should not leak boards the caller cannot see", () => {
  // Homarr answers with 404 instead of 403 here on purpose, so the existence of a board
  // is not observable for someone without access
  const publicReadEndpoints = ["", "/items", "/sections", "/layouts", "/export"];
  const readEndpoints = [...publicReadEndpoints, "/permissions"];

  test.each(publicReadEndpoints)(
    "GET /api/boards/{id}%s should hide the board from anonymous callers",
    async (suffix) => {
      const { db, boardId } = await createPrivateBoardAsync();

      expect(await callAsync(db, null, "GET", `/api/boards/${boardId}${suffix}`)).toBe(404);
    },
  );

  test("reading the access list of a board should require a session", async () => {
    const { db, boardId } = await createPrivateBoardAsync();

    expect(await callAsync(db, null, "GET", `/api/boards/${boardId}/permissions`)).toBe(401);
  });

  test.each(readEndpoints)("GET /api/boards/{id}%s should hide the board from other users", async (suffix) => {
    const { db, boardId } = await createPrivateBoardAsync();
    const stranger = createSession(strangerId, []);

    expect(await callAsync(db, stranger, "GET", `/api/boards/${boardId}${suffix}`)).toBe(404);
  });

  test("the owner should still be able to read the board", async () => {
    const { db, boardId } = await createPrivateBoardAsync();
    const owner = createSession(ownerId, []);

    for (const suffix of readEndpoints) {
      expect(await callAsync(db, owner, "GET", `/api/boards/${boardId}${suffix}`)).toBe(200);
    }
  });
});

describe("board mutations should require access to the board", () => {
  test("anonymous callers should not be able to change a board", async () => {
    const { db, boardId } = await createPrivateBoardAsync();

    expect(await callAsync(db, null, "POST", "/api/boards/items", { boardId, kind: "clock" })).toBe(401);
    expect(await callAsync(db, null, "POST", `/api/boards/${boardId}/sections`, { kind: "empty" })).toBe(401);
    expect(await callAsync(db, null, "PUT", `/api/boards/${boardId}/layouts`, { layouts: [] })).toBe(401);
    expect(await callAsync(db, null, "POST", "/api/boards/import", { name: "x", layouts: [], sections: [] })).toBe(401);
  });

  test("a user without access should not be able to change the board of someone else", async () => {
    const { db, boardId } = await createPrivateBoardAsync();
    const stranger = createSession(strangerId, ["board-create"]);
    const itemId = createId();
    const sectionId = createId();

    // Every handler checks the board itself, so each one is covered rather than only the first
    expect(await callAsync(db, stranger, "POST", "/api/boards/items", { boardId, kind: "clock" })).toBe(404);
    expect(await callAsync(db, stranger, "PATCH", `/api/boards/${boardId}/items/${itemId}`, { width: 2 })).toBe(404);
    expect(await callAsync(db, stranger, "DELETE", `/api/boards/${boardId}/items/${itemId}`)).toBe(404);
    expect(await callAsync(db, stranger, "POST", `/api/boards/${boardId}/sections`, { kind: "empty" })).toBe(404);
    expect(await callAsync(db, stranger, "PATCH", `/api/boards/${boardId}/sections/${sectionId}`, { name: "x" })).toBe(
      404,
    );
    expect(await callAsync(db, stranger, "DELETE", `/api/boards/${boardId}/sections/${sectionId}`)).toBe(404);
    expect(await callAsync(db, stranger, "PUT", `/api/boards/${boardId}/layouts`, { layouts: [] })).toBe(404);
    expect(await callAsync(db, stranger, "PUT", `/api/boards/${boardId}/permissions/users`, { permissions: [] })).toBe(
      404,
    );
    expect(await callAsync(db, stranger, "PUT", `/api/boards/${boardId}/permissions/groups`, { permissions: [] })).toBe(
      404,
    );
  });

  test("creating a board should require the board-create permission", async () => {
    const { db } = await createPrivateBoardAsync();
    const stranger = createSession(strangerId, []);

    expect(await callAsync(db, stranger, "POST", "/api/boards", { name: "new", columnCount: 6, isPublic: false })).toBe(
      403,
    );
    expect(
      await callAsync(db, stranger, "POST", "/api/boards/import", { name: "new", layouts: [], sections: [] }),
    ).toBe(403);
  });
});

describe("service endpoints should require their permission", () => {
  const createInstanceAsync = async () => {
    const db = createDb();
    await db.insert(users).values({ id: strangerId });
    return db;
  };

  test("anonymous callers should be rejected", async () => {
    const db = await createInstanceAsync();

    expect(await callAsync(db, null, "GET", "/api/config/export")).toBe(401);
    expect(await callAsync(db, null, "POST", "/api/config/import", { version: 1 })).toBe(401);
    expect(await callAsync(db, null, "GET", "/api/settings")).toBe(401);
    expect(await callAsync(db, null, "GET", "/api/groups")).toBe(401);
    expect(await callAsync(db, null, "GET", "/api/apikeys")).toBe(401);
    expect(await callAsync(db, null, "GET", "/api/integrations")).toBe(401);
    expect(await callAsync(db, null, "GET", "/api/search-engines")).toBe(401);
  });

  test("a signed in user without permissions should be rejected", async () => {
    const db = await createInstanceAsync();
    const stranger = createSession(strangerId, []);

    expect(await callAsync(db, stranger, "GET", "/api/config/export")).toBe(403);
    expect(await callAsync(db, stranger, "POST", "/api/config/import", { version: 1 })).toBe(403);
    expect(await callAsync(db, stranger, "GET", "/api/settings")).toBe(403);
    expect(await callAsync(db, stranger, "PATCH", "/api/settings", { settingsKey: "board", value: {} })).toBe(403);
    expect(await callAsync(db, stranger, "GET", "/api/groups")).toBe(403);
    expect(await callAsync(db, stranger, "POST", "/api/groups", { name: "x" })).toBe(403);
    expect(await callAsync(db, stranger, "GET", "/api/apikeys")).toBe(403);
    expect(await callAsync(db, stranger, "POST", "/api/apikeys")).toBe(403);
    expect(
      await callAsync(db, stranger, "POST", "/api/search-engines", {
        name: "x",
        short: "x",
        iconUrl: "https://example.com/x.svg",
        description: null,
        type: "generic",
        urlTemplate: "https://example.com/?q=%s",
      }),
    ).toBe(403);
  });

  test("a signed in user should be able to list integrations and search engines", async () => {
    const db = await createInstanceAsync();
    const stranger = createSession(strangerId, []);

    // Both are protected rather than permission gated, the results are filtered instead
    expect(await callAsync(db, stranger, "GET", "/api/integrations")).toBe(200);
    expect(await callAsync(db, stranger, "GET", "/api/search-engines")).toBe(200);
  });
});
