import { describe, expect, test } from "vitest";

import type { GroupPermissionKey, PermissionMatrixState } from "../permissions";
import {
  getAppManagementAccess,
  getIntegrationManagementAccess,
  getPermissionsWithChildren,
  getPermissionsWithParents,
  groupPermissionKeys,
  isCapabilityImpliedByLevel,
  matrixStateToPermissions,
  permissionMatrix,
  permissionsToMatrixState,
} from "../permissions";

const emptyState = (overrides: Partial<PermissionMatrixState> = {}): PermissionMatrixState => ({
  board: { level: 0, capabilities: [] },
  app: { level: 0, capabilities: [] },
  integration: { level: 0, capabilities: [] },
  "search-engine": { level: 0, capabilities: [] },
  media: { level: 0, capabilities: [] },
  other: { level: 0, capabilities: [] },
  admin: { level: 0, capabilities: [] },
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
    const covered = Object.values(permissionMatrix).flatMap(({ levels, capabilities }) => [...levels, ...capabilities]);
    expect(covered.toSorted()).toEqual(groupPermissionKeys.toSorted());
  });

  test.each(groupPermissionKeys.map((key) => [key]))("expect %s to survive a round-trip on its own", (key) => {
    expect(matrixStateToPermissions(permissionsToMatrixState([key]))).toContain(key);
  });

  test("every ladder is a real chain, so no level can fabricate a sibling permission", () => {
    Object.values(permissionMatrix).forEach(({ levels }) => {
      levels.forEach((key, index) => {
        // Selecting a level must never grant more than that level's key already implies.
        const implied = getPermissionsWithChildren([key]);
        expect(levels.slice(0, index + 1).every((lower) => implied.includes(lower))).toBe(true);
      });
    });
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
    expect(Object.values(state).every(({ level, capabilities }) => level === 0 && capabilities.length === 0)).toBe(
      true,
    );
  });

  test("resolves a standalone create key without granting any level", () => {
    expect(permissionsToMatrixState(["board-create"]).board).toEqual({ level: 0, capabilities: ["board-create"] });
  });

  test("marks a capability as granted when the level implies it", () => {
    expect(permissionsToMatrixState(["board-full-all"]).board.capabilities).toEqual(["board-create"]);
    expect(permissionsToMatrixState(["app-modify-all"]).app.capabilities).toEqual(["app-create"]);
    expect(permissionsToMatrixState(["media-full-all"]).media.capabilities).toEqual(["media-upload"]);
  });

  test("does not mark a capability as granted for a level that does not imply it", () => {
    expect(permissionsToMatrixState(["board-modify-all"]).board.capabilities).toEqual([]);
    expect(permissionsToMatrixState(["integration-interact-all"]).integration.capabilities).toEqual([]);
  });

  test("app-use-all is a capability, not a level, because app-modify-all does not imply it", () => {
    // Regression: modelling use as the level below modify made picking Modify silently grant the
    // use of every app, which the permission graph does not do.
    const state = permissionsToMatrixState(["app-modify-all"]);
    expect(state.app).toEqual({ level: 1, capabilities: ["app-create"] });
    expect(matrixStateToPermissions(state)).toEqual(["app-modify-all"]);
  });

  test("app-full-all implies both app capabilities", () => {
    expect(permissionsToMatrixState(["app-full-all"]).app).toEqual({
      level: 2,
      capabilities: ["app-use-all", "app-create"],
    });
  });
});

describe("isCapabilityImpliedByLevel", () => {
  test.each([
    ["board", "board-create", 0, false],
    ["board", "board-create", 1, false],
    ["board", "board-create", 2, false],
    ["board", "board-create", 3, true],
    ["app", "app-create", 1, true],
    ["app", "app-use-all", 1, false],
    ["app", "app-use-all", 2, true],
    ["integration", "integration-create", 2, false],
    ["integration", "integration-create", 3, true],
    ["search-engine", "search-engine-create", 1, true],
    ["media", "media-upload", 1, false],
    ["media", "media-upload", 2, true],
  ] satisfies [keyof typeof permissionMatrix, GroupPermissionKey, number, boolean][])(
    "expect %s at level %i to imply %s: %s",
    (category, capability, level, expected) => {
      expect(isCapabilityImpliedByLevel(category, capability, level)).toBe(expected);
    },
  );
});

