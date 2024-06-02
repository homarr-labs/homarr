import type { Session } from "next-auth";
import { describe, expect, test } from "vitest";

import { getPermissionsWithChildren } from "@homarr/definitions";

import { constructBoardPermissions } from "../board-permissions";

describe("constructBoardPermissions", () => {
  test("should return all board permissions as true when session user id is equal to creator id", () => {
    // Arrange
    const board = {
      creator: {
        id: "1",
      },
      userPermissions: [],
      groupPermissions: [],
      isPublic: false,
    };
    const session = {
      user: {
        id: "1",
        permissions: [],
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

  test("should return hasFullAccess as true when session permissions include board-full-access", () => {
    // Arrange
    const board = {
      creator: {
        id: "1",
      },
      userPermissions: [],
      groupPermissions: [],
      isPublic: false,
    };
    const session = {
      user: {
        id: "2",
        permissions: getPermissionsWithChildren(["board-full-access"]),
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

  test("should return hasChangeAccess as true when session permissions include board-modify-all", () => {
    // Arrange
    const board = {
      creator: {
        id: "1",
      },
      userPermissions: [],
      groupPermissions: [],
      isPublic: false,
    };
    const session = {
      user: {
        id: "2",
        permissions: getPermissionsWithChildren(["board-modify-all"]),
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

  test('should return hasChangeAccess as true when board user permissions include "board-change"', () => {
    // Arrange
    const board = {
      creator: {
        id: "1",
      },

      userPermissions: [{ permission: "board-change" }],
      groupPermissions: [],
      isPublic: false,
    };
    const session = {
      user: {
        id: "2",
        permissions: [],
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

  test("should return hasChangeAccess as true when board group permissions include board-change", () => {
    // Arrange
    const board = {
      creator: {
        id: "1",
      },
      userPermissions: [],
      groupPermissions: [{ permission: "board-change" }],
      isPublic: false,
    };
    const session = {
      user: {
        id: "2",
        permissions: [],
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

  test("should return hasViewAccess as true when session permissions include board-view-all", () => {
    // Arrange
    const board = {
      creator: {
        id: "1",
      },
      userPermissions: [],
      groupPermissions: [],
      isPublic: false,
    };
    const session = {
      user: {
        id: "2",
        permissions: getPermissionsWithChildren(["board-view-all"]),
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

  test("should return hasViewAccess as true when board user permissions length is greater than or equal to 1", () => {
    // Arrange
    const board = {
      creator: {
        id: "1",
      },
      userPermissions: [{ permission: "board-view" }],
      groupPermissions: [],
      isPublic: false,
    };
    const session = {
      user: {
        id: "2",
        permissions: [],
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

  test("should return hasViewAccess as true when board group permissions length is greater than or equal to 1", () => {
    // Arrange
    const board = {
      creator: {
        id: "1",
      },
      userPermissions: [],
      groupPermissions: [{ permission: "board-view" }],
      isPublic: false,
    };
    const session = {
      user: {
        id: "2",
        permissions: [],
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

  test("should return all false when board is not public and session user id is not equal to creator id and no permissions", () => {
    // Arrange
    const board = {
      creator: {
        id: "1",
      },
      userPermissions: [],
      groupPermissions: [],
      isPublic: false,
    };
    const session = {
      user: {
        id: "2",
        permissions: [],
      },
      expires: new Date().toISOString(),
    } satisfies Session;

    // Act
    const result = constructBoardPermissions(board, session);

    // Assert
    expect(result.hasFullAccess).toBe(false);
    expect(result.hasChangeAccess).toBe(false);
    expect(result.hasViewAccess).toBe(false);
  });

  test("should return hasViewAccess as true when board is public", () => {
    // Arrange
    const board = {
      creator: {
        id: "1",
      },
      userPermissions: [],
      groupPermissions: [],
      isPublic: true,
    };
    const session = {
      user: {
        id: "2",
        permissions: [],
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
