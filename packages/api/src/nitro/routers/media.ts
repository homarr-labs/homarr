import { ORPCError } from "@orpc/server";
import { snapshotPolicyIdentity } from "@homarr/auth/nitro/policy";
import { paginatedSchema } from "@homarr/validation/common";
import { z } from "zod/v4";

import { backendContractRevision } from "../context";
import { defineBackendContribution } from "../contribution";
import { authenticatedProcedure } from "../procedure";
import type { MediaProcedureResources } from "./-media/resources";

export type { MediaProcedureResources, MediaReadLease } from "./-media/resources";

export const mediaImplementedPaths = ["media.getPaginated"] as const;
export const mediaPendingPaths = ["media.uploadMedia", "media.deleteMedia"] as const;
export const mediaSourceBindings = [
  { path: "media.getPaginated", sourceFile: "packages/api/src/router/medias/media-router.ts", status: "native" },
  {
    path: "media.uploadMedia",
    sourceFile: "packages/api/src/router/medias/media-router.ts",
    status: "pending",
    reason: "Concrete dual-engine atomic media insert and optional local-icon insert plan is not accepted.",
  },
  {
    path: "media.deleteMedia",
    sourceFile: "packages/api/src/router/medias/media-router.ts",
    status: "pending",
    reason: "Concrete dual-engine atomic authorized media and matching local-icon deletion plan is not accepted.",
  },
] as const;

export const mediaPaginationInputSchema = paginatedSchema.and(
  z.object({ includeFromAllUsers: z.boolean().default(false), search: z.string().trim().default("") }),
);

export function createMediaProcedures(resources: MediaProcedureResources) {
  const { medias } = resources.tables;
  const { and, desc, eq, like } = resources.operators;
  return {
    getPaginated: authenticatedProcedure({
      path: "media.getPaginated",
      kind: "query",
      access: { kind: "protected" },
      demo: "guarded",
    })
      .input(mediaPaginationInputSchema)
      .handler(async ({ input, context }) => {
        context.signal.throwIfAborted();
        const lease = await resources.acquireReadAsync(context);
        try {
          context.signal.throwIfAborted();
          await lease.assertCurrentAsync();
          if (lease.principal.kind !== "authenticated" || lease.principal.user.id !== context.principal.user.id)
            throw new ORPCError("UNAUTHORIZED");
          const identity = snapshotPolicyIdentity({
            type: "authenticated",
            userId: lease.principal.user.id,
            permissions: lease.principal.user.permissions,
            groupIds: [],
          });
          if (identity.type !== "authenticated") throw new ORPCError("UNAUTHORIZED");
          const includeFromAllUsers = identity.permissions.includes("media-view-all") && input.includeFromAllUsers;
          const where = and(
            input.search.length >= 1 ? like(medias.name, `%${input.search}%`) : undefined,
            includeFromAllUsers ? undefined : eq(medias.creatorId, identity.userId),
          );
          context.signal.throwIfAborted();
          const dbMedias = await lease.db.query.medias.findMany({
            where,
            orderBy: desc(medias.createdAt),
            limit: input.pageSize,
            offset: (input.page - 1) * input.pageSize,
            columns: { content: false },
            with: { creator: { columns: { id: true, name: true, image: true, email: true } } },
          });
          await lease.assertCurrentAsync();
          context.signal.throwIfAborted();
          const totalCount = await lease.db.$count(medias, where);
          await lease.assertCurrentAsync();
          context.signal.throwIfAborted();
          return { items: dbMedias, totalCount };
        } finally {
          await lease.releaseAsync();
          context.signal.throwIfAborted();
        }
      }),
  };
}

export function createMediaContribution(resources: MediaProcedureResources) {
  return defineBackendContribution({
    revision: backendContractRevision,
    id: "homarr.media.source-port.v2",
    router: { media: createMediaProcedures(resources) },
    leaves: mediaImplementedPaths,
  });
}
