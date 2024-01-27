import { TRPCError } from "@trpc/server";
import superjson from "superjson";

import { db, eq } from "@homarr/db";
import { boards } from "@homarr/db/schema/sqlite";
import { integrationKinds } from "@homarr/definitions";
import { z } from "@homarr/validation";
import { WidgetSort, widgetSorts } from "@homarr/widgets";

import {
  zodEnumFromArray,
  zodUnionFromArray,
} from "../../../validation/src/enums";
import { WidgetComponentProps } from "../../../widgets/src/definition";
import { createTRPCRouter, publicProcedure } from "../trpc";

const integrationSchema = z.object({
  id: z.string(),
  kind: zodEnumFromArray(integrationKinds),
  name: z.string(),
  url: z.string(),
});

// The following is a bit of a mess, it's providing us typesafe options matching the widget kind.
// But I might be able to do this in a better way in the future.
const forKind = <T extends WidgetSort>(kind: T) =>
  z.object({
    kind: z.literal(kind),
    options: z.custom<Partial<WidgetComponentProps<T>["options"]>>(),
  }) as UnionizeSpecificItemSchemaForWidgetKind<T>;

type SpecificItemSchemaForWidgetKind<TKind extends WidgetSort> = z.ZodObject<{
  kind: z.ZodLiteral<TKind>;
  options: z.ZodType<
    Partial<WidgetComponentProps<TKind>["options"]>,
    z.ZodTypeDef,
    Partial<WidgetComponentProps<TKind>["options"]>
  >;
}>;

type UnionizeSpecificItemSchemaForWidgetKind<T> = T extends WidgetSort
  ? SpecificItemSchemaForWidgetKind<T>
  : never;

const itemSchema = zodUnionFromArray(
  widgetSorts.map((sort) => forKind(sort)),
).and(
  z.object({
    id: z.string(),
    xOffset: z.number(),
    yOffset: z.number(),
    height: z.number(),
    width: z.number(),
    integrations: z.array(integrationSchema),
  }),
);

const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.literal("category"),
  position: z.number(),
  items: z.array(itemSchema),
});

const emptySchema = z.object({
  id: z.string(),
  kind: z.literal("empty"),
  position: z.number(),
  items: z.array(itemSchema),
});

const sidebarSchema = z.object({
  id: z.string(),
  kind: z.literal("sidebar"),
  position: z.union([z.literal(0), z.literal(1)]),
  items: z.array(itemSchema),
});

const sectionSchema = z.union([categorySchema, emptySchema, sidebarSchema]);

const parseSection = (section: unknown) => {
  const result = sectionSchema.safeParse(section);
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data;
};

export const boardRouter = createTRPCRouter({
  test: publicProcedure.input(z.string()).query(({ input }) => input),
  default: publicProcedure.query(async () => {
    const board = await getFullBoardByName("default");

    if (!board) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Board not found",
      });
    }

    const { sections, ...otherBoardProperties } = board;

    return {
      ...otherBoardProperties,
      sections: sections.map((section) =>
        parseSection({
          ...section,
          items: section.items.map((item) => ({
            ...item,
            integrations: item.integrations.map((item) => item.integration),
            options: superjson.parse<Record<string, unknown>>(item.options),
          })),
        }),
      ),
    };
  }),
});

const getFullBoardByName = async (name: string) => {
  return await db.query.boards.findFirst({
    where: eq(boards.name, name),
    with: {
      sections: {
        with: {
          items: {
            with: {
              integrations: {
                with: {
                  integration: true,
                },
              },
            },
          },
        },
      },
    },
  });
};
