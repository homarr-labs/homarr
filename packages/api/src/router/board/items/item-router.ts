import { TRPCError } from "@trpc/server";
import SuperJSON from "superjson";
import z from "zod";

import { createId, objectEntries } from "@homarr/common";
import { and, eq } from "@homarr/db";
import type { InferInsertModel } from "@homarr/db";
import { createDbInsertCollectionWithoutTransaction } from "@homarr/db/collection";
import type { itemLayouts } from "@homarr/db/schema";
import { items } from "@homarr/db/schema";
import { selectItemLayoutSchema, selectitemSchema } from "@homarr/db/validationSchemas";
import type { WidgetKind } from "@homarr/definitions";
import { widgetKinds } from "@homarr/definitions";
import { zodEnumFromArray } from "@homarr/validation/enums";
import { itemAdvancedOptionsSchema } from "@homarr/validation/shared";

import { reduceWidgetOptionsWithDefaultValues, widgetImports } from "../../../../../widgets/src";
import type { WidgetOptionDefinition } from "../../../../../widgets/src/options";
import { createTRPCRouter, protectedProcedure } from "../../../trpc";

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

export const boardItemsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
      }),
    )
    .output(
      z.array(
        z.union([
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
        ]),
      ),
    )
    .meta({
      openapi: {
        method: "GET",
        path: "/api/boards/{boardId}/items",
        tags: ["boardItems"],
        protect: true,
        summary: "Retrieve all items for board",
      },
    })
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.query.items.findMany({
        where: (fields, { eq }) => eq(fields.boardId, input.boardId),
        with: {
          layouts: true,
        },
      });

      return items.map((item) => ({
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
    .input(
      z.object({
        boardId: z.string(),
        kind: zodEnumFromArray(widgetKinds),
        options: z.record(z.string(), z.unknown().optional()),
        advancedOptions: itemAdvancedOptionsSchema,
        layouts: z.array(selectItemLayoutSchema.omit({ itemId: true })),
      }),
    )
    .output(
      z.union([
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
      ]),
    )
    .meta({
      openapi: {
        method: "POST",
        path: "/api/boards/{boardId}/items",
        tags: ["boardItems"],
        protect: true,
        summary: "Create item on board",
        description: "Options available can be viewed in response options object. Input options are optional",
      },
    })
    .mutation(async ({ ctx, input }) => {
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

      // TODO: Add validations
      return {
        ...item,
        layouts: layoutInserts,
      };
    }),
  deleteItem: protectedProcedure
    .input(z.object({ boardId: z.string(), itemId: z.string() }))
    .output(z.void())
    .meta({ openapi: { method: "DELETE", path: "/api/boards/{boardId}/items/{itemId}" } })
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(items).where(and(eq(items.id, input.itemId), eq(items.boardId, input.boardId)));
    }),
});

// TODO: Add check if you are allowed to do this
// TODO: Maybe move to /api/items instead so we don't have to pass boardId for deletion & modification
