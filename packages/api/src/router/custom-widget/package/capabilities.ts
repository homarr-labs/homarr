import { z } from "zod/v4";

import { eq } from "@homarr/db";
import { boards, customWidgetGuestGrants } from "@homarr/db/schema";

import { throwIfActionForbiddenAsync } from "../../board/board-access";
import { getBindingsDigest } from "./connections";
import { getPackageActionDigest } from "./permissions";
import { packageDigest, resolvePackagePlacement } from "./records";
import type { ResolvedPackagePlacement } from "./records";
import type { PackageContext } from "./types";
import { refreshWidgetActor } from "./actor";

export function getPreviewCapabilities(resolved: ResolvedPackagePlacement) {
  return {
    actions: Object.fromEntries(
      Object.entries(resolved.artifact.manifest.handlers)
        .filter(([, handler]) => handler.kind === "action")
        .map(([name]) => [name, { allowed: true, simulated: !resolved.preview?.liveActions }]),
    ),
  };
}

export async function getWidgetCapabilities(ctx: PackageContext, itemId: string) {
  ctx = await refreshWidgetActor(ctx);
  const resolved = await resolvePackagePlacement(ctx, itemId);
  const actions: Record<string, { allowed: boolean; allowedInputs?: unknown[] }> = {};
  const grants = await ctx.db.query.customWidgetGuestGrants.findMany({
    where: eq(customWidgetGuestGrants.itemId, itemId),
  });
  const bindingsDigest = packageDigest({
    connections: await getBindingsDigest(ctx, resolved.bindings),
    options: resolved.configuration,
  });
  for (const [name, handler] of Object.entries(resolved.artifact.manifest.handlers)) {
    if (handler.kind !== "action") continue;
    if (ctx.session) {
      let allowed = false;
      try {
        await throwIfActionForbiddenAsync(ctx, eq(boards.id, resolved.item.boardId), handler.permission);
        allowed = true;
      } catch {
        /* Return capability status; invocation performs the authoritative permission check. */
      }
      actions[name] = { allowed };
      continue;
    }
    const grant = grants.find(
      (candidate) =>
        candidate.handler === name &&
        candidate.artifactDigest === getPackageActionDigest(resolved) &&
        candidate.bindingsDigest === bindingsDigest,
    );
    const allowed = handler.guestAccess && Boolean(grant);
    actions[name] = { allowed };
    if (allowed && grant) actions[name].allowedInputs = z.array(z.unknown()).parse(JSON.parse(grant.allowedInputs));
  }
  return { actions };
}
