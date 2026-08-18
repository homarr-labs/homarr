import { describe, expect, test } from "vitest";

import type { GroupPermissionKey, PermissionMatrixState } from "../permissions";
import {
  getPermissionsWithChildren,
  getPermissionsWithParents,
  groupPermissionKeys,
  isCreateImpliedByLevel,
  matrixStateToPermissions,
  permissionMatrix,
  permissionsToMatrixState,
} from "../permissions";

const emptyState = (overrides: Partial<PermissionMatrixState> = {}): PermissionMatrixState => ({
  board: { level: 0, create: false },
  app: { level: 0, create: false },
  integration: { level: 0, create: false },
  "search-engine": { level: 0, create: false },
  media: { level: 0, create: false },
  other: { level: 0, create: false },
  admin: { level: 0, create: false },
  ...overrides,
});

describe("getPermissionsWithParents should return the correct permissions", () => {
  test.each([
    [["board-view-all"], ["board-view-all", "board-modify-all", "board-full-all", "admin"]],
    [["board-modify-all"], ["board-modify-all", "board-full-all", "admin"]],
    [["board-create"], ["board-create", "board-full-all", "admin"]],
    [["board-full-all"], ["board-full-all", "admin"]],
    [["integration-use-all"], ["integration-use-all", "integration-interact-all", "integration-full-all", "admin"]],
    [["integration-create"], ["integration-create", "integration-full-all", "admin"]],
    [["integration-interact-all"], ["integration-interact-all", "integration-full-all", "admin"]],
    [["integration-full-all"], ["integration-full-all", "admin"]],
    [["admin"], ["admin"]],
  ] satisfies [GroupPermissionKey[], GroupPermissionKey[]][])("expect %s to return %s", (input, expectedOutput) => {
    expect(getPermissionsWithParents(input)).toEqual(expect.arrayContaining(expectedOutput));
  });
});

describe("getPermissionsWithChildren should return the correct permissions", () => {
  test.each([
    [["board-view-all"], ["board-view-all"]],
    [["board-modify-all"], ["board-view-all", "board-modify-all"]],
    [["board-create"], ["board-create"]],
    [["board-full-all"], ["board-full-all", "board-modify-all", "board-view-all"]],
    [["integration-use-all"], ["integration-use-all"]],
    [["integration-create"], ["integration-create"]],
    [["integration-interact-all"], ["integration-interact-all", "integration-use-all"]],
    [["integration-full-all"], ["integration-full-all", "integration-interact-all", "integration-use-all"]],
    [
      ["admin"],
      [
        "admin",
        "board-full-all",
        "board-modify-all",
        "board-view-all",
        "integration-full-all",
        "integration-interact-all",
        "integration-use-all",
      ],
    ],
  ] satisfies [GroupPermissionKey[], GroupPermissionKey[]][])("expect %s to return %s", (input, expectedOutput) => {
    expect(getPermissionsWithChildren(input)).toEqual(expect.arrayContaining(expectedOutput));
  });
});

describe("the matrix must be able to represent every permission", () => {
  test("every group permission key is covered by exactly one category", () => {
    const covered = Object.values(permissionMatrix).flatMap(({ levels, create }) => [
      ...levels,
      ...(create === null ? [] : [create]),
    ]);
    expect(covered.toSorted()).toEqual(groupPermissionKeys.toSorted());
  });

  test.each(groupPermissionKeys.map((key) => [key]))("expect %s to survive a round-trip on its own", (key) => {
    expect(matrixStateToPermissions(permissionsToMatrixState([key]))).toContain(key);
  });
});

