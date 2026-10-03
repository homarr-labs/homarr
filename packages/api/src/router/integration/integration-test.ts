import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { eq } from "@homarr/db";
import { integrations } from "@homarr/db/schema";

import { protectedProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "./integration-access";
import { testConnectionAsync } from "./integration-test-connection";

export const integrationTestProcedure = protectedProcedure
  .meta({
    mcp: {
      enabled: true,
      description:
        "Test a saved integration's native connection using its stored credentials without changing it. REQUIRED: id from integration_all. Requires permissions.hasFullAccess. Returns success or a sanitized error type; success is a connection test, not verification of every integration capability.",
    },
  })
  .input(z.object({ id: z.string().min(1).max(128) }).strict())
  .query(async ({ ctx, input }) => {
    const where = eq(integrations.id, input.id);
    await throwIfActionForbiddenAsync(ctx, where, "full");
    const integration = await ctx.db.query.integrations.findFirst({ where, with: { secrets: true } });
    if (!integration) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Integration not found" });
    }

    try {
      const result = await testConnectionAsync({ ...integration, secrets: [] }, integration.secrets);
      if (result.success) return { success: true } as const;
      // Upstream error messages, causes, URLs and metadata can contain credentials.
      return { success: false, error: { type: result.error.type } } as const;
    } catch {
      return { success: false, error: { type: "unknown" } } as const;
    }
  });
