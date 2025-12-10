import { TRPCError } from "@trpc/server";
import SuperJSON from "superjson";
import z from "zod";

import { createId, objectEntries } from "@homarr/common";
import type { InferInsertModel } from "@homarr/db";
import { and, eq, handleTransactionsAsync } from "@homarr/db";
import { createDbInsertCollectionWithoutTransaction } from "@homarr/db/collection";
import { boards, itemLayouts, items } from "@homarr/db/schema";
import { selectItemLayoutSchema, selectitemSchema } from "@homarr/db/validationSchemas";
import type { WidgetKind } from "@homarr/definitions";
import { widgetKinds } from "@homarr/definitions";
import { byIdSchema } from "@homarr/validation/common";
import { zodEnumFromArray } from "@homarr/validation/enums";
import { itemAdvancedOptionsSchema } from "@homarr/validation/shared";

import { reduceWidgetOptionsWithDefaultValues, widgetImports } from "../../../../widgets/src";
import type { WidgetOptionDefinition } from "../../../../widgets/src/options";
import { convertIntersectionToZodObject } from "../../schema-merger";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "../board/board-access";

const createItemOptionsSchema = (kind: WidgetKind): z.ZodObject =>
  z.object(
    objectEntries(
      widgetImports[kind].definition.createOptions({
        enableStatusByDefault: true,
        firstDayOfWeek: 1,
        forceDisableStatus: false,
      }),
    ).reduce(
      (previous, [key, value]: [string, WidgetOptionDefinition]) => {
        previous[key] = value.validate;
        return previous;
      },
      {} as Record<string, z.ZodType>,
    ),
  );

const outputItemSchema = z.union([
  ...widgetKinds.map((kind) =>
    z
      .object({
        kind: z.literal(kind),
        options: createItemOptionsSchema(kind),
        advancedOptions: itemAdvancedOptionsSchema,
        layouts: z.array(selectItemLayoutSchema.omit({ itemId: true })),
      })
      .and(
        selectitemSchema.pick({
          id: true,
          boardId: true,
        }),
      ),
  ),
]);

const manageItemSchema = z.object({
  boardId: z.string(),
  kind: zodEnumFromArray(widgetKinds),
  options: z.record(z.string(), z.unknown().optional()),
  advancedOptions: itemAdvancedOptionsSchema,
  layouts: z.array(selectItemLayoutSchema.omit({ itemId: true })),
});

