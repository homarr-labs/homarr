import { TRPCError } from "@trpc/server";
import SuperJSON from "superjson";
import { z } from "zod/v4";

import { eq } from "@homarr/db";
import { getServerSettingsAsync } from "@homarr/db/queries";
import { boards, items } from "@homarr/db/schema";

import type { WidgetOptionsSettings } from "../../../../widgets/src";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "../board/board-access";
import { validateTimetableOptionsChangeAsync } from "./timetable";
import { throwIfCustomWidgetPlacementChangeForbidden } from "../board/custom-widget-placement-access";

export const optionsRouter = createTRPCRouter({
  getWidgetOptionSettings: publicProcedure.query(async ({ ctx }): Promise<WidgetOptionsSettings> => {
    const serverSettings = await getServerSettingsAsync(ctx.db);

    return {
      server: {
        board: {
          enableStatusByDefault: serverSettings.board.enableStatusByDefault,
          forceDisableStatus: serverSettings.board.forceDisableStatus,
        },
      },
    };
  }),
  saveItemOptions: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        boardId: z.string(),
        newOptions: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");

      const item = await ctx.db.query.items.findFirst({
        where: eq(items.id, input.itemId),
      });

      if (item?.boardId !== input.boardId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Specified item was not found",
        });
      }

      const previousOptions = SuperJSON.parse<Record<string, unknown>>(item.options);
      const updatedOptions = { ...previousOptions, ...input.newOptions };
      if (item.kind === "timetable") {
        await validateTimetableOptionsChangeAsync(updatedOptions, previousOptions);
      }
      throwIfCustomWidgetPlacementChangeForbidden({
        isAdmin: ctx.session.user.permissions.includes("admin"),
        submittedItems: [{ id: item.id, kind: item.kind, options: updatedOptions }],
        storedItems: [{ id: item.id, kind: item.kind, options: previousOptions }],
      });
      await ctx.db
        .update(items)
        .set({ options: SuperJSON.stringify(updatedOptions) })
        .where(eq(items.id, input.itemId));
    }),
});
