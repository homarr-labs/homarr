import { describe, expect, test } from "vitest";

import type { GroupPermissionKey } from "../permissions";
import {
  getPermissionsWithChildren,
  getPermissionsWithParents,
  matrixStateToPermissions,
  permissionsToMatrixState,
} from "../permissions";

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

describe("permissionsToMatrixState should resolve the highest present level per category", () => {
  test("resolves the highest present level key", () => {
    const state = permissionsToMatrixState(["board-view-all", "board-modify-all"]);
    expect(state.board.level).toBe(2);
  });

  test("resolves the admin category", () => {
    expect(permissionsToMatrixState(["admin"]).admin.level).toBe(1);
  });

  test("resolves an empty selection to all zero", () => {
    const state = permissionsToMatrixState([]);
    expect(Object.values(state).every(({ level }) => level === 0)).toBe(true);
  });
});

describe("matrixStateToPermissions should expand levels into permission keys", () => {
  test("expands a level into the ordered level keys", () => {
    const permissions = matrixStateToPermissions({
      board: { level: 2 },
      app: { level: 0 },
      integration: { level: 0 },
      "search-engine": { level: 0 },
      media: { level: 0 },
      other: { level: 0 },
      admin: { level: 0 },
    });
    expect(permissions).toEqual(["board-view-all", "board-modify-all"]);
  });

  test("expands the admin category into the admin key", () => {
    const permissions = matrixStateToPermissions({
      board: { level: 0 },
      app: { level: 0 },
      integration: { level: 0 },
      "search-engine": { level: 0 },
      media: { level: 0 },
      other: { level: 0 },
      admin: { level: 1 },
    });
    expect(permissions).toEqual(["admin"]);
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
  ] satisfies [GroupPermissionKey[]][])("expect %s to round-trip", (permissions) => {
    const roundTripped = matrixStateToPermissions(permissionsToMatrixState(permissions));
    expect(roundTripped).toEqual(expect.arrayContaining(permissions));
    expect(roundTripped).toHaveLength(permissions.length);
  });

  test("expect a single higher-level key to expand to its full set on round-trip", () => {
    const roundTripped = matrixStateToPermissions(permissionsToMatrixState(["board-full-all"]));
    expect(roundTripped).toEqual(["board-view-all", "board-modify-all", "board-full-all"]);
  });
});
