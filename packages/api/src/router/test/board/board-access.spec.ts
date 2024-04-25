import { describe, expect, test } from "vitest";

import type { Session } from "@homarr/auth";
import { createId, eq } from "@homarr/db";
import { boardPermissions, boards, users } from "@homarr/db/schema/sqlite";
import { createDb } from "@homarr/db/test";

import { throwIfActionForbiddenAsync } from "../../board/board-access";

const defaultCreatorId = createId();
const defaultSession = {
  user: { id: defaultCreatorId },
  expires: new Date().toISOString(),
} satisfies Session;

const expectActToBe = async (act: () => Promise<void>, success: boolean) => {
  if (!success) {
    await expect(act()).rejects.toThrow("Board not found");
    return;
  }

  await expect(act()).resolves.toBeUndefined();
};

// TODO: most of this test can be used for constructBoardPermissions
// TODO: the tests for the board-access can be reduced to about 4 tests (as the unit has shrunk)
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
      const act = () =>
        throwIfActionForbiddenAsync(
          { db, session: null },
          eq(boards.id, boardId),
          permission,
        );

      // Assert
      await expectActToBe(act, expectedResult);
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
      const act = () =>
        throwIfActionForbiddenAsync(
          { db, session: null },
          eq(boards.id, boardId),
          permission,
        );

      // Assert
      await expectActToBe(act, false);
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
      const act = () =>
        throwIfActionForbiddenAsync(
          { db, session: defaultSession },
          eq(boards.id, boardId),
          permission,
        );

      // Assert
      await expectActToBe(act, true);
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
    const act = () =>
      throwIfActionForbiddenAsync(
        { db, session: defaultSession },
        eq(boards.id, boardId),
        "full-access",
      );

    // Assert
    await expectActToBe(act, false);
  });

  test.each([["board-view" as const], ["board-change" as const]])(
    "with permission %s should return true when board-view is required",
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
      const act = () =>
        throwIfActionForbiddenAsync(
          { db, session: defaultSession },
          eq(boards.id, boardId),
          "board-view",
        );

      // Assert
      await expectActToBe(act, true);
    },
  );

  test.each([
    ["board-view" as const, false],
    ["board-change" as const, true],
  ])(
    "with permission %s permission should return %s when board-change is required",
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
      const act = () =>
        throwIfActionForbiddenAsync(
          { db, session: defaultSession },
          eq(boards.id, boardId),

          "board-change",
        );

      // Assert
      await expectActToBe(act, expectedResult);
    },
  );
});
