import { z } from "zod";

import {
  backgroundImageAttachments,
  backgroundImageRepeats,
  backgroundImageSizes,
} from "@homarr/definitions";

import { commonItemSchema, createSectionSchema } from "./shared";

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const boardNameSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[A-Za-z0-9-\\._]+$/);

const byNameSchema = z.object({
  name: boardNameSchema,
});

const renameSchema = z.object({
  id: z.string(),
  name: boardNameSchema,
});

const changeVisibilitySchema = z.object({
  id: z.string(),
  visibility: z.enum(["public", "private"]),
});

const trimmedNullableString = z
  .string()
  .nullable()
  .transform((value) => (value?.trim().length === 0 ? null : value));

const savePartialSettingsSchema = z
  .object({
    pageTitle: trimmedNullableString,
    metaTitle: trimmedNullableString,
    logoImageUrl: trimmedNullableString,
    faviconImageUrl: trimmedNullableString,
    backgroundImageUrl: trimmedNullableString,
    backgroundImageAttachment: z.enum(backgroundImageAttachments.values),
    backgroundImageRepeat: z.enum(backgroundImageRepeats.values),
    backgroundImageSize: z.enum(backgroundImageSizes.values),
    primaryColor: hexColorSchema,
    secondaryColor: hexColorSchema,
    opacity: z.number().min(0).max(100),
    customCss: z.string().max(16384),
    showRightSidebar: z.boolean(),
    showLeftSidebar: z.boolean(),
    columnCount: z.number().min(1).max(24),
  })
  .partial()
  .and(
    z.object({
      id: z.string(),
    }),
  );

const saveSchema = z.object({
  id: z.string(),
  sections: z.array(createSectionSchema(commonItemSchema)),
});

const createSchema = z.object({ name: boardNameSchema });

export const boardSchemas = {
  byName: byNameSchema,
  savePartialSettings: savePartialSettingsSchema,
  save: saveSchema,
  create: createSchema,
  rename: renameSchema,
  changeVisibility: changeVisibilitySchema,
};
