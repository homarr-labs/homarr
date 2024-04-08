import { describe, expect, test } from "vitest";

import type { Session } from "@homarr/auth";
import { createId, eq } from "@homarr/db";
import { boardPermissions, boards, users } from "@homarr/db/schema/sqlite";
import { createDb } from "@homarr/db/test";

import { canAccessBoardAsync } from "../../board/board-access";

const defaultCreatorId = createId();
const defaultSession = {
  user: { id: defaultCreatorId },
  expires: new Date().toISOString(),
} satisfies Session;

describe("canAccessBoardAsync should check access to board and return boolean", () => {
  test.each([
    ["full-access" as const, false],
    ["board-change" as const, false],
    ["board-view" as const, true],
  ])(
    "with permission %s should return %s for public boards",
    async (permission, expectedResult) => {
      // Arrange
      const db = createDb();
      await db.insert(users).values({ id: defaultCreatorId });
      const boardId = createId();
      await db.insert(boards).values({
        id: boardId,
        name: "test",
        isPublic: true,
        creatorId: defaultCreatorId,
      });

      // Act
      const result = await canAccessBoardAsync(
        db,
        eq(boards.id, boardId),
        null,
        permission,
      );

      // Assert
      expect(result).toBe(expectedResult);
    },
  );

  test.each([
    ["full-access" as const],
    ["board-change" as const],
    ["board-view" as const],
  ])(
    "with permission %s should return false for private boards when user is not logged in",
    async (permission) => {
      // Arrange
      const db = createDb();
      await db.insert(users).values({ id: defaultCreatorId });
      const boardId = createId();
      await db.insert(boards).values({
        id: boardId,
        name: "test",
        isPublic: false,
        creatorId: defaultCreatorId,
      });

      // Act
      const result = await canAccessBoardAsync(
        db,
        eq(boards.id, boardId),
        null,
        permission,
      );

      // Assert
      expect(result).toBe(false);
    },
  );

  test.each([
    ["full-access" as const],
    ["board-change" as const],
    ["board-view" as const],
  ])(
    "with permission %s should return true for private boards when user is the creator",
    async (permission) => {
      // Arrange
      const db = createDb();
      await db.insert(users).values({ id: defaultCreatorId });
      const boardId = createId();
      await db.insert(boards).values({
        id: boardId,
        name: "test",
        isPublic: false,
        creatorId: defaultCreatorId,
      });

      // Act
      const result = await canAccessBoardAsync(
        db,
        eq(boards.id, boardId),
        defaultSession,
        permission,
      );

      // Assert
      expect(result).toBe(true);
    },
  );

  test("with creator should return false for full-access permission", async () => {
    // Arrange
    const db = createDb();
    const userId = createId();
    await db.insert(users).values({ id: userId });
    await db.insert(users).values({ id: defaultCreatorId });
    const boardId = createId();
    await db.insert(boards).values({
      id: boardId,
      name: "test",
      isPublic: false,
      creatorId: userId,
    });

    // Act
    const result = await canAccessBoardAsync(
      db,
      eq(boards.id, boardId),
      defaultSession,
      "full-access",
    );

    // Assert
    expect(result).toBe(false);
  });

  test.each([["board-view" as const], ["board-change" as const]])(
    `with permission %s should return true when board-view is required`,
    async (permission) => {
      // Arrange
      const db = createDb();
      const userId = createId();
      await db.insert(users).values({ id: userId });
      await db.insert(users).values({ id: defaultCreatorId });
      const boardId = createId();
      await db.insert(boards).values({
        id: boardId,
        name: "test",
        isPublic: false,
        creatorId: userId,
      });
      await db.insert(boardPermissions).values({
        boardId,
        userId: defaultCreatorId,
        permission,
      });

      // Act
      const result = await canAccessBoardAsync(
        db,
        eq(boards.id, boardId),
        defaultSession,
        "board-view",
      );

      // Assert
      expect(result).toBe(true);
    },
  );

  test.each([
    ["board-view" as const, false],
    ["board-change" as const, true],
  ])(
    `with permission %s permission should return %s when board-change is required`,
    async (permission, expectedResult) => {
      // Arrange
      const db = createDb();
      const userId = createId();
      await db.insert(users).values({ id: userId });
      await db.insert(users).values({ id: defaultCreatorId });
      const boardId = createId();
      await db.insert(boards).values({
        id: boardId,
        name: "test",
        isPublic: false,
        creatorId: userId,
      });
      await db.insert(boardPermissions).values({
        boardId,
        userId: defaultCreatorId,
        permission,
      });

      // Act
      const result = await canAccessBoardAsync(
        db,
        eq(boards.id, boardId),
        defaultSession,
        "board-change",
      );

      // Assert
      expect(result).toBe(expectedResult);
    },
  );
});
