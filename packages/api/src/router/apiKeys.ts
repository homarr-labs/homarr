import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { randomBytes } from "crypto";

import { hashPasswordAsync } from "@homarr/auth";
import { generateSecureRandomToken } from "@homarr/common/server";
import { and, db, eq, isNotNull } from "@homarr/db";
import { apiKeys } from "@homarr/db/schema";
import { apiKeyRestrictionsSchema, createRestrictedApiKeySchema } from "@homarr/validation/api-key";

import { getIntegrationForHttpRequest } from "./integration/integration-http";
import { resolveIntegrationRequestUrl } from "./integration/integration-request";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure } from "../trpc";

const oauthKeyColumns = {
  id: true,
  oauthClientId: true,
  oauthClientName: true,
  oauthRedirectUri: true,
  oauthIssuedAt: true,
  restrictions: true,
} as const;

export const apiKeysRouter = createTRPCRouter({
  getOwnOAuth: protectedProcedure.meta({ mcp: { enabled: false } }).query(({ ctx }) => {
    return ctx.db.query.apiKeys.findMany({
      columns: oauthKeyColumns,
      where: and(eq(apiKeys.userId, ctx.session.user.id), isNotNull(apiKeys.oauthClientId)),
    });
  }),
  revokeOwnOAuth: protectedProcedure
    .meta({ mcp: { enabled: false } })
    .input(z.object({ apiKeyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(apiKeys)
        .where(
          and(
            eq(apiKeys.id, input.apiKeyId),
            eq(apiKeys.userId, ctx.session.user.id),
            isNotNull(apiKeys.oauthClientId),
          ),
        );
    }),
  getAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: { enabled: true, description: "List all API keys (admin only)" },
    })
    .query(({ ctx }) => {
      return ctx.db.query.apiKeys.findMany({
        columns: oauthKeyColumns,
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              image: true,
              email: true,
            },
          },
        },
      });
    }),
  create: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: false,
        description: "Create a new API key for the current user (admin only)",
      },
    })
    .mutation(async ({ ctx }) => {
      const id = randomBytes(4).toString("hex");
      const token = generateSecureRandomToken(24);
      const hashedToken = await hashPasswordAsync(token);
      await db.insert(apiKeys).values({
        id,
        apiKey: hashedToken,
        userId: ctx.session.user.id,
      });
      return {
        apiKey: `${id}.${token}`,
      };
    }),
  createRestricted: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({ mcp: { enabled: false } })
    .input(createRestrictedApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      const endpoints = [];
      for (const endpoint of input.endpoints) {
        const integration = await getIntegrationForHttpRequest(ctx, endpoint.integrationId);
        // Validate the saved base and confinement before issuing a credential.
        resolveIntegrationRequestUrl(integration.url, endpoint.path);
        endpoints.push({ ...endpoint, integrationUrl: integration.url, integrationKind: integration.kind });
      }
      const restrictions = apiKeyRestrictionsSchema.parse({ version: 1, endpoints });
      const serialized = JSON.stringify(restrictions);
      if (Buffer.byteLength(serialized) > 64 * 1024) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "API key restrictions exceed 64 KiB" });
      }
      const id = randomBytes(4).toString("hex");
      const token = generateSecureRandomToken(24);
      await ctx.db.insert(apiKeys).values({
        id,
        apiKey: await hashPasswordAsync(token),
        userId: ctx.session.user.id,
        restrictions: serialized,
      });
      return { apiKey: `${id}.${token}` };
    }),
  delete: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description: "Delete an API key by ID (admin only). REQUIRED: apiKeyId (string)",
      },
    })
    .input(z.object({ apiKeyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(apiKeys).where(eq(apiKeys.id, input.apiKeyId));
    }),
});
