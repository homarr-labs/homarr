import { createOpenApiFetchHandler } from "trpc-to-openapi";
import { expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { GroupPermissionKey } from "@homarr/definitions";

import { openApiRouter } from "../open-api";

vi.mock("@homarr/auth", () => ({
  hashPasswordAsync: (password: string) => Promise.resolve(`hashed.${password}`),
}));

const userId = createId();

// Permissions are checked as a flat list, so the implied children have to be listed as well
const session = {
  user: {
    id: userId,
    permissions: [
      "admin",
      "app-create",
      "board-create",
      "search-engine-create",
      "search-engine-modify-all",
      "search-engine-full-all",
    ] satisfies GroupPermissionKey[],
    colorScheme: "light",
  },
  expires: new Date(Date.now() + 100_000).toISOString(),
} satisfies Session;

interface ApiResponse {
  status: number;
  // The responses are only read inside assertions, describing every shape again adds no value
  // oxlint-disable-next-line typescript/no-explicit-any
  body: any;
}

/** Sends a real request through the OpenAPI adapter, which is what the /api route does in production */
const createClient =
  (db: Database) =>
  async (method: string, path: string, body?: unknown): Promise<ApiResponse> => {
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

    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : undefined };
  };

const createDbWithUserAsync = async () => {
  const db = createDb();
  await db.insert(users).values({ id: userId, name: "admin" });
  return db;
};

test("board composition endpoints should work over http", async () => {
  const callAsync = createClient(await createDbWithUserAsync());

  const created = await callAsync("POST", "/api/boards", { name: "http-board", columnCount: 6, isPublic: true });
  expect(created.status).toBe(200);
  const boardId: string = created.body.boardId;

  // Widen the grid so an item wider than the initial six columns fits
  const layouts = await callAsync("PUT", `/api/boards/${boardId}/layouts`, {
    layouts: [{ id: "base-reference", name: "Base", columnCount: 12, breakpoint: 0 }],
  });
  expect(layouts.status).toBe(200);
  expect(layouts.body).toHaveLength(1);
  expect(layouts.body[0].columnCount).toBe(12);

  const item = await callAsync("POST", "/api/boards/items", {
    boardId,
    kind: "clock",
    options: { is24HourFormat: true },
    width: 10,
    height: 4,
    xOffset: 1,
    yOffset: 2,
  });
  expect(item.status).toBe(200);
  const itemId: string = item.body.itemId;

  const board = await callAsync("GET", `/api/boards/${boardId}`);
  expect(board.status).toBe(200);
  expect(board.body.items[0].layouts[0]).toMatchObject({ xOffset: 1, yOffset: 2, width: 10, height: 4 });

  expect((await callAsync("PATCH", `/api/boards/${boardId}/items/${itemId}`, { width: 12, xOffset: 0 })).status).toBe(
    200,
  );
  const afterPatch = await callAsync("GET", `/api/boards/${boardId}/items`);
  expect(afterPatch.body[0].layouts[0]).toMatchObject({ xOffset: 0, yOffset: 2, width: 12, height: 4 });

  const collision = await callAsync("POST", "/api/boards/items", {
    boardId,
    kind: "clock",
    xOffset: 0,
    yOffset: 3,
    width: 2,
    height: 2,
  });
  expect(collision.status).toBe(400);

  const exported = await callAsync("GET", `/api/boards/${boardId}/export`);
  expect(exported.status).toBe(200);
  const imported = await callAsync("POST", "/api/boards/import", { ...exported.body, name: "http-copy" });
  expect(imported.status).toBe(200);
  const copy = await callAsync("GET", `/api/boards/${imported.body.boardId}`);
  expect(copy.body.items[0].layouts[0]).toMatchObject({ xOffset: 0, yOffset: 2, width: 12, height: 4 });

  const section = await callAsync("POST", `/api/boards/${boardId}/sections`, {
    kind: "category",
    name: "Media",
    yOffset: 1,
  });
  expect(section.status).toBe(200);
  expect(await callAsync("GET", `/api/boards/${boardId}/sections`).then(({ body }) => body)).toHaveLength(2);
  expect((await callAsync("DELETE", `/api/boards/${boardId}/sections/${section.body.sectionId}`)).status).toBe(200);

  expect((await callAsync("DELETE", `/api/boards/${boardId}/items/${itemId}`)).status).toBe(200);
  expect(await callAsync("GET", `/api/boards/${boardId}/items`).then(({ body }) => body)).toHaveLength(0);
});

test("board access can be granted without the web interface", async () => {
  const callAsync = createClient(await createDbWithUserAsync());

  const board = await callAsync("POST", "/api/boards", { name: "private-board", columnCount: 6, isPublic: false });
  const boardId: string = board.body.boardId;

  const group = await callAsync("POST", "/api/groups", { name: "viewers" });
  const groupId: string = group.body;

  const granted = await callAsync("PUT", `/api/boards/${boardId}/permissions/groups`, {
    permissions: [{ principalId: groupId, permission: "view" }],
  });
  expect(granted.status).toBe(200);

  const permissions = await callAsync("GET", `/api/boards/${boardId}/permissions`);
  expect(permissions.status).toBe(200);
  expect(permissions.body.groups).toStrictEqual([{ group: { id: groupId, name: "viewers" }, permission: "view" }]);

  // Revoking works by sending the remaining permissions
  expect((await callAsync("PUT", `/api/boards/${boardId}/permissions/groups`, { permissions: [] })).status).toBe(200);
  expect(await callAsync("GET", `/api/boards/${boardId}/permissions`).then(({ body }) => body.groups)).toHaveLength(0);
});

