import { describe, expect, test } from "vitest";

import type { GroupPermissionKey } from "../permissions";
import { getPermissionsWithChildren, getPermissionsWithParents } from "../permissions";

describe("getPermissionsWithParents should return the correct permissions", () => {
  test.each([
    [["board-view-all"], ["board-view-all", "board-modify-all", "board-full-access", "admin"]],
    [["board-modify-all"], ["board-modify-all", "board-full-access", "admin"]],
    [["board-create"], ["board-create", "board-full-access", "admin"]],
    [["board-full-access"], ["board-full-access", "admin"]],
    [["integration-use-all"], ["integration-use-all", "integration-interact-all", "integration-full-access", "admin"]],
    [["integration-create"], ["integration-create", "integration-full-access", "admin"]],
    [["integration-interact-all"], ["integration-interact-all", "integration-full-access", "admin"]],
    [["integration-full-access"], ["integration-full-access", "admin"]],
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
    [["board-full-access"], ["board-full-access", "board-modify-all", "board-view-all"]],
    [["integration-use-all"], ["integration-use-all"]],
    [["integration-create"], ["integration-create"]],
    [["integration-interact-all"], ["integration-interact-all", "integration-use-all"]],
    [["integration-full-access"], ["integration-full-access", "integration-interact-all", "integration-use-all"]],
    [
      ["admin"],
      [
        "admin",
        "board-full-access",
        "board-modify-all",
        "board-view-all",
        "integration-full-access",
        "integration-interact-all",
        "integration-use-all",
      ],
    ],
  ] satisfies [GroupPermissionKey[], GroupPermissionKey[]][])("expect %s to return %s", (input, expectedOutput) => {
    expect(getPermissionsWithChildren(input)).toEqual(expect.arrayContaining(expectedOutput));
  });
});
