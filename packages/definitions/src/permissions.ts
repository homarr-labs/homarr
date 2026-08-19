import { objectEntries, objectKeys } from "@homarr/common";

/**
 * Permissions for boards.
 * view: Can view the board and its content. (e.g. see all items on the board, but not modify them)
 * modify: Can modify the board, its content and visual settings. (e.g. move items, change the background)
 * full: Can modify the board, its content, visual settings, access settings, delete, change the visibility and rename. (e.g. change the board name, delete the board, give access to other users)
 */
export const boardPermissions = ["view", "modify", "full"] as const;
export const boardPermissionsMap = {
  view: "board-view-all",
  modify: "board-modify-all",
  full: "board-full-all",
} satisfies Record<BoardPermission, GroupPermissionKey>;

export type BoardPermission = (typeof boardPermissions)[number];

/**
 * Permissions for integrations.
 * use: Can select the integration for an item on the board. (e.g. select pi-hole for a widget)
 * interact: Can interact with the integration. (e.g. enable / disable pi-hole)
 * full: Can modify the integration. (e.g. change the pi-hole url, secrets and access settings)
 */
export const integrationPermissions = ["use", "interact", "full"] as const;
export const integrationPermissionsMap = {
  use: "integration-use-all",
  interact: "integration-interact-all",
  full: "integration-full-all",
} satisfies Record<IntegrationPermission, GroupPermissionKey>;

export type IntegrationPermission = (typeof integrationPermissions)[number];

/**
 * Global permissions that can be assigned to groups.
 * The keys are generated through combining the key and all array items.
 * For example "board-create" is a generated key
 */
export const groupPermissions = {
  // Order is the same in the UI, inspired from order in navigation here
  board: ["create", "view-all", "modify-all", "full-all"],
  app: ["create", "use-all", "modify-all", "full-all"],
  integration: ["create", "use-all", "interact-all", "full-all"],
  "search-engine": ["create", "modify-all", "full-all"],
  media: ["upload", "view-all", "full-all"],
  other: ["view-logs"],
  admin: true,
} as const;

/**
 * In the following object is described how the permissions are related to each other.
 * For example everybody with the permission "board-modify-all" also has the permission "board-view-all".
 * Or admin has all permissions (board-full-all and integration-full-all which will resolve in an array of every permission).
 */
const groupPermissionParents = {
  "board-modify-all": ["board-view-all"],
  "board-full-all": ["board-modify-all", "board-create"],
  "app-modify-all": ["app-create"],
  "app-full-all": ["app-modify-all", "app-use-all"],
  "integration-interact-all": ["integration-use-all"],
  "integration-full-all": ["integration-interact-all", "integration-create"],
  "search-engine-modify-all": ["search-engine-create"],
  "search-engine-full-all": ["search-engine-modify-all"],
  "media-full-all": ["media-upload", "media-view-all"],
  admin: [
    "board-full-all",
    "app-full-all",
    "integration-full-all",
    "search-engine-full-all",
    "media-full-all",
    "other-view-logs",
  ],
} satisfies Partial<Record<GroupPermissionKey, GroupPermissionKey[]>>;

export const getPermissionsWithParents = (permissions: GroupPermissionKey[]): GroupPermissionKey[] => {
  const res = permissions.map((permission) => {
    return objectEntries(groupPermissionParents)
      .filter(([_key, value]: [string, GroupPermissionKey[]]) => value.includes(permission))
      .map(([key]) => getPermissionsWithParents([key]))
      .flat();
  });

  return permissions.concat(res.flat());
};

const getPermissionsInner = (permissionSet: Set<GroupPermissionKey>, permissions: GroupPermissionKey[]) => {
  permissions.forEach((permission) => {
    const children = groupPermissionParents[permission as keyof typeof groupPermissionParents];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (children) {
      getPermissionsInner(permissionSet, children);
    }

    permissionSet.add(permission);
  });
};

