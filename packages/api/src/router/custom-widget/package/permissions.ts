import { widgetPackageAdminProcedure } from "./procedure";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq } from "@homarr/db";
import { boards, customWidgetGuestGrants, customWidgetActivity } from "@homarr/db/schema";

import { throwIfActionForbiddenAsync } from "../../board/board-access";
import { packageDigest, resolvePackagePlacement, stableJson } from "./records";
import type { ResolvedPackagePlacement } from "./records";
import { getBindingsDigest } from "./connections";
import type { PackageContext } from "./types";
import { withWidgetInstallationLock } from "./coordination";
import { validatePackageHandlerInput } from "./handler-validation";
import { publishWidgetPackageChange } from "./events";

export function getPackageActionDigest(resolved: ResolvedPackagePlacement) {
  return packageDigest({
    server: resolved.artifact.server,
    handlers: resolved.artifact.manifest.handlers,
    dependencies: resolved.artifact.dependencyLock,
  });
}

async function getPlacementBindingsDigest(ctx: PackageContext, resolved: ResolvedPackagePlacement) {
  return packageDigest({
    connections: await getBindingsDigest(ctx, resolved.bindings),
    options: resolved.configuration,
  });
}

export async function authorizePackageHandler(
  ctx: PackageContext,
  resolved: ResolvedPackagePlacement,
  name: string,
  kind: "query" | "action" | "subscription",
  input: unknown,
) {
  const handler = resolved.artifact.manifest.handlers[name];
  if (!handler || handler.kind !== kind)
    throw new TRPCError({ code: "NOT_FOUND", message: "Widget handler not found" });
  if (kind !== "action" || ctx.session) {
    await throwIfActionForbiddenAsync(ctx, eq(boards.id, resolved.item.boardId), handler.permission);
    return { handler, guest: false };
  }
  if (ctx.crossSiteRequest)
    throw new TRPCError({ code: "FORBIDDEN", message: "Guest actions must originate from this Homarr instance" });
  if (!handler.guestAccess) throw new TRPCError({ code: "UNAUTHORIZED" });
  const grant = await ctx.db.query.customWidgetGuestGrants.findFirst({
    where: and(eq(customWidgetGuestGrants.itemId, resolved.item.id), eq(customWidgetGuestGrants.handler, name)),
  });
  if (
    !grant ||
    grant.artifactDigest !== getPackageActionDigest(resolved) ||
    grant.bindingsDigest !== (await getPlacementBindingsDigest(ctx, resolved))
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "The owner must enable this guest action for the current widget",
    });
  }
  const allowed = z.array(z.unknown()).parse(JSON.parse(grant.allowedInputs));
  if (!allowed.some((candidate) => stableJson(candidate) === stableJson(input))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "These action inputs are not enabled for guests" });
  }
  return { handler, guest: true };
}

const admin = widgetPackageAdminProcedure;
export const packageGrantProcedures = {
  guestGrants: admin.input(z.object({ itemId: z.string() })).query(async ({ ctx, input }) => {
    const resolved = await resolvePackagePlacement(ctx, input.itemId);
    const grants = await ctx.db.query.customWidgetGuestGrants.findMany({
      where: eq(customWidgetGuestGrants.itemId, input.itemId),
    });
    const bindingDigest = await getPlacementBindingsDigest(ctx, resolved);
    return grants.map((grant) => ({
      ...grant,
      allowedInputs: JSON.parse(grant.allowedInputs) as unknown[],
      current: grant.artifactDigest === getPackageActionDigest(resolved) && grant.bindingsDigest === bindingDigest,
    }));
  }),
  setGuestGrant: admin
    .input(
      z.object({
        itemId: z.string(),
        handler: z.string(),
        enabled: z.boolean(),
        allowedInputs: z.array(z.unknown()).min(1).max(100).default([{}]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const placement = await resolvePackagePlacement(ctx, input.itemId);
      const id = packageDigest([input.itemId, input.handler]);
      return withWidgetInstallationLock(placement.installation.id, async (signal) => {
        const resolved = await resolvePackagePlacement(ctx, input.itemId);
        if (!input.enabled) {
          signal.throwIfAborted();
          await ctx.db.delete(customWidgetGuestGrants).where(eq(customWidgetGuestGrants.id, id));
          await publishWidgetPackageChange({
            installationId: resolved.installation.id,
            itemIds: [input.itemId],
            kind: "bindings",
          });
          return { enabled: false };
        }
        const handler = resolved.artifact.manifest.handlers[input.handler];
        if (!handler || handler.kind !== "action" || !handler.guestAccess)
          throw new TRPCError({ code: "BAD_REQUEST", message: "The package does not offer this action to guests" });
        if (Buffer.byteLength(JSON.stringify(input.allowedInputs)) > 1_048_576)
          throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Guest grant inputs exceed 1 MiB" });
        for (const value of input.allowedInputs) validatePackageHandlerInput(handler, value);
        const bindingsDigest = await getPlacementBindingsDigest(ctx, resolved);
        signal.throwIfAborted();
        await ctx.db.delete(customWidgetGuestGrants).where(eq(customWidgetGuestGrants.id, id));
        await ctx.db.insert(customWidgetGuestGrants).values({
          id,
          itemId: input.itemId,
          handler: input.handler,
          artifactDigest: getPackageActionDigest(resolved),
          bindingsDigest,
          allowedInputs: JSON.stringify(input.allowedInputs),
          createdAt: new Date(),
        });
        await publishWidgetPackageChange({
          installationId: resolved.installation.id,
          itemIds: [input.itemId],
          kind: "bindings",
        });
        return { enabled: true };
      });
    }),
  activity: admin
    .input(z.object({ id: z.string(), limit: z.number().int().min(1).max(100).default(30) }))
    .query(({ ctx, input }) =>
      ctx.db.query.customWidgetActivity.findMany({
        where: eq(customWidgetActivity.installationId, input.id),
        orderBy: (table, { desc }) => desc(table.createdAt),
        limit: input.limit,
      }),
    ),
};
