import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { encryptSecret } from "@homarr/common/server";
import { and, eq } from "@homarr/db";
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
    .input(z.object({ itemId: z.string(), kind: secretKindSchema, value: z.string().min(1).max(4096) }))
    .mutation(async ({ ctx, input }) => {
      await resolveItemWithBoardAccess(ctx, input.itemId);

      await ctx.db
        .delete(widgetSecrets)
        .where(and(eq(widgetSecrets.itemId, input.itemId), eq(widgetSecrets.kind, input.kind)));

      await ctx.db.insert(widgetSecrets).values({
        itemId: input.itemId,
        kind: input.kind,
        value: encryptSecret(input.value),
        updatedAt: new Date(),
      });
    }),

  deleteSecret: protectedProcedure
    .input(z.object({ itemId: z.string(), kind: secretKindSchema }))
    .mutation(async ({ ctx, input }) => {
      await resolveItemWithBoardAccess(ctx, input.itemId);

      await ctx.db
        .delete(widgetSecrets)
        .where(and(eq(widgetSecrets.itemId, input.itemId), eq(widgetSecrets.kind, input.kind)));
    }),

  getConfiguredKinds: protectedProcedure.input(z.object({ itemId: z.string() })).query(async ({ ctx, input }) => {
    await resolveItemWithBoardAccess(ctx, input.itemId);

    const secrets = await ctx.db.query.widgetSecrets.findMany({
      where: eq(widgetSecrets.itemId, input.itemId),
      columns: { kind: true },
    });
    return secrets.map((s: { kind: string }) => s.kind);
  }),
});
