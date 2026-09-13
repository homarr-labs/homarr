import { z } from "zod/v4";

import { hashPasswordAsync } from "@homarr/auth";
import { createId } from "@homarr/common";
import { generateSecureRandomToken } from "@homarr/common/server";
import { eq } from "@homarr/db";
import { apiKeys } from "@homarr/db/schema";

import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";

const apiKeySchema = z.object({
  id: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    image: z.string().nullable(),
    email: z.string().nullable(),
  }),
});

export const apiKeysRouter = createTRPCRouter({
  getAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      openapi: { method: "GET", path: "/api/apikeys", tags: ["apikeys"], protect: true },
      mcp: {
        enabled: true,
        description:
          "List all API keys without their secret values (admin only). Pass the returned id to apiKeys_delete when removing a key",
      },
    })
    .input(z.void())
    .output(z.array(apiKeySchema))
    .query(({ ctx }) => {
      return ctx.db.query.apiKeys.findMany({
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
      openapi: { method: "POST", path: "/api/apikeys", tags: ["apikeys"], protect: true },
      mcp: {
        enabled: true,
        description: "Create a new API key for the current user (admin only)",
      },
    })
    .input(z.void())
    .output(z.object({ apiKey: z.string() }))
    .mutation(async ({ ctx }) => {
      const id = createId();
      const token = generateSecureRandomToken(24);
      const hashedToken = await hashPasswordAsync(token);
      await ctx.db.insert(apiKeys).values({
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
      openapi: { method: "DELETE", path: "/api/apikeys/{apiKeyId}", tags: ["apikeys"], protect: true },
      mcp: {
        enabled: true,
        description: "Delete an API key by ID (admin only). REQUIRED: apiKeyId (string)",
      },
    })
    .input(z.object({ apiKeyId: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(apiKeys).where(eq(apiKeys.id, input.apiKeyId)).limit(1);
    }),
});
