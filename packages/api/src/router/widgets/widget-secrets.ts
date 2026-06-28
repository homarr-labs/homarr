import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { encryptSecret } from "@homarr/common/server";
import { and, eq, handleTransactionsAsync } from "@homarr/db";
import { boards, items, widgetSecrets } from "@homarr/db/schema";
import { releaseProviderKinds } from "@homarr/definitions";

import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "../board/board-access";

const secretKindSchema = z.enum(releaseProviderKinds);

const resolveItemWithBoardAccess = async (ctx: { db: any; session: any }, itemId: string) => {
  const item = await ctx.db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item || item.kind !== "releases") throw new TRPCError({ code: "NOT_FOUND" });
  await throwIfActionForbiddenAsync(ctx, eq(boards.id, item.boardId), "modify");
  return item;
};

export const widgetSecretsRouter = createTRPCRouter({
  setSecret: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Set an authentication token for a release provider on a specific releases widget. Requires modify permission on the widget's board. Use widget_secrets_getConfiguredKinds to check existing tokens",
      },
    })
    .input(z.object({ itemId: z.string(), kind: secretKindSchema, value: z.string().min(1).max(4096) }))
    .mutation(async ({ ctx, input }) => {
      await resolveItemWithBoardAccess(ctx, input.itemId);

      const encrypted = encryptSecret(input.value);
      const row = { itemId: input.itemId, kind: input.kind, value: encrypted, updatedAt: new Date() };

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (tx) => {
            await tx
              .delete(schema.widgetSecrets)
              .where(and(eq(schema.widgetSecrets.itemId, input.itemId), eq(schema.widgetSecrets.kind, input.kind)));
            await tx.insert(schema.widgetSecrets).values(row);
          });
        },
        handleSync(db) {
          db.transaction((tx) => {
            tx.delete(widgetSecrets)
              .where(and(eq(widgetSecrets.itemId, input.itemId), eq(widgetSecrets.kind, input.kind)))
              .run();
            tx.insert(widgetSecrets).values(row).run();
          });
        },
      });
    }),

  deleteSecret: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Remove an authentication token for a release provider from a specific releases widget. Requires modify permission on the widget's board",
      },
    })
    .input(z.object({ itemId: z.string(), kind: secretKindSchema }))
    .mutation(async ({ ctx, input }) => {
      await resolveItemWithBoardAccess(ctx, input.itemId);

      await ctx.db
        .delete(widgetSecrets)
        .where(and(eq(widgetSecrets.itemId, input.itemId), eq(widgetSecrets.kind, input.kind)));
    }),

  getConfiguredKinds: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "List which release provider kinds have tokens configured for a releases widget. Returns an array of provider kind strings (e.g. github, gitlab, dockerHub). Requires modify permission on the widget's board",
      },
    })
    .input(z.object({ itemId: z.string() }))
    .query(async ({ ctx, input }) => {
      await resolveItemWithBoardAccess(ctx, input.itemId);

      try {
        const secrets = await ctx.db.query.widgetSecrets.findMany({
          where: eq(widgetSecrets.itemId, input.itemId),
          columns: { kind: true },
        });
        return secrets.map((s: { kind: string }) => s.kind);
      } catch {
        // ponytail: table may not exist pre-migration, return empty
        return [] as string[];
      }
    }),
});
