import SuperJSON from "superjson";
import { describe, expect, test } from "vitest";

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
import { canAccessAllFeedsAsync, restrictUrlsAsync } from "../../widgets/rssFeed";

const createSession = (permissions: GroupPermissionKey[] = []): Session => ({
  user: {
    id: "user-id",
    colorScheme: "light",
    permissions,
  },
  expires: new Date().toISOString(),
});

describe("rssFeedRouter", () => {
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