describe("permissionsToMatrixState should resolve the highest present level per category", () => {
  test("resolves the highest present level key", () => {
    expect(permissionsToMatrixState(["board-view-all", "board-modify-all"]).board.level).toBe(2);
  });

  test("resolves the admin category", () => {
    expect(permissionsToMatrixState(["admin"]).admin.level).toBe(1);
  });

  test("resolves an empty selection to all zero", () => {
    const state = permissionsToMatrixState([]);
    expect(Object.values(state).every(({ level, create }) => level === 0 && !create)).toBe(true);
  });

  test("resolves a standalone create key without granting any level", () => {
    expect(permissionsToMatrixState(["board-create"]).board).toEqual({ level: 0, create: true });
  });

  test("marks create as granted when the level implies it", () => {
    expect(permissionsToMatrixState(["board-full-all"]).board.create).toBe(true);
    expect(permissionsToMatrixState(["app-modify-all"]).app.create).toBe(true);
    expect(permissionsToMatrixState(["media-full-all"]).media.create).toBe(true);
  });

  test("does not mark create as granted for a level that does not imply it", () => {
    expect(permissionsToMatrixState(["board-modify-all"]).board.create).toBe(false);
    expect(permissionsToMatrixState(["integration-interact-all"]).integration.create).toBe(false);
  });
});

describe("isCreateImpliedByLevel", () => {
  test.each([
    ["board", 0, false],
    ["board", 1, false],
    ["board", 2, false],
    ["board", 3, true],
    ["app", 1, false],
    ["app", 2, true],
    ["integration", 2, false],
    ["integration", 3, true],
    ["search-engine", 1, true],
    ["media", 1, false],
    ["media", 2, true],
    ["other", 1, false],
    ["admin", 1, false],
  ] satisfies [keyof typeof permissionMatrix, number, boolean][])(
    "expect %s at level %i to imply create: %s",
    (category, level, expected) => {
      expect(isCreateImpliedByLevel(category, level)).toBe(expected);
    },
  );
});

describe("matrixStateToPermissions should expand levels into permission keys", () => {
  test("expands a level into the ordered level keys", () => {
    expect(matrixStateToPermissions(emptyState({ board: { level: 2, create: false } }))).toEqual([
      "board-view-all",
      "board-modify-all",
    ]);
  });

  test("expands the admin category into the admin key", () => {
    expect(matrixStateToPermissions(emptyState({ admin: { level: 1, create: false } }))).toEqual(["admin"]);
  });

  test("emits a standalone create key without any level", () => {
    expect(matrixStateToPermissions(emptyState({ board: { level: 0, create: true } }))).toEqual(["board-create"]);
  });

  test("emits media-upload as the create key of the media category", () => {
    expect(matrixStateToPermissions(emptyState({ media: { level: 0, create: true } }))).toEqual(["media-upload"]);
  });

  test("omits a create key that the chosen level already implies", () => {
    expect(matrixStateToPermissions(emptyState({ board: { level: 3, create: true } }))).toEqual([
      "board-view-all",
      "board-modify-all",
      "board-full-all",
    ]);
  });
});

describe("matrix helpers should round-trip stably", () => {
  test.each([
    [["board-view-all", "board-modify-all"]],
    [["integration-use-all", "integration-interact-all", "integration-full-all"]],
    [["admin"]],
    [[]],
    [
      [
        "app-use-all",
        "app-modify-all",
        "search-engine-modify-all",
        "search-engine-full-all",
        "media-view-all",
        "other-view-logs",
      ],
    ],
    [["board-create"]],
    [["media-upload"]],
    [["board-create", "app-create", "integration-create", "search-engine-create", "media-upload"]],
    [["board-create", "board-view-all"]],
  ] satisfies [GroupPermissionKey[]][])("expect %s to round-trip", (permissions) => {
    const roundTripped = matrixStateToPermissions(permissionsToMatrixState(permissions));
    expect(roundTripped).toEqual(expect.arrayContaining(permissions));
    expect(roundTripped).toHaveLength(permissions.length);
  });

  test("expect a single higher-level key to expand to its full set on round-trip", () => {
    expect(matrixStateToPermissions(permissionsToMatrixState(["board-full-all"]))).toEqual([
      "board-view-all",
      "board-modify-all",
      "board-full-all",
    ]);
  });
});
