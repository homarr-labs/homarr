import type { Session } from "@auth/core/types";
import { describe, expect, test } from "vitest";

import { constructBoardPermissions } from "../board-permissions";

describe("constructBoardPermissions", () => {
  test("should return all board permissions as true when session user id is equal to creator id", () => {
    // Arrange
    const board = {
      creator: {
        id: "1",
      },
      permissions: [],
      isPublic: false,
    };
    const session = {
      user: {
        id: "1",
      },
      expires: new Date().toISOString(),
    } satisfies Session;

    // Act
    const result = constructBoardPermissions(board, session);

    // Assert
    expect(result.hasFullAccess).toBe(true);
    expect(result.hasChangeAccess).toBe(true);
    expect(result.hasViewAccess).toBe(true);
  });

  test('should return hasChangeAccess as true when board permissions include "board-change"', () => {
    // Arrange
    const board = {
      creator: {
        id: "1",
      },
      permissions: [{ permission: "board-change" }],
      isPublic: false,
    };
    const session = {
      user: {
        id: "2",
      },
      expires: new Date().toISOString(),
    } satisfies Session;

    // Act
    const result = constructBoardPermissions(board, session);

    // Assert
    expect(result.hasFullAccess).toBe(false);
    expect(result.hasChangeAccess).toBe(true);
    expect(result.hasViewAccess).toBe(true);
  });

  test("should return hasViewAccess as true when board permissions length is greater than or equal to 1", () => {
    // Arrange
    const board = {
      creator: {
        id: "1",
      },
      permissions: [{ permission: "board-view" }],
      isPublic: false,
    };
    const session = {
      user: {
        id: "2",
      },
      expires: new Date().toISOString(),
    } satisfies Session;

    // Act
    const result = constructBoardPermissions(board, session);

    // Assert
    expect(result.hasFullAccess).toBe(false);
    expect(result.hasChangeAccess).toBe(false);
    expect(result.hasViewAccess).toBe(true);
  });

  test("should return hasViewAccess as true when board is public", () => {
    // Arrange
    const board = {
      creator: {
        id: "1",
      },
      permissions: [],
      isPublic: true,
    };
    const session = {
      user: {
        id: "2",
      },
      expires: new Date().toISOString(),
    } satisfies Session;

    // Act
    const result = constructBoardPermissions(board, session);

    // Assert
    expect(result.hasFullAccess).toBe(false);
    expect(result.hasChangeAccess).toBe(false);
    expect(result.hasViewAccess).toBe(true);
  });
});
