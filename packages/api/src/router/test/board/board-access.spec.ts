import { describe, expect, test, vi } from "vitest";

import * as authShared from "@homarr/auth/shared";
import { createId, eq } from "@homarr/db";
import { boards, users } from "@homarr/db/schema/sqlite";
import { createDb } from "@homarr/db/test";

import { throwIfActionForbiddenAsync } from "../../board/board-access";

const defaultCreatorId = createId();

const expectActToBeAsync = async (
  act: () => Promise<void>,
  success: boolean,
) => {
  if (!success) {
    await expect(act()).rejects.toThrow("Board not found");
    return;
  }

  await expect(act()).resolves.toBeUndefined();
};

// TODO: most of this test can be used for constructBoardPermissions
// TODO: the tests for the board-access can be reduced to about 4 tests (as the unit has shrunk)

describe("throwIfActionForbiddenAsync should check access to board and return boolean", () => {
  test.each([
    ["full-access" as const, true],
    ["board-change" as const, true],
    ["board-view" as const, true],
  ])(
    "with permission %s should return %s when hasFullAccess is true",
    async (permission, expectedResult) => {
      // Arrange
      const db = createDb();
      const spy = vi.spyOn(authShared, "constructBoardPermissions");
      spy.mockReturnValue({
        hasFullAccess: true,
        hasChangeAccess: false,
        hasViewAccess: false,
      });

      await db.insert(users).values({ id: defaultCreatorId });
      const boardId = createId();
      await db.insert(boards).values({
        id: boardId,
        name: "test",
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
      await expectActToBeAsync(act, expectedResult);
    },
  );

  test.each([
    ["full-access" as const, false],
    ["board-change" as const, true],
    ["board-view" as const, true],
  ])(
    "with permission %s should return %s when hasChangeAccess is true",
    async (permission, expectedResult) => {
      // Arrange
      const db = createDb();
      const spy = vi.spyOn(authShared, "constructBoardPermissions");
      spy.mockReturnValue({
        hasFullAccess: false,
        hasChangeAccess: true,
        hasViewAccess: false,
      });

      await db.insert(users).values({ id: defaultCreatorId });
      const boardId = createId();
      await db.insert(boards).values({
        id: boardId,
        name: "test",
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
      await expectActToBeAsync(act, expectedResult);
    },
  );

  test.each([
    ["full-access" as const, false],
    ["board-change" as const, false],
    ["board-view" as const, true],
  ])(
    "with permission %s should return %s when hasViewAccess is true",
    async (permission, expectedResult) => {
      // Arrange
      const db = createDb();
      const spy = vi.spyOn(authShared, "constructBoardPermissions");
      spy.mockReturnValue({
        hasFullAccess: false,
        hasChangeAccess: false,
        hasViewAccess: true,
      });

      await db.insert(users).values({ id: defaultCreatorId });
      const boardId = createId();
      await db.insert(boards).values({
        id: boardId,
        name: "test",
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
      await expectActToBeAsync(act, expectedResult);
    },
  );

  test.each([
    ["full-access" as const, false],
    ["board-change" as const, false],
    ["board-view" as const, false],
  ])(
    "with permission %s should return %s when hasViewAccess is false",
    async (permission, expectedResult) => {
      // Arrange
      const db = createDb();
      const spy = vi.spyOn(authShared, "constructBoardPermissions");
      spy.mockReturnValue({
        hasFullAccess: false,
        hasChangeAccess: false,
        hasViewAccess: false,
      });

      await db.insert(users).values({ id: defaultCreatorId });
      const boardId = createId();
      await db.insert(boards).values({
        id: boardId,
        name: "test",
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
      await expectActToBeAsync(act, expectedResult);
    },
  );

  test("should throw when board is not found", async () => {
    // Arrange
    const db = createDb();

    // Act
    const act = () =>
      throwIfActionForbiddenAsync(
        { db, session: null },
        eq(boards.id, createId()),
        "full-access",
      );

    // Assert
    await expect(act()).rejects.toThrow("Board not found");
  });
});
