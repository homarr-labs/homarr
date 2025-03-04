import type { AnySQLiteTable } from "drizzle-orm/sqlite-core";

import { isProviderEnabled } from "@homarr/auth/server";
import type { Database } from "@homarr/db";
import { apps, boards, groups, integrations, invites, users } from "@homarr/db/schema";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const homeRouter = createTRPCRouter({
  getStats: publicProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.session?.user.permissions.includes("admin") ?? false;
    const isCredentialsEnabled = isProviderEnabled("credentials");

    return {
      countBoards: await getCountForTableAsync(ctx.db, boards, true),
      countUsers: await getCountForTableAsync(ctx.db, users, isAdmin),
      countGroups: await getCountForTableAsync(ctx.db, groups, true),
      countInvites: await getCountForTableAsync(ctx.db, invites, isAdmin),
      countIntegrations: await getCountForTableAsync(ctx.db, integrations, isCredentialsEnabled && isAdmin),
      countApps: await getCountForTableAsync(ctx.db, apps, true),
    };
  }),
});

const getCountForTableAsync = async (db: Database, table: AnySQLiteTable, canView: boolean) => {
  if (!canView) {
    return 0;
  }

  return await db.$count(table);
};
