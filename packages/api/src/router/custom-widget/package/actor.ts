import { TRPCError } from "@trpc/server";
import { createSessionAsync } from "@homarr/auth/server";
import { eq } from "@homarr/db";
import { users } from "@homarr/db/schema";
import type { PackageContext } from "./types";

/** WebSocket contexts can live longer than their user's group membership or account. */
export async function refreshWidgetActor(ctx: PackageContext): Promise<PackageContext> {
  if (!ctx.session) return ctx;
  if (Date.parse(ctx.session.expires) <= Date.now()) throw new TRPCError({ code: "UNAUTHORIZED" });
  const user = await ctx.db.query.users.findFirst({ where: eq(users.id, ctx.session.user.id) });
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
  const current = await createSessionAsync(ctx.db, user);
  return { ...ctx, session: { ...ctx.session, user: { ...ctx.session.user, permissions: current.user.permissions } } };
}
