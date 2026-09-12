import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { decryptSecret, encryptSecret } from "@homarr/common/server";
import { eq, handleTransactionsAsync } from "@homarr/db";
import { customWidgetConnections, customWidgetDefinitions, customWidgetInstallations } from "@homarr/db/schema";

import { parseStoredCustomWidgetDefinition } from "../stored-definition";
import { convertLegacyWidgetSource } from "./conversion-source";
import { widgetPackageAdminProcedure } from "./procedure";
import { packageConversionPlacementProcedures } from "./conversion-placement";

export const packageConversionProcedures = {
  ...packageConversionPlacementProcedures,
  convertV2: widgetPackageAdminProcedure
    .input(z.object({ definitionId: z.string().min(1), name: z.string().trim().min(1).max(128).optional() }))
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.definitionId),
        with: { secrets: true },
      });
      if (!original) throw new TRPCError({ code: "NOT_FOUND", message: "Custom JSX definition not found" });
      const widget = parseStoredCustomWidgetDefinition(original);
      const id = createId();
      const name = input.name ?? widget.name;
      const source = convertLegacyWidgetSource(widget, `homarr.converted.${createId()}`, name);
      const bindings: Record<string, string> = {};
      const connections = Object.entries(widget.sources).map(([sourceId, entry]) => {
        const connectionId = createId();
        bindings[sourceId] = connectionId;
        const originalSecrets = Object.fromEntries(
          original.secrets
            .filter((secret) => secret.sourceId === sourceId)
            .map((secret) => [secret.kind, decryptSecret(secret.encryptedValue)]),
        );
        let secrets: Record<string, string> = {};
        let auth = "none";
        if (entry.auth === "basic") {
          auth = "basic";
          secrets = { username: originalSecrets.username ?? "", password: originalSecrets.password ?? "" };
        }
        if (entry.auth === "bearer") {
          auth = "bearer";
          secrets = { token: originalSecrets.apiKey ?? "" };
        }
        if (typeof entry.auth === "object") {
          auth = "headers";
          if (entry.auth.type === "apiKeyQuery") auth = "query";
          secrets = { [entry.auth.name]: originalSecrets.apiKey ?? "" };
        }
        return {
          id: connectionId,
          name: `${name}: ${entry.name ?? sourceId}`.slice(0, 128),
          integrationId: null,
          configuration: JSON.stringify({ kind: "http", baseUrl: entry.baseUrl, auth, headers: {} }),
          encryptedSecrets: encryptSecret(JSON.stringify(secrets)),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });
      const installation = {
        id,
        name,
        draft: JSON.stringify(source),
        bindings: JSON.stringify(bindings),
        enabled: false,
        origin: JSON.stringify({ kind: "converted-v2", definitionId: input.definitionId }),
        creatorId: ctx.session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await handleTransactionsAsync(ctx.db, {
        async handleAsync(database, schema) {
          await database.transaction(async (tx) => {
            if (connections.length > 0) await tx.insert(schema.customWidgetConnections).values(connections);
            await tx.insert(schema.customWidgetInstallations).values(installation);
          });
        },
        handleSync(database) {
          database.transaction((tx) => {
            if (connections.length > 0) tx.insert(customWidgetConnections).values(connections).run();
            tx.insert(customWidgetInstallations).values(installation).run();
          });
        },
      });
      return { id, managementPath: `/manage/custom-widgets/packages/${id}` };
    }),
};
