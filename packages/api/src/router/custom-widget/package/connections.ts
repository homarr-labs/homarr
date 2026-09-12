import { widgetPackageAdminProcedure } from "./procedure";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { decryptSecret, encryptSecret } from "@homarr/common/server";
import { eq } from "@homarr/db";
import { customWidgetConnections, integrations } from "@homarr/db/schema";

import { packageDigest } from "./records";
import type { PackageContext } from "./types";
import { withWidgetConnectionChange } from "./connection-changes";

export const connectionConfigurationSchema = z.object({
  kind: z.enum(["http", "integration", "service"]).default("http"),
  serviceType: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z][A-Za-z0-9._-]*$/u)
    .optional(),
  settings: z.record(z.string(), z.json()).optional(),
  baseUrl: z.string().url().optional(),
  browserUrl: z.string().url().optional(),
  auth: z.enum(["none", "basic", "bearer", "headers", "query", "cookie"]).default("none"),
  headers: z.record(z.string(), z.string()).default({}),
  tls: z
    .object({ rejectUnauthorized: z.boolean().default(true), ca: z.string().optional(), cert: z.string().optional() })
    .optional(),
  maxResponseBytes: z
    .number()
    .int()
    .min(1024)
    .max(64 * 1024 * 1024)
    .default(16 * 1024 * 1024),
  timeoutMs: z.number().int().min(100).max(300_000).default(30_000),
});

export async function getBoundConnection(ctx: PackageContext, bindings: Record<string, string>, name: string) {
  const id = bindings[name];
  if (!id) throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Connection '${name}' needs setup` });
  const row = await ctx.db.query.customWidgetConnections.findFirst({ where: eq(customWidgetConnections.id, id) });
  if (!row) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Bound connection is unavailable" });
  const configuration = connectionConfigurationSchema.parse(JSON.parse(row.configuration));
  const secrets = z
    .record(z.string(), z.string())
    .parse(JSON.parse(decryptSecret(row.encryptedSecrets as `${string}.${string}`)));
  return { row, configuration, secrets };
}

export async function getBindingsDigest(ctx: PackageContext, bindings: Record<string, string>) {
  const rows = await Promise.all(
    Object.entries(bindings)
      .toSorted()
      .map(async ([name, id]) => {
        const row = await ctx.db.query.customWidgetConnections.findFirst({ where: eq(customWidgetConnections.id, id) });
        let integration;
        if (row?.integrationId)
          integration = await ctx.db.query.integrations.findFirst({
            where: eq(integrations.id, row.integrationId),
            with: { secrets: true },
          });
        return {
          name,
          id,
          configuration: row?.configuration,
          encryptedSecrets: row?.encryptedSecrets,
          integration: integration && {
            id: integration.id,
            url: integration.url,
            kind: integration.kind,
            secrets: integration.secrets.map(({ kind, value }) => ({ kind, value })),
          },
        };
      }),
  );
  return packageDigest(rows);
}

const admin = widgetPackageAdminProcedure;
export const packageConnectionProcedures = {
  connections: admin.query(async ({ ctx }) => {
    const rows = await ctx.db.query.customWidgetConnections.findMany();
    return rows.map(({ encryptedSecrets: _secrets, ...row }) => ({
      ...row,
      configuration: JSON.parse(row.configuration) as unknown,
    }));
  }),
  saveConnection: admin
    .input(
      z
        .object({
          id: z.string().optional(),
          name: z.string().trim().min(1).max(128),
          integrationId: z.string().nullable().default(null),
          configuration: connectionConfigurationSchema,
          secrets: z.record(z.string(), z.string()).optional(),
          secretUpdates: z.record(z.string(), z.string()).optional(),
        })
        .refine((input) => !input.secretUpdates || (Boolean(input.id) && !input.secrets), {
          message: "Patch existing credentials or replace them; do not supply both",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = input.id ?? createId();
      const existing = input.id
        ? await ctx.db.query.customWidgetConnections.findFirst({ where: eq(customWidgetConnections.id, id) })
        : null;
      if (input.id && !existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (input.configuration.kind === "integration") {
        if (!input.integrationId) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an integration" });
        const integration = await ctx.db.query.integrations.findFirst({
          where: eq(integrations.id, input.integrationId),
        });
        if (!integration) throw new TRPCError({ code: "NOT_FOUND", message: "Integration not found" });
      } else if (input.configuration.kind === "service") {
        if (!input.configuration.serviceType)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Choose a service type, such as mqtt, sqlite, ssh or custom",
          });
      } else if (!input.configuration.baseUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A connection URL is required" });
      }
      const row = {
        id,
        name: input.name,
        integrationId: input.configuration.kind === "integration" ? input.integrationId : null,
        configuration: JSON.stringify(input.configuration),
        encryptedSecrets: existing?.encryptedSecrets ?? encryptSecret("{}"),
        updatedAt: new Date(),
      };
      if (existing) {
        await withWidgetConnectionChange(ctx, id, async () => {
          const current = await ctx.db.query.customWidgetConnections.findFirst({
            where: eq(customWidgetConnections.id, id),
          });
          if (!current) throw new TRPCError({ code: "NOT_FOUND" });
          row.encryptedSecrets = current.encryptedSecrets;
          if (input.secrets) row.encryptedSecrets = encryptSecret(JSON.stringify(input.secrets));
          if (input.secretUpdates) {
            const savedConfiguration = connectionConfigurationSchema.parse(JSON.parse(current.configuration));
            if (
              savedConfiguration.kind !== input.configuration.kind ||
              savedConfiguration.auth !== input.configuration.auth
            )
              throw new TRPCError({
                code: "CONFLICT",
                message: "Authentication changed; reload the connection before editing credentials",
              });
            const savedSecrets = z
              .record(z.string(), z.string())
              .parse(JSON.parse(decryptSecret(current.encryptedSecrets as `${string}.${string}`)));
            row.encryptedSecrets = encryptSecret(JSON.stringify({ ...savedSecrets, ...input.secretUpdates }));
          }
          await ctx.db.update(customWidgetConnections).set(row).where(eq(customWidgetConnections.id, id));
        });
      } else {
        if (input.secrets) row.encryptedSecrets = encryptSecret(JSON.stringify(input.secrets));
        await ctx.db.insert(customWidgetConnections).values({ ...row, createdAt: new Date() });
      }
      return { id };
    }),
};
