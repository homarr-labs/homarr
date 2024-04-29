import { objectKeys } from "@homarr/common";

export const boardPermissions = ["board-view", "board-change"] as const;
export const groupPermissions = {
  board: ["create", "view-all", "modify-all", "full-access"],
  integration: ["create", "use-all", "interact-all", "full-access"],
  admin: true,
} as const;

/**
 * In the following object is described how the permissions are related to each other.
 * For example everybody with the permission "board-modify-all" also has the permission "board-view-all".
 * Or admin has all permissions (board-full-access and integration-full-access which will resolve in an array of every permission).
 */
const groupPermissionParents = {
  "board-modify-all": ["board-view-all"],
  "board-full-access": ["board-modify-all", "board-create"],
  "integration-interact-all": ["integration-use-all"],
  "integration-full-access": ["integration-interact-all", "integration-create"],
  admin: ["board-full-access", "integration-full-access"],
} satisfies Partial<Record<GroupPermissionKey, GroupPermissionKey[]>>;

const getPermissionsInner = (
  permissionSet: Set<GroupPermissionKey>,
  permissions: GroupPermissionKey[],
) => {
  permissions.forEach((permission) => {
    const children =
      groupPermissionParents[permission as keyof typeof groupPermissionParents];
    if (children) {
      getPermissionsInner(permissionSet, children);
    }

    permissionSet.add(permission);
  });
};

export const getPermissionsWithChildren = (
  permissions: GroupPermissionKey[],
) => {
  const permissionSet = new Set<GroupPermissionKey>();
  getPermissionsInner(permissionSet, permissions);
  return Array.from(permissionSet);
};

type GroupPermissions = typeof groupPermissions;

export type GroupPermissionKey = {
  [key in keyof GroupPermissions]: GroupPermissions[key] extends readonly string[]
    ? `${key}-${GroupPermissions[key][number]}`
    : key;
}[keyof GroupPermissions];

export const groupPermissionKeys = objectKeys(groupPermissions).reduce(
  (acc, key) => {
    const item = groupPermissions[key];
    if (typeof item !== "boolean") {
      acc.push(
        ...item.map((subKey) => `${key}-${subKey}` as GroupPermissionKey),
      );
    } else {
      acc.push(key as GroupPermissionKey);
    }
    return acc;
  },
  [] as GroupPermissionKey[],
);

export type BoardPermission = (typeof boardPermissions)[number];
