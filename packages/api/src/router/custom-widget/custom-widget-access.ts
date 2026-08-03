import { TRPCError } from "@trpc/server";
import { parse } from "superjson";
import { z } from "zod/v4";

import type { Session } from "@homarr/auth";
import type { Database } from "@homarr/db";
import { and, eq } from "@homarr/db";
import { boards, items } from "@homarr/db/schema";
import type { BoardPermission } from "@homarr/definitions";

import { throwIfActionForbiddenAsync } from "../board/board-access";

export const customApiItemInputSchema = z.object({
  boardId: z.string().min(1).max(100),
  itemId: z.string().min(1).max(100),
  definitionId: z.string().min(1).max(100),
});

const customApiOptionsSchema = z.object({ definitionId: z.string() }).passthrough();

export async function assertCustomApiItemBindingAsync(
  ctx: { db: Database; session: Session | null },
  input: z.infer<typeof customApiItemInputSchema>,
  permission?: BoardPermission,
) {
  const item = await ctx.db.query.items.findFirst({
    columns: { options: true },
    where: and(eq(items.id, input.itemId), eq(items.boardId, input.boardId), eq(items.kind, "customApi")),
  });

  if (!item) throwCustomApiWidgetNotFound();
  if (permission) await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), permission);

  try {
    const options = customApiOptionsSchema.parse(parse<unknown>(item.options));
    if (options.definitionId !== input.definitionId) throwCustomApiWidgetNotFound();
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throwCustomApiWidgetNotFound();
  }
}

function throwCustomApiWidgetNotFound(): never {
  throw new TRPCError({ code: "NOT_FOUND", message: "Custom API widget not found" });
}
