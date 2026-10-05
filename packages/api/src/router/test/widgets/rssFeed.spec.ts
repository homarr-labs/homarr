import SuperJSON from "superjson";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import type { InferInsertModel } from "@homarr/db";
import {
  boardGroupPermissions,
  boards,
  boardUserPermissions,
  groupMembers,
  groups,
  items,
  users,
} from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { GroupPermissionKey } from "@homarr/definitions";

import type { WidgetComponentProps } from "../../../../../widgets/src/definition";
import { canAccessAllFeedsAsync, restrictUrlsAsync, rssFeedRouter } from "../../widgets/rssFeed";

const mocks = vi.hoisted(() => ({ logger: { warn: vi.fn() }, getFeed: vi.fn() }));

vi.mock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => mocks.logger }));
vi.mock("@homarr/request-handler/rss-feeds", () => ({
  rssFeedsRequestHandler: {
    handler: (input: unknown) => ({ getDataAsync: async () => await mocks.getFeed(input) }),
  },
}));

beforeEach(() => vi.clearAllMocks());

const createSession = (permissions: GroupPermissionKey[] = []): Session => ({
  user: {
    id: "user-id",
    colorScheme: "light",
    permissions,
  },
  expires: new Date().toISOString(),
});

describe("rssFeedRouter", () => {
  describe("getFeeds", () => {
    test("redacts feed secrets from logs and returns a generic error when every feed fails", async () => {
      const feedUrl = "https://user:password@example.com/feed?token=secret";
      mocks.getFeed.mockRejectedValue(new Error(`Failed to fetch ${feedUrl}`));
      const caller = rssFeedRouter.createCaller({
        db: createDb(),
        deviceType: undefined,
        session: createSession(["board-create"]),
      });

      await expect(caller.getFeeds({ urls: [feedUrl], maximumAmountPosts: 5 })).rejects.toMatchObject({
        code: "BAD_GATEWAY",
        message: "All RSS feed requests failed",
      });
      expect(mocks.logger.warn).toHaveBeenCalledWith("RSS feed fetch failed", {
        feedIndex: 0,
        origin: "https://example.com",
        errorType: "Error",
        errorMessage: "Failed to fetch [redacted URL]",
      });
      const logged = JSON.stringify(mocks.logger.warn.mock.calls);
      expect(logged).not.toContain("password");
      expect(logged).not.toContain("token");
      expect(logged).not.toContain("secret");
    });

    test("returns successful entries and only a failure count when some feeds fail", async () => {
      const failedUrl = "https://user:password@example.com/feed?token=secret";
      mocks.getFeed.mockImplementation(async (input: { url: string }) => {
        if (input.url === failedUrl) throw new Error(`Failed to fetch ${failedUrl}`);
        return { data: { entries: [{ id: "entry" }] } };
      });
      const caller = rssFeedRouter.createCaller({
        db: createDb(),
        deviceType: undefined,
        session: createSession(["board-create"]),
      });

      const result = await caller.getFeeds({ urls: ["https://example.com/feed", failedUrl], maximumAmountPosts: 5 });

      expect(result).toEqual({ entries: [{ id: "entry" }], failedFeedCount: 1 });
      expect(JSON.stringify(result)).not.toContain("password");
      expect(JSON.stringify(result)).not.toContain("token");
      expect(JSON.stringify(result)).not.toContain("secret");
    });
  });

  describe("canAccessAllFeedsAsync", () => {
    test("should return false for unauthenticated users", async () => {
      // Arrange
      const { callback } = setupAccessCheck();

      // Act
      const result = await callback(/* session: */ null);

      // Assert
      expect(result).toBe(false);
    });
    test.each([["board-create" as const], ["board-modify-all" as const]])(
      "should return true for users with %s permission",
      async (permission) => {
        // Arrange
        const { callback } = setupAccessCheck();
        const session = createSession([permission]);

        // Act
        const result = await callback(session);

        // Assert
        expect(result).toBe(true);
      },
    );
    test("should return false for authenticated users without any boards or permissions", async () => {
      // Arrange
      const { callback, db } = setupAccessCheck();
      const session = createSession();
      await db.insert(users).values({
        id: session.user.id,
      });

      // Act
      const result = await callback(session);

      // Assert
      expect(result).toBe(false);
    });
    test("should return true for authenticated users that own at least one board", async () => {
      // Arrange
      const { callback, db } = setupAccessCheck();
      const session = createSession();
      await db.insert(users).values({
        id: session.user.id,
      });
      await db.insert(boards).values({
        id: createId(),
        name: "test",
        creatorId: session.user.id,
      });

      // Act
      const result = await callback(session);

      // Assert
      expect(result).toBe(true);
    });
    test.each([["modify" as const], ["full" as const]])(
      "should return true for authenticated users that have %s permissions on at least one board",
      async (permission) => {
        // Arrange
        const { callback, db } = setupAccessCheck();
        const session = createSession();
        await db.insert(users).values({
          id: session.user.id,
        });
        const boardId = createId();
        await db.insert(boards).values({
          id: boardId,
          name: "test",
        });
        await db.insert(boardUserPermissions).values({
          boardId,
          permission,
          userId: session.user.id,
        });

        // Act
        const result = await callback(session);

        // Assert
        expect(result).toBe(true);
      },
    );
    test.each([["modify" as const], ["full" as const]])(
      "should return true for authenticated users that have %s permissions through group on at least one board",
      async (permission) => {
        // Arrange
        const { callback, db } = setupAccessCheck();
        const session = createSession();
        await db.insert(users).values({
          id: session.user.id,
        });
        const boardId = createId();
        await db.insert(boards).values({
          id: boardId,
          name: "test",
        });
        const groupId = createId();
        await db.insert(groups).values({
          id: groupId,
          name: "test-group",
          position: 0,
        });
        await db.insert(groupMembers).values({
          groupId,
          userId: session.user.id,
        });
        await db.insert(boardGroupPermissions).values({
          boardId,
          groupId,
          permission,
        });

        // Act
        const result = await callback(session);

        // Assert
        expect(result).toBe(true);
      },
    );
  });

  describe("restrictUrlsAsync", () => {
    test("should return empty array if there are no rss feed items in the database", async () => {
      // Arrange
      const { callback } = await setupUrlRestrictionAsync([]);

      // Act
      const result = await callback(["http://example.com/feed"]);

      // Assert
      expect(result).toEqual([]);
    });

    test("should return only the URLs that are present in the database", async () => {
      // Arrange
      const { callback } = await setupUrlRestrictionAsync(["http://example.com/feed"]);

      // Act
      const result = await callback(["http://example.com/feed", "http://not-in-db.com/feed"]);

      // Assert
      expect(result).toEqual(["http://example.com/feed"]);
    });
  });
});

function setupAccessCheck() {
  const db = createDb();

  return {
    callback: (session: Session | null) => canAccessAllFeedsAsync(db, session),
    db,
  };
}

async function setupUrlRestrictionAsync(dbUrls: string[]) {
  const db = createDb();
  const boardId = createId();
  await db.insert(boards).values({
    id: boardId,
    name: "test",
  });
  if (dbUrls.length >= 1) {
    await db.insert(items).values(
      dbUrls.map(
        (url) =>
          ({
            id: createId(),
            kind: "rssFeed",
            boardId,
            options: SuperJSON.stringify({
              feedUrls: [url],
              enableRtl: false,
              hideDescription: false,
              textLinesClamp: 3,
              maximumAmountPosts: 5,
              showPosterImage: true,
            } satisfies WidgetComponentProps<"rssFeed">["options"]),
          }) satisfies InferInsertModel<typeof items>,
      ),
    );
  }

  return {
    callback: (urls: string[]) => restrictUrlsAsync(db, urls),
    db,
  };
}
