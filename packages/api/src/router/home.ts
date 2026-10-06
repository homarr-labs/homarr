import { isProviderEnabled } from "@homarr/auth/server";
import { constructIntegrationPermissions } from "@homarr/auth/shared";
import type { Database } from "@homarr/db";
import { db, eq, inArray, or } from "@homarr/db";
import {
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
import { createTRPCRouter, publicProcedure } from "../trpc";

const getFullAccessIntegrationIdsAsync = async (db: Database, userId: string) => {
  const groupsOfCurrentUser = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, userId),
  });

  const accessibleIntegrations = await db.query.integrations.findMany({
    columns: {
      id: true,
    },
    with: {
      userPermissions: {
        where: eq(integrationUserPermissions.userId, userId),
      },
      groupPermissions: {
        where: inArray(
          integrationGroupPermissions.groupId,
          groupsOfCurrentUser.map((group) => group.groupId),
        ),
      },
    },
  });

  return accessibleIntegrations
    .filter((integration) => constructIntegrationPermissions(integration, null).hasFullAccess)
    .map((integration) => integration.id);
};

interface HomeStatistic {
  titleKey: "app" | "board" | "group" | "integration" | "invite" | "media" | "searchEngine" | "user";
  subtitleKey: "authentication" | "authorization" | "boards" | "resources";
  count: number;
  path: string;
}

export const homeRouter = createTRPCRouter({
  getStats: publicProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.session?.user.permissions.includes("admin") ?? false;
    const isCredentialsEnabled = isProviderEnabled("credentials");

    const statistics: HomeStatistic[] = [];

    const boardIds: string[] = [];
    if (ctx.session?.user && !ctx.session.user.permissions.includes("board-view-all")) {
      const permissionsOfCurrentUserWhenPresent = await ctx.db.query.boardUserPermissions.findMany({
        where: eq(boardUserPermissions.userId, ctx.session.user.id),
      });

      const permissionsOfCurrentUserGroupsWhenPresent = await ctx.db.query.groupMembers.findMany({
        where: eq(groupMembers.userId, ctx.session.user.id),
        with: {
          group: {
            with: {
              boardPermissions: {},
            },
          },
        },
      });

      boardIds.push(
        ...permissionsOfCurrentUserWhenPresent
          .map((permission) => permission.boardId)
          .concat(
            permissionsOfCurrentUserGroupsWhenPresent
              .map((groupMember) => groupMember.group.boardPermissions.map((permission) => permission.boardId))
              .flat(),
          ),
      );
    }

    statistics.push({
      titleKey: "board",
      subtitleKey: "boards",
      count: await db.$count(
        boards,
        ctx.session?.user.permissions.includes("board-view-all")
          ? undefined
          : or(
              eq(boards.isPublic, true),
              eq(boards.creatorId, ctx.session?.user.id ?? ""),
              boardIds.length > 0 ? inArray(boards.id, boardIds) : undefined,
            ),
      ),
      path: "/manage/boards",
    });

    if (isAdmin) {
      statistics.push({
        titleKey: "user",
        subtitleKey: "authentication",
        count: await db.$count(users),
        path: "/manage/users",
      });
    }

    if (isAdmin && isCredentialsEnabled) {
      statistics.push({
        titleKey: "invite",
        subtitleKey: "authentication",
        count: await db.$count(invites),
        path: "/manage/users/invites",
      });
    }

    // A card is only shown when the page behind it is reachable, and it counts only what the user is
    // allowed to see. The rules come from @homarr/definitions so this cannot drift from the pages.
    const permissions = ctx.session?.user.permissions ?? [];
    const hasGlobalFullIntegrationAccess = permissions.includes("integration-full-all");
    const fullAccessIntegrationIds =
      hasGlobalFullIntegrationAccess || !ctx.session?.user
        ? []
        : await getFullAccessIntegrationIdsAsync(ctx.db, ctx.session.user.id);
    const integrationAccess = getIntegrationManagementAccess(permissions, fullAccessIntegrationIds.length > 0);
    if (integrationAccess.canAccess) {
      statistics.push({
        titleKey: "integration",
        subtitleKey: "resources",
        count: integrationAccess.canManageAll ? await db.$count(integrations) : fullAccessIntegrationIds.length,
        path: "/manage/integrations",
      });
    }

    const appAccess = getAppManagementAccess(permissions);
    if (appAccess.canAccess) {
      statistics.push({
        titleKey: "app",
        subtitleKey: "resources",
        count: appAccess.canManageAll ? await db.$count(apps) : 0,
        path: "/manage/apps",
      });
    }

    if (isAdmin) {
      statistics.push({
        titleKey: "group",
        subtitleKey: "authorization",
        count: await db.$count(groups),
        path: "/manage/users/groups",
      });
    }

    if (ctx.session?.user.permissions.includes("search-engine-create")) {
      statistics.push({
        titleKey: "searchEngine",
        subtitleKey: "resources",
        count: await db.$count(searchEngines),
        path: "/manage/search-engines",
      });
    }

    if (ctx.session?.user.permissions.includes("media-upload")) {
      statistics.push({
        titleKey: "media",
        subtitleKey: "resources",
        count: await db.$count(
          medias,
          ctx.session.user.permissions.includes("media-view-all")
            ? undefined
            : eq(medias.creatorId, ctx.session.user.id),
        ),
        path: "/manage/medias",
      });
    }

    return statistics;
  }),
});
