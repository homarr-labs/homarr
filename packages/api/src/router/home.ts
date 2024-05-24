import { count } from "@homarr/db";
import { apps, boards, groups, integrations, invites, users } from "@homarr/db/schema/sqlite";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const homeRouter = createTRPCRouter({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    return {
      countBoards: (await ctx.db.select({ count: count() }).from(boards))[0]?.count ?? 0,
      countUsers: (await ctx.db.select({ count: count() }).from(users))[0]?.count ?? 0,
      countGroups: (await ctx.db.select({ count: count() }).from(groups))[0]?.count ?? 0,
      countInvites: (await ctx.db.select({ count: count() }).from(invites))[0]?.count ?? 0,
      countIntegrations: (await ctx.db.select({ count: count() }).from(integrations))[0]?.count ?? 0,
      countApps: (await ctx.db.select({ count: count() }).from(apps))[0]?.count ?? 0,
    };
  }),
});
