import { z } from "zod/v4";

import { randomBytes } from "crypto";

import { hashPasswordAsync } from "@homarr/auth";
import { generateSecureRandomToken } from "@homarr/common/server";
import { and, eq, isNotNull } from "@homarr/db";
import { apiKeys } from "@homarr/db/schema";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure } from "../trpc";

const oauthKeyColumns = {
  id: true,
  readOnly: true,
  oauthClientId: true,
  oauthClientName: true,
  oauthRedirectUri: true,
  oauthIssuedAt: true,
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
    .input(z.object({ readOnly: z.boolean().default(false) }).optional())
    .mutation(async ({ ctx, input }) => {
      const id = randomBytes(4).toString("hex");
      const token = generateSecureRandomToken(24);
      const hashedToken = await hashPasswordAsync(token);
      await ctx.db.insert(apiKeys).values({
        id,
        apiKey: hashedToken,
        userId: ctx.session.user.id,
        readOnly: input?.readOnly ?? false,
      });
      return {
        apiKey: `${id}.${token}`,
      };
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
