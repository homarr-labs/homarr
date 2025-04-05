import { z } from "zod";

import {
  backgroundImageAttachments,
  backgroundImageRepeats,
  backgroundImageSizes,
  boardPermissions,
} from "@homarr/definitions";

import { zodEnumFromArray } from "./enums";
import { createSavePermissionsSchema } from "./permissions";
import { commonItemSchema, sectionSchema } from "./shared";

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const hexColorNullableSchema = hexColorSchema
  .or(z.literal(""))
  .nullable()
  .transform((value) => (value?.trim().length === 0 ? null : value));

const boardNameSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[A-Za-z0-9-\\_]*$/);

const byNameSchema = z.object({
  name: boardNameSchema,
});

const renameSchema = z.object({
  id: z.string(),
  name: boardNameSchema,
});

const duplicateSchema = z.object({
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
    iconColor: hexColorNullableSchema,
    itemRadius: z.union([z.literal("xs"), z.literal("sm"), z.literal("md"), z.literal("lg"), z.literal("xl")]),
    disableStatus: z.boolean(),
    showInNavigation: z.boolean(),
  })
  .partial();

const saveLayoutsSchema = z.object({
  id: z.string(),
  layouts: z.array(
    z.object({
      id: z.string(),
      name: z.string().trim().nonempty().max(32),
      columnCount: z.number().min(1).max(24),
      breakpoint: z.number().min(0).max(32767),
    }),
  ),
});

const saveSchema = z.object({
  id: z.string(),
  sections: z.array(sectionSchema),
  items: z.array(commonItemSchema),
});

const createSchema = z.object({ name: boardNameSchema, columnCount: z.number().min(1).max(24), isPublic: z.boolean() });

const permissionsSchema = z.object({
  id: z.string(),
});

const savePermissionsSchema = createSavePermissionsSchema(zodEnumFromArray(boardPermissions));

z.object({
  entityId: z.string(),
  permissions: z.array(
    z.object({
      principalId: z.string(),
      permission: zodEnumFromArray(boardPermissions),
    }),
  ),
});

export const boardSchemas = {
  name: boardNameSchema,
  byName: byNameSchema,
  savePartialSettings: savePartialSettingsSchema,
  saveLayouts: saveLayoutsSchema,
  save: saveSchema,
  create: createSchema,
  duplicate: duplicateSchema,
  rename: renameSchema,
  changeVisibility: changeVisibilitySchema,
  permissions: permissionsSchema,
  savePermissions: savePermissionsSchema,
};