describe("matrixStateToPermissions should expand levels into permission keys", () => {
  test("expands a level into the ordered level keys", () => {
    expect(matrixStateToPermissions(emptyState({ board: { level: 2, capabilities: [] } }))).toEqual([
      "board-view-all",
      "board-modify-all",
    ]);
  });

  test("expands the admin category into the admin key", () => {
    expect(matrixStateToPermissions(emptyState({ admin: { level: 1, capabilities: [] } }))).toEqual(["admin"]);
  });

  test("emits a standalone capability without any level", () => {
    expect(matrixStateToPermissions(emptyState({ board: { level: 0, capabilities: ["board-create"] } }))).toEqual([
      "board-create",
    ]);
  });

  test("emits media-upload as the capability of the media category", () => {
    expect(matrixStateToPermissions(emptyState({ media: { level: 0, capabilities: ["media-upload"] } }))).toEqual([
      "media-upload",
    ]);
  });

  test("emits app-use-all without granting any app level", () => {
    expect(matrixStateToPermissions(emptyState({ app: { level: 0, capabilities: ["app-use-all"] } }))).toEqual([
      "app-use-all",
    ]);
  });

  test("omits a capability that the chosen level already implies", () => {
    expect(matrixStateToPermissions(emptyState({ board: { level: 3, capabilities: ["board-create"] } }))).toEqual([
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
    [["search-engine-modify-all", "search-engine-full-all", "media-view-all", "other-view-logs"]],
    [["board-create"]],
    [["media-upload"]],
    [["board-create", "app-create", "integration-create", "search-engine-create", "media-upload"]],
    [["board-create", "board-view-all"]],
    [["app-modify-all"]],
    [["app-use-all"]],
    [["app-use-all", "app-modify-all"]],
  ] satisfies [GroupPermissionKey[]][])("expect %s to round-trip", (permissions) => {
    const roundTripped = matrixStateToPermissions(permissionsToMatrixState(permissions));
    expect(roundTripped).toEqual(expect.arrayContaining(permissions));
    expect(roundTripped).toHaveLength(permissions.length);
  });

  test("expect a redundant capability key to be normalised away by the level that implies it", () => {
    // app-modify-all already grants app-create, so the matrix stores the minimal set. The permission
    // is not lost: getPermissionsWithChildren re-derives it whenever permissions are read.
    const roundTripped = matrixStateToPermissions(permissionsToMatrixState(["app-create", "app-modify-all"]));
    expect(roundTripped).toEqual(["app-modify-all"]);
    expect(getPermissionsWithChildren(roundTripped)).toContain("app-create");
  });

  test("expect a single higher-level key to expand to its full set on round-trip", () => {
    expect(matrixStateToPermissions(permissionsToMatrixState(["board-full-all"]))).toEqual([
      "board-view-all",
      "board-modify-all",
      "board-full-all",
    ]);
  });
});

describe("management section access", () => {
  test.each([
    [[], false, false],
    [["app-create"], true, false],
    [["app-modify-all"], true, true],
    [["app-full-all", "app-modify-all"], true, true],
    [["app-use-all"], false, false],
    [["board-modify-all"], false, false],
  ] satisfies [GroupPermissionKey[], boolean, boolean][])(
    "expect apps with %s to be reachable: %s, manage-all: %s",
    (permissions, canAccess, canManageAll) => {
      const access = getAppManagementAccess(permissions);
      expect(access.canAccess).toBe(canAccess);
      expect(access.canManageAll).toBe(canManageAll);
    },
  );

  test.each([
    [[], false, false, false],
    [[], true, true, false],
    [["integration-create"], false, true, false],
    [["integration-full-all"], false, true, true],
    [["integration-use-all"], false, false, false],
    [["integration-interact-all"], false, false, false],
    [["integration-interact-all"], true, true, false],
  ] satisfies [GroupPermissionKey[], boolean, boolean, boolean][])(
    "expect integrations with %s and delegated access %s to be reachable: %s, manage-all: %s",
    (permissions, hasDelegatedFullAccess, canAccess, canManageAll) => {
      const access = getIntegrationManagementAccess(permissions, hasDelegatedFullAccess);
      expect(access.canAccess).toBe(canAccess);
      expect(access.canManageAll).toBe(canManageAll);
    },
  );
});
