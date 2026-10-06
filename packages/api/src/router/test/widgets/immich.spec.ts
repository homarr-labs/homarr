// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { integrations, integrationUserPermissions, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { immichRouter } from "../../widgets/immich";

vi.hoisted(() => {
  process.env.SKIP_ENV_VALIDATION = "true";
});

const mocks = vi.hoisted(() => ({
  albumsHandler: vi.fn(),
}));

vi.mock("@homarr/request-handler/immich", () => ({
  immichAlbumRequestHandler: { handler: vi.fn() },
  immichStatsRequestHandler: { handler: vi.fn() },
  immichAlbumsRequestHandler: {
    handler: (_integration: unknown, input: unknown) => {
      mocks.albumsHandler(input);
      return { getDataAsync: async () => ({ data: [], timestamp: new Date() }) };
    },
  },
}));

const createSession = (userId: string): Session => ({
  user: { id: userId, permissions: [], colorScheme: "light" },
  expires: new Date().toISOString(),
});

const createCallerAsync = async () => {
  const db = createDb();
  const userId = createId();
  const integrationId = createId();
  await db.insert(users).values({ id: userId });
  await db.insert(integrations).values({
    id: integrationId,
    kind: "immich",
    name: "Immich",
    url: "https://immich.example.com",
  });
  await db.insert(integrationUserPermissions).values({ integrationId, userId, permission: "use" });

  return {
    integrationId,
    caller: immichRouter.createCaller({ db: db as Database, deviceType: undefined, session: createSession(userId) }),
  };
};

describe("immichRouter.getAlbums", () => {
  beforeEach(() => vi.clearAllMocks());

  test("passes a validated limit to the cached request handler", async () => {
    const { caller, integrationId } = await createCallerAsync();

    await caller.getAlbums({ integrationId, limit: 50 });

    expect(mocks.albumsHandler).toHaveBeenCalledWith({ limit: 50 });
    await expect(caller.getAlbums({ integrationId, limit: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.getAlbums({ integrationId, limit: 501 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  test("keeps the limit optional for unbounded callers", async () => {
    const { caller, integrationId } = await createCallerAsync();

    await caller.getAlbums({ integrationId });

    expect(mocks.albumsHandler).toHaveBeenCalledWith({ limit: undefined });
  });
});