export const itemsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
      }),
    )
    .output(z.array(outputItemSchema))
    .meta({
      openapi: {
        method: "GET",
        path: "/api/boards/{boardId}/items",
        tags: ["items"],
        protect: true,
        summary: "Retrieve all items for board",
      },
    })
    .query(async ({ ctx, input }) => {
      const board = await ctx.db.query.boards.findFirst({
        where: (fields, { eq }) => eq(fields.id, input.boardId),
        with: {
          items: {
            with: {
              layouts: true,
            },
          },
        },
      });

      const error = new TRPCError({
        code: "NOT_FOUND",
        message: "Board not found",
      });

      if (!board) throw error;
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "view", error);

      return board.items.map((item) => ({
        ...item,
        options: reduceWidgetOptionsWithDefaultValues(
          item.kind,
          {
            enableStatusByDefault: true,
            firstDayOfWeek: 1,
            forceDisableStatus: false,
          },
          SuperJSON.parse(item.options),
        ),
        advancedOptions: itemAdvancedOptionsSchema.parse(SuperJSON.parse(item.advancedOptions)),
        layouts: item.layouts.map(({ itemId: _, ...layout }) => layout),
      }));
    }),
  createItem: protectedProcedure
    .input(manageItemSchema)
    .output(outputItemSchema)
    .meta({
      openapi: {
        method: "POST",
        path: "/api/items",
        tags: ["items"],
        protect: true,
        summary: "Create item on board",
        description: "Options available can be viewed in response options object. Input options are optional",
      },
    })
    .mutation(async ({ ctx, input }) => {
      const board = await ctx.db.query.boards.findFirst({
        where: (fields, { eq }) => eq(fields.id, input.boardId),
      });

      const error = new TRPCError({
        code: "NOT_FOUND",
        message: "Board not found",
      });

      if (!board) throw error;
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, board.id), "modify", error);

      const itemOptionsSchema = createItemOptionsSchema(input.kind);
      const fullOptions = reduceWidgetOptionsWithDefaultValues(
        input.kind,
        { enableStatusByDefault: true, firstDayOfWeek: 1, forceDisableStatus: false },
        input.options,
      );
      const result = await itemOptionsSchema.safeParseAsync(fullOptions);
      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to parse item options",
          cause: result.error,
        });
      }

      const item = {
        id: createId(),
        boardId: input.boardId,
        kind: input.kind,
        advancedOptions: input.advancedOptions,
        options: result.data,
      };

      const itemInsert: InferInsertModel<typeof items> = {
        ...item,
        advancedOptions: SuperJSON.stringify(item.advancedOptions),
        options: SuperJSON.stringify(item.options),
      };
      const layoutInserts: InferInsertModel<typeof itemLayouts>[] = input.layouts.map((layout) => ({
        ...layout,
        itemId: item.id,
      }));

      const insertCollection = createDbInsertCollectionWithoutTransaction(["items", "itemLayouts"]);
      insertCollection.items.push(itemInsert);
      insertCollection.itemLayouts.push(...layoutInserts);
      await insertCollection.insertAllAsync(ctx.db);

      return {
        ...item,
        layouts: layoutInserts,
      };
    }),
  getItem: protectedProcedure
    .input(byIdSchema)
    .output(outputItemSchema)
    .meta({
      openapi: {
        method: "GET",
        path: "/api/items/{id}",
        tags: ["items"],
        protect: true,
        summary: "Retrieve item from a board",
      },
    })
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.query.items.findFirst({
        where: (fields, { eq }) => eq(fields.id, input.id),
        with: {
          layouts: true,
        },
      });

      const error = new TRPCError({
        code: "NOT_FOUND",
        message: "Item not found",
      });

      if (!item) throw error;
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, item.boardId), "view", error);

      return {
        ...item,
        options: reduceWidgetOptionsWithDefaultValues(
          item.kind,
          {
            enableStatusByDefault: true,
            firstDayOfWeek: 1,
            forceDisableStatus: false,
          },
          SuperJSON.parse(item.options),
        ),
        advancedOptions: itemAdvancedOptionsSchema.parse(SuperJSON.parse(item.advancedOptions)),
        layouts: item.layouts.map(({ itemId: _, ...layout }) => layout),
      };
    }),
  updateItem: protectedProcedure
    .input(convertIntersectionToZodObject(manageItemSchema.omit({ boardId: true, kind: true }).and(byIdSchema)))
    .output(outputItemSchema)
    .meta({
      openapi: {
        method: "PUT",
        path: "/api/items/{id}",
        tags: ["items"],
        protect: true,
        summary: "Update an item on the board",
      },
    })
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.query.items.findFirst({
        where: (fields, { eq }) => eq(fields.id, input.id),
        with: {
          layouts: true,
        },
      });

      const error = new TRPCError({
        code: "NOT_FOUND",
        message: "Item not found",
      });
      if (!item) throw error;

      await throwIfActionForbiddenAsync(ctx, eq(boards.id, item.boardId), "modify", error);

      const previousOptions = SuperJSON.parse<Record<string, unknown>>(item.options);
      const combinedOptions = {
        ...previousOptions,
        ...input.options,
      };
      const itemOptionsSchema = createItemOptionsSchema(item.kind);
      const fullOptions = reduceWidgetOptionsWithDefaultValues(
        item.kind,
        { enableStatusByDefault: true, firstDayOfWeek: 1, forceDisableStatus: false },
        combinedOptions,
      );
      const optionsResult = await itemOptionsSchema.safeParseAsync(fullOptions);
      if (!optionsResult.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to parse item options",
          cause: optionsResult.error,
        });
      }

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            await transaction
              .update(schema.items)
              .set({
                advancedOptions: SuperJSON.stringify(input.advancedOptions),
                options: SuperJSON.stringify(optionsResult),
              })
              .where(eq(schema.items.id, input.id));

            for (const itemLayout of input.layouts) {
              await transaction
                .update(schema.itemLayouts)
                .set({
                  height: itemLayout.height,
                  width: itemLayout.width,
                  sectionId: itemLayout.sectionId,
                  xOffset: itemLayout.xOffset,
                  yOffset: itemLayout.yOffset,
                })
                .where(
                  and(eq(schema.itemLayouts.itemId, input.id), eq(schema.itemLayouts.layoutId, itemLayout.layoutId)),
                );
            }
          });
        },
        handleSync(db) {
          db.transaction((transaction) => {
            transaction
              .update(items)
              .set({
                advancedOptions: SuperJSON.stringify(input.advancedOptions),
                options: SuperJSON.stringify(optionsResult),
              })
              .where(eq(items.id, input.id));

            for (const itemLayout of input.layouts) {
              transaction
                .update(itemLayouts)
                .set({
                  height: itemLayout.height,
                  width: itemLayout.width,
                  sectionId: itemLayout.sectionId,
                  xOffset: itemLayout.xOffset,
                  yOffset: itemLayout.yOffset,
                })
                .where(and(eq(itemLayouts.itemId, input.id), eq(itemLayouts.layoutId, itemLayout.layoutId)));
            }
          });
        },
      });

      return {
        id: input.id,
        kind: item.kind,
        boardId: item.boardId,
        advancedOptions: input.advancedOptions,
        options: optionsResult,
        layouts: input.layouts,
      };
    }),
  deleteItem: protectedProcedure
    .input(byIdSchema)
    .output(z.void())
    .meta({
      openapi: {
        method: "DELETE",
        path: "/api/items/{id}",
        tags: ["items"],
        protect: true,
        summary: "Delete an item from board",
      },
    })
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.query.items.findFirst({
        where: (fields, { eq }) => eq(fields.id, input.id),
      });
      const error = new TRPCError({
        code: "NOT_FOUND",
        message: "Item not found",
      });
      if (!item) throw error;

      await throwIfActionForbiddenAsync(ctx, eq(boards.id, item.boardId), "modify", error);

      await ctx.db.delete(items).where(eq(items.id, input.id));
    }),
});
