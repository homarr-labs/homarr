import { z } from "zod/v4";

import { randomBytes } from "crypto";

import { hashPasswordAsync } from "@homarr/auth";
import { generateSecureRandomToken } from "@homarr/common/server";
import { and, db, eq, isNotNull } from "@homarr/db";
import { apiKeys } from "@homarr/db/schema";

import { createApiRouter, permissionRequiredProcedure, protectedProcedure } from "../procedure";

const oauthKeyColumns = {
  id: true,
  oauthClientId: true,
  oauthClientName: true,
  oauthRedirectUri: true,
  oauthIssuedAt: true,
} as const;

export const apiKeysRouter = createApiRouter({
  getOwnOAuth: protectedProcedure.meta({ mcp: { enabled: false } }).query(({ context }) => {
    return context.db.query.apiKeys.findMany({
      columns: oauthKeyColumns,
      where: and(eq(apiKeys.userId, context.session.user.id), isNotNull(apiKeys.oauthClientId)),
    });
  }),
  revokeOwnOAuth: protectedProcedure
    .meta({ mcp: { enabled: false } })
    .input(z.object({ apiKeyId: z.string() }))
    .mutation(async ({ context, input }) => {
      await context.db
        .delete(apiKeys)
        .where(
          and(
            eq(apiKeys.id, input.apiKeyId),
            eq(apiKeys.userId, context.session.user.id),
            isNotNull(apiKeys.oauthClientId),
          ),
        );
    }),
  getAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: { enabled: true, description: "List all API keys (admin only)" },
    })
    .query(({ context }) => {
      return context.db.query.apiKeys.findMany({
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
    .mutation(async ({ context }) => {
      const id = randomBytes(4).toString("hex");
      const token = generateSecureRandomToken(24);
      const hashedToken = await hashPasswordAsync(token);
      await db.insert(apiKeys).values({
        id,
        apiKey: hashedToken,
        userId: context.session.user.id,
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
    .mutation(async ({ context, input }) => {
      await context.db.delete(apiKeys).where(eq(apiKeys.id, input.apiKeyId));
    }),
});