export const getPermissionsWithChildren = (permissions: GroupPermissionKey[]) => {
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

export const groupPermissionKeys = objectKeys(groupPermissions).reduce((acc, key) => {
  const item = groupPermissions[key];
  if (typeof item !== "boolean") {
    acc.push(...item.map((subKey) => `${key}-${subKey}` as GroupPermissionKey));
  } else {
    acc.push(key as GroupPermissionKey);
  }
  return acc;
}, [] as GroupPermissionKey[]);

/**
 * Describes how each permission category is presented in the group permission matrix UI.
 *
 * `levels` is an ordered escalation of access: every level implies the one below it through
 * {@link groupPermissionParents}, so picking level N grants everything up to N.
 *
 * `capabilities` are the keys that are NOT part of that ladder - "may add new resources", "may
 * upload", "may put any app on a board". They can be granted on their own (e.g. "members may create
 * their own boards but not see anyone else's") and some levels already imply them; use
 * {@link isCapabilityImpliedByLevel} to detect that instead of hard-coding it.
 *
 * Only keys that genuinely imply each other may share a ladder. `app-modify-all` implies
 * `app-create` but NOT `app-use-all` (only `app-full-all` does), so `app-use-all` is a capability -
 * putting it in the ladder would make picking "Modify" silently grant use of every app.
 *
 * Together, `levels` and `capabilities` cover every key in {@link groupPermissionKeys}, so the
 * matrix is a lossless representation of a group's permissions.
 */
export const permissionMatrix = {
  board: { levels: ["board-view-all", "board-modify-all", "board-full-all"], capabilities: ["board-create"] },
  app: { levels: ["app-modify-all", "app-full-all"], capabilities: ["app-use-all", "app-create"] },
  integration: {
    levels: ["integration-use-all", "integration-interact-all", "integration-full-all"],
    capabilities: ["integration-create"],
  },
  "search-engine": {
    levels: ["search-engine-modify-all", "search-engine-full-all"],
    capabilities: ["search-engine-create"],
  },
  media: { levels: ["media-view-all", "media-full-all"], capabilities: ["media-upload"] },
  other: { levels: ["other-view-logs"], capabilities: [] },
  admin: { levels: ["admin"], capabilities: [] },
} as const satisfies Record<
  string,
  { levels: readonly GroupPermissionKey[]; capabilities: readonly GroupPermissionKey[] }
>;

export type PermissionMatrixCategory = keyof typeof permissionMatrix;

export interface PermissionMatrixCategoryState {
  /** 0 = no access, N = every key up to `permissionMatrix[category].levels[N - 1]` */
  level: number;
  /** The category's granted capability keys, including the ones the level already implies */
  capabilities: readonly GroupPermissionKey[];
}

export type PermissionMatrixState = Record<PermissionMatrixCategory, PermissionMatrixCategoryState>;

/**
 * Whether the given level already grants a capability through permission inheritance.
 * For example board level 3 (`board-full-all`) implies `board-create`.
 */
export const isCapabilityImpliedByLevel = (
  category: PermissionMatrixCategory,
  capability: GroupPermissionKey,
  level: number,
) => {
  if (level <= 0) {
    return false;
  }

  return getPermissionsWithChildren([...permissionMatrix[category].levels.slice(0, level)]).includes(capability);
};

export const permissionsToMatrixState = (permissions: GroupPermissionKey[]): PermissionMatrixState => {
  const permissionSet = new Set(permissions);

  return objectKeys(permissionMatrix).reduce((acc, category) => {
    let level = 0;
    permissionMatrix[category].levels.forEach((key, index) => {
      if (permissionSet.has(key)) {
        level = index + 1;
      }
    });

    acc[category] = {
      level,
      capabilities: permissionMatrix[category].capabilities.filter(
        (capability) => permissionSet.has(capability) || isCapabilityImpliedByLevel(category, capability, level),
      ),
    };
    return acc;
  }, {} as PermissionMatrixState);
};

export const matrixStateToPermissions = (state: PermissionMatrixState): GroupPermissionKey[] => {
  return objectKeys(permissionMatrix).reduce((acc, category) => {
    const { level, capabilities } = state[category];
    acc.push(...permissionMatrix[category].levels.slice(0, level));
    // Skip capabilities the chosen level already implies, so the stored permissions stay minimal
    // and a state -> permissions -> state round-trip is exact.
    acc.push(...capabilities.filter((capability) => !isCapabilityImpliedByLevel(category, capability, level)));
    return acc;
  }, [] as GroupPermissionKey[]);
};

export interface ManagementSectionAccess {
  /** May see and manage every resource of the section */
  canManageAll: boolean;
  /** May add new resources to the section */
  canCreate: boolean;
  /** May open the section at all */
  canAccess: boolean;
}

/**
 * A management section is reachable when the user can do at least one thing in it. Both rules live
 * here so the navigation, the pages themselves and the management home statistics cannot drift
 * apart - each of them consumes the same function.
 */
export const getAppManagementAccess = (permissions: readonly GroupPermissionKey[]): ManagementSectionAccess => {
  const canManageAll = permissions.includes("app-modify-all");
  const canCreate = permissions.includes("app-create");

  return { canManageAll, canCreate, canAccess: canManageAll || canCreate };
};

/**
 * `hasDelegatedFullAccess` is whether the user was granted full access to at least one specific
 * integration; it has to be looked up per request, so the caller resolves it.
 */
export const getIntegrationManagementAccess = (
  permissions: readonly GroupPermissionKey[],
  hasDelegatedFullAccess: boolean,
): ManagementSectionAccess & { hasDelegatedFullAccess: boolean } => {
  const canManageAll = permissions.includes("integration-full-all");
  const canCreate = permissions.includes("integration-create");

  return {
    canManageAll,
    canCreate,
    hasDelegatedFullAccess,
    canAccess: canManageAll || canCreate || hasDelegatedFullAccess,
  };
};
