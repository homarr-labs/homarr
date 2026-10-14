import type { Database, eq as drizzleEq, inArray as drizzleInArray, or as drizzleOr } from "@homarr/db";
import type {
  apps,
  boards,
  boardUserPermissions,
  groupMembers,
  groups,
  integrationGroupPermissions,
  integrationUserPermissions,
  integrations,
  invites,
  medias,
  searchEngines,
  users,
} from "@homarr/db/schema";
import { getAppManagementAccess, getIntegrationManagementAccess } from "@homarr/definitions";

import type { constructIntegrationPermissions } from "../../../../auth/nitro/policy/resources";
import type { snapshotPolicyIdentity } from "../../../../auth/nitro/policy/identity";
import { sourceProcedure } from "../procedure";
import type { BackendContext } from "../context";

export interface HomeProcedureResources {
  readonly policy: {
    readonly snapshotIdentity: typeof snapshotPolicyIdentity;
    readonly integrationPermissions: typeof constructIntegrationPermissions;
  };
  readonly tables: {
    readonly apps: typeof apps;
    readonly boards: typeof boards;
    readonly boardUserPermissions: typeof boardUserPermissions;
    readonly groupMembers: typeof groupMembers;
    readonly groups: typeof groups;
    readonly integrationGroupPermissions: typeof integrationGroupPermissions;
    readonly integrationUserPermissions: typeof integrationUserPermissions;
    readonly integrations: typeof integrations;
    readonly invites: typeof invites;
    readonly medias: typeof medias;
    readonly searchEngines: typeof searchEngines;
    readonly users: typeof users;
  };
  readonly operators: {
    readonly eq: typeof drizzleEq;
    readonly inArray: typeof drizzleInArray;
    readonly or: typeof drizzleOr;
  };
  readonly credentialsEnabled: boolean;
}

export interface HomeStatistic {
  titleKey: "app" | "board" | "group" | "integration" | "invite" | "media" | "searchEngine" | "user";
  subtitleKey: "authentication" | "authorization" | "boards" | "resources";
  count: number;
  path: string;
}

export const homeImplementedPaths = ["home.getStats"] as const;
export const homePendingPaths = [] as const;

export { createHomeTargetResolver } from "./-settings-setup/home-target";
export type { HomeTargetResources } from "./-settings-setup/home-target";

async function getFullAccessIntegrationIds(db: Database, context: BackendContext, resources: HomeProcedureResources) {
  if (context.principal.kind !== "authenticated") return [];
  const { groupMembers, integrationUserPermissions, integrationGroupPermissions } = resources.tables;
  const { eq, inArray } = resources.operators;
  const user = context.principal.user;
  const memberships = await db.query.groupMembers.findMany({ where: eq(groupMembers.userId, user.id) });
  const identity = resources.policy.snapshotIdentity({
    type: "authenticated",
    userId: user.id,
    groupIds: memberships.map(({ groupId }) => groupId),
    permissions: user.permissions,
  });
  const accessibleIntegrations = await db.query.integrations.findMany({
    columns: { id: true },
    with: {
      userPermissions: { where: eq(integrationUserPermissions.userId, user.id) },
      groupPermissions: {
        where: inArray(
          integrationGroupPermissions.groupId,
          memberships.map(({ groupId }) => groupId),
        ),
      },
    },
  });
  return accessibleIntegrations
    .filter((integration) => resources.policy.integrationPermissions(integration, identity).hasFullAccess)
    .map(({ id }) => id);
}

export function createHomeProcedures(resources: HomeProcedureResources) {
  const {
    boards,
    boardUserPermissions,
    groupMembers,
    users,
    invites,
    integrations,
    apps,
    groups,
    searchEngines,
    medias,
  } = resources.tables;
  const { eq, inArray, or } = resources.operators;
  const getStats = sourceProcedure({
    path: "home.getStats",
    kind: "query",
    access: { kind: "public" },
    demo: "guarded",
  }).handler(async ({ context }) => {
    const { db } = context;
    const user = context.principal.kind === "authenticated" ? context.principal.user : undefined;
    const isAdmin = user?.permissions.includes("admin") ?? false;
    const statistics: HomeStatistic[] = [];
    const boardIds: string[] = [];
    if (user && !user.permissions.includes("board-view-all")) {
      const userPermissions = await db.query.boardUserPermissions.findMany({
        where: eq(boardUserPermissions.userId, user.id),
      });
      const memberships = await db.query.groupMembers.findMany({
        where: eq(groupMembers.userId, user.id),
        with: { group: { with: { boardPermissions: {} } } },
      });
      boardIds.push(
        ...userPermissions
          .map(({ boardId }) => boardId)
          .concat(memberships.flatMap(({ group }) => group.boardPermissions.map(({ boardId }) => boardId))),
      );
    }
    statistics.push({
      titleKey: "board",
      subtitleKey: "boards",
      count: await db.$count(
        boards,
        user?.permissions.includes("board-view-all")
          ? undefined
          : or(
              eq(boards.isPublic, true),
              eq(boards.creatorId, user?.id ?? ""),
              boardIds.length > 0 ? inArray(boards.id, boardIds) : undefined,
            ),
      ),
      path: "/manage/boards",
    });
    if (isAdmin)
      statistics.push({
        titleKey: "user",
        subtitleKey: "authentication",
        count: await db.$count(users),
        path: "/manage/users",
      });
    if (isAdmin && resources.credentialsEnabled)
      statistics.push({
        titleKey: "invite",
        subtitleKey: "authentication",
        count: await db.$count(invites),
        path: "/manage/users/invites",
      });
    const permissions = [...(user?.permissions ?? [])];
    const fullIds =
      permissions.includes("integration-full-all") || !user
        ? []
        : await getFullAccessIntegrationIds(db, context, resources);
    const integrationAccess = getIntegrationManagementAccess(permissions, fullIds.length > 0);
    if (integrationAccess.canAccess)
      statistics.push({
        titleKey: "integration",
        subtitleKey: "resources",
        count: integrationAccess.canManageAll ? await db.$count(integrations) : fullIds.length,
        path: "/manage/integrations",
      });
    const appAccess = getAppManagementAccess(permissions);
    if (appAccess.canAccess)
      statistics.push({
        titleKey: "app",
        subtitleKey: "resources",
        count: appAccess.canManageAll ? await db.$count(apps) : 0,
        path: "/manage/apps",
      });
    if (isAdmin)
      statistics.push({
        titleKey: "group",
        subtitleKey: "authorization",
        count: await db.$count(groups),
        path: "/manage/users/groups",
      });
    if (user?.permissions.includes("search-engine-create"))
      statistics.push({
        titleKey: "searchEngine",
        subtitleKey: "resources",
        count: await db.$count(searchEngines),
        path: "/manage/search-engines",
      });
    if (user?.permissions.includes("media-upload"))
      statistics.push({
        titleKey: "media",
        subtitleKey: "resources",
        count: await db.$count(
          medias,
          user.permissions.includes("media-view-all") ? undefined : eq(medias.creatorId, user.id),
        ),
        path: "/manage/medias",
      });
    return statistics;
  });
  return { getStats };
}
