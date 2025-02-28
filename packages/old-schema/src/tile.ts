import { z } from "zod";

import { objectKeys } from "@homarr/common";

const createAreaSchema = <TType extends string, TPropertiesSchema extends z.AnyZodObject>(
  type: TType,
  propertiesSchema: TPropertiesSchema,
) =>
  z.object({
    type: z.literal(type),
    properties: propertiesSchema,
  });

const wrapperAreaSchema = createAreaSchema(
  "wrapper",
  z.object({
    id: z.string(),
  }),
);

const categoryAreaSchema = createAreaSchema(
  "category",
  z.object({
    id: z.string(),
  }),
);

const sidebarAreaSchema = createAreaSchema(
  "sidebar",
  z.object({
    location: z.union([z.literal("right"), z.literal("left")]),
  }),
);

const areaSchema = z.union([wrapperAreaSchema, categoryAreaSchema, sidebarAreaSchema]);

const sizedShapeSchema = z.object({
  location: z.object({
    x: z.number(),
    y: z.number(),
  }),
  size: z.object({
    width: z.number(),
    height: z.number(),
  }),
});

const shapeSchema = z.object({
  lg: sizedShapeSchema.optional(),
  md: sizedShapeSchema.optional(),
  sm: sizedShapeSchema.optional(),
});

export const tileBaseSchema = z.object({
  area: areaSchema,
  shape: shapeSchema,
});

export const boardSizes = objectKeys(shapeSchema._def.shape());
export type BoardSize = (typeof boardSizes)[number];

export const getBoardSizeName = (size: BoardSize) => {
  switch (size) {
    case "md":
      return "medium";
    case "sm":
      return "small";
    case "lg":
    default:
      return "large";
  }
};