test("configuration export and import should work over http", async () => {
  const sourceCallAsync = createClient(await createDbWithUserAsync());

  await sourceCallAsync("POST", "/api/apps", {
    name: "Sonarr",
    iconUrl: "https://example.com/sonarr.svg",
    description: null,
    href: null,
    pingUrl: null,
  });
  const board = await sourceCallAsync("POST", "/api/boards", {
    name: "homelab",
    columnCount: 12,
    isPublic: true,
  });
  await sourceCallAsync("POST", "/api/boards/items", {
    boardId: board.body.boardId,
    kind: "clock",
    width: 4,
    height: 2,
  });

  const exported = await sourceCallAsync("GET", "/api/config/export");
  expect(exported.status).toBe(200);
  expect(exported.body.version).toBe(1);
  expect(exported.body.apps).toHaveLength(1);
  expect(exported.body.boards).toHaveLength(1);

  const targetCallAsync = createClient(await createDbWithUserAsync());
  const imported = await targetCallAsync("POST", "/api/config/import", exported.body);
  expect(imported.status).toBe(200);
  expect(imported.body.created).toMatchObject({ apps: 1, boards: 1 });

  // Ids are preserved, so the board can be addressed with the id from the source instance
  const copy = await targetCallAsync("GET", `/api/boards/${board.body.boardId}`);
  expect(copy.status).toBe(200);
  expect(copy.body.items[0].layouts[0]).toMatchObject({ width: 4, height: 2 });

  // Applying the same document twice conflicts unless a strategy is given
  expect((await targetCallAsync("POST", "/api/config/import", exported.body)).status).toBe(409);
  const skipped = await targetCallAsync("POST", "/api/config/import", { ...exported.body, onConflict: "skip" });
  expect(skipped.status).toBe(200);
  expect(skipped.body.created).toStrictEqual({});
});

test("service endpoints should work over http", async () => {
  const callAsync = createClient(await createDbWithUserAsync());

  const created = await callAsync("POST", "/api/search-engines", {
    name: "Kagi",
    short: "k",
    iconUrl: "https://example.com/icon.svg",
    description: null,
    type: "generic",
    urlTemplate: "https://kagi.com/search?q=%s",
  });
  expect(created.status).toBe(200);
  const searchEngineId: string = created.body.id;

  const byId = await callAsync("GET", `/api/search-engines/${searchEngineId}`);
  expect(byId.status).toBe(200);
  expect(byId.body.urlTemplate).toBe("https://kagi.com/search?q=%s");

  // Generic search engines require a url template
  const invalid = await callAsync("POST", "/api/search-engines", {
    name: "Broken",
    short: "b",
    iconUrl: "https://example.com/icon.svg",
    description: null,
    type: "generic",
  });
  expect(invalid.status).toBe(400);

  const invalidScheme = await callAsync("POST", "/api/search-engines", {
    name: "Broken scheme",
    short: "bs",
    iconUrl: "https://example.com/icon.svg",
    description: null,
    type: "generic",
    urlTemplate: "httpx://example.com/%s",
  });
  expect(invalidScheme.status).toBe(400);

  // Integration backed engines require an integration
  const withoutIntegration = await callAsync("POST", "/api/search-engines", {
    name: "Broken",
    short: "b",
    iconUrl: "https://example.com/icon.svg",
    description: null,
    type: "fromIntegration",
  });
  expect(withoutIntegration.status).toBe(400);

  // The management forms submit the whole row, so the property of the other type arrives as
  // null and a field that was never filled in arrives as an empty string
  const asTheFormSubmits = await callAsync("PATCH", `/api/search-engines/${searchEngineId}`, {
    id: searchEngineId,
    name: "Kagi",
    iconUrl: "https://example.com/icon.svg",
    description: null,
    type: "generic",
    urlTemplate: "https://kagi.com/search?q=%s",
    integrationId: null,
  });
  expect(asTheFormSubmits.status).toBe(200);

  const list = await callAsync("GET", "/api/search-engines?page=1&pageSize=10");
  expect(list.status).toBe(200);
  expect(list.body.totalCount).toBe(1);
  expect((await callAsync("DELETE", `/api/search-engines/${searchEngineId}`)).status).toBe(200);

  const group = await callAsync("POST", "/api/groups", { name: "automation" });
  expect(group.status).toBe(200);
  const groupId: string = group.body;

  expect((await callAsync("PUT", `/api/groups/${groupId}/permissions`, { permissions: ["board-create"] })).status).toBe(
    200,
  );
  expect(await callAsync("GET", `/api/groups/${groupId}`).then(({ body }) => body.permissions)).toStrictEqual([
    "board-create",
  ]);

  const apiKey = await callAsync("POST", "/api/apikeys");
  expect(apiKey.status).toBe(200);
  expect(apiKey.body.apiKey).toMatch(/^[a-z0-9]+\./);
  expect(await callAsync("GET", "/api/apikeys").then(({ body }) => body)).toHaveLength(1);

  expect((await callAsync("GET", "/api/integration-kinds")).status).toBe(200);
  expect(await callAsync("GET", "/api/integrations").then(({ body }) => body)).toStrictEqual([]);
  expect((await callAsync("GET", "/api/settings")).status).toBe(200);
});
