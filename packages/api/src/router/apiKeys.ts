import { z } from "zod/v4";

import { randomBytes } from "crypto";

import { hashPasswordAsync } from "@homarr/auth";
import { generateSecureRandomToken } from "@homarr/common/server";
import { db, eq } from "@homarr/db";
import { apiKeys } from "@homarr/db/schema";

import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";

export const apiKeysRouter = createTRPCRouter({
  getAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: { enabled: true, description: "List all API keys (admin only)" },
    })
    .query(() => {
      return db.query.apiKeys.findMany({
        columns: {
          id: true,
          apiKey: false,
        },
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
        enabled: true,
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
      await ctx.db.delete(apiKeys).where(eq(apiKeys.id, input.apiKeyId)).limit(1);
    }),
});
