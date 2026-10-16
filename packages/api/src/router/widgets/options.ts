import { ApiError } from "../../procedure";
import SuperJSON from "superjson";
import { z } from "zod/v4";

import { eq } from "@homarr/db";
import { getServerSettingsAsync } from "@homarr/db/queries";
import { boards, items } from "@homarr/db/schema";

import type { WidgetOptionsSettings } from "../../../../widgets/src";
import { createApiRouter, protectedProcedure, publicProcedure } from "../../procedure";
import { throwIfActionForbiddenAsync } from "../board/board-access";
import { validateTimetableOptionsChangeAsync } from "./timetable";
import { throwIfCustomWidgetPlacementChangeForbidden } from "../board/custom-widget-placement-access";

export const optionsRouter = createApiRouter({
  getWidgetOptionSettings: publicProcedure.query(async ({ context }): Promise<WidgetOptionsSettings> => {
    const serverSettings = await getServerSettingsAsync(context.db);

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
    .mutation(async ({ context, input }) => {
      await throwIfActionForbiddenAsync(context, eq(boards.id, input.boardId), "modify");

      const item = await context.db.query.items.findFirst({
        where: eq(items.id, input.itemId),
      });

      if (item?.boardId !== input.boardId) {
        throw new ApiError({
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
        isAdmin: context.session.user.permissions.includes("admin"),
        submittedItems: [{ id: item.id, kind: item.kind, options: updatedOptions }],
        storedItems: [{ id: item.id, kind: item.kind, options: previousOptions }],
      });
      await context.db
        .update(items)
        .set({ options: SuperJSON.stringify(updatedOptions) })
        .where(eq(items.id, input.itemId));
    }),
});
