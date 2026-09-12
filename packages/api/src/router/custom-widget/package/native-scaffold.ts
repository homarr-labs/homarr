import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { encryptSecret } from "@homarr/common/server";
import { eq, inArray } from "@homarr/db";
import { boards, customWidgetConnections, integrationItems, integrations, items } from "@homarr/db/schema";
import { customWidgetPackageSchema } from "@homarr/custom-widgets/package";
import { getIntegrationKindsByCategory } from "@homarr/definitions";
import type { IntegrationKind } from "@homarr/definitions";
import { widgetReferencePackages } from "@homarr/widget-sdk/examples";

import { permissionRequiredProcedure } from "../../../trpc";
import { throwIfActionForbiddenAsync } from "../../board/board-access";
import { connectionConfigurationSchema } from "./connections";

const starters = [
  "clock",
  "timer",
  "beszel",
  "downloads",
  "sonarr",
  "media",
  "checklist",
  "rack",
  "backup",
  "household",
  "overview",
  "sqlite",
  "mqtt",
] as const;

function acceptedIntegrationKinds(starter: (typeof starters)[number], connection: string): readonly IntegrationKind[] {
  if (starter === "downloads" || connection === "client") return getIntegrationKindsByCategory("downloadClient");
  if (starter === "media" || connection === "media") return getIntegrationKindsByCategory("mediaService");
  if (starter === "sonarr") return ["sonarr"];
  if (starter === "beszel" || connection === "beszel") return ["beszel"];
  return [];
}

export const nativeScaffoldProcedures = {
  prepareNative: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ sourceItemId: z.string(), starter: z.enum(starters) }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.query.items.findFirst({ where: eq(items.id, input.sourceItemId) });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, item.boardId), "modify");
      const source = customWidgetPackageSchema.parse(widgetReferencePackages[input.starter]);
      const attached = await ctx.db.query.integrationItems.findMany({ where: eq(integrationItems.itemId, item.id) });
      const bound = await ctx.db.query.integrations.findMany({
        where: inArray(
          integrations.id,
          attached.map(({ integrationId }) => integrationId),
        ),
      });
      const bindings: Record<string, string> = {};
      const usedIntegrationIds = new Set<string>();
      for (const [name, requirement] of Object.entries(source.connections)) {
        if (requirement.kind !== "integration") continue;
        const accepted = acceptedIntegrationKinds(input.starter, name);
        const integration = bound.find(
          (candidate) => accepted.includes(candidate.kind) && !usedIntegrationIds.has(candidate.id),
        );
        if (!integration) continue;
        usedIntegrationIds.add(integration.id);
        let connection = await ctx.db.query.customWidgetConnections.findFirst({
          where: eq(customWidgetConnections.integrationId, integration.id),
        });
        if (!connection) {
          const id = createId();
          const row = {
            id,
            name: integration.name,
            integrationId: integration.id,
            configuration: JSON.stringify(connectionConfigurationSchema.parse({ kind: "integration" })),
            encryptedSecrets: encryptSecret("{}"),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          await ctx.db.insert(customWidgetConnections).values(row);
          connection = row;
        }
        bindings[name] = connection.id;
      }
      return { name: `${source.manifest.name} (custom)`, source, bindings, sourceBoardId: item.boardId };
    }),
};
