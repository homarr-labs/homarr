import { z } from "zod";
import { zfd } from "zod-form-data";

import {
  backgroundImageAttachments,
  backgroundImageRepeats,
  backgroundImageSizes,
  boardPermissions,
} from "@homarr/definitions";
import { importConfigurationSchema } from "@homarr/old-schema/shared";

import { zodEnumFromArray } from "./enums";
import { createSavePermissionsSchema } from "./permissions";
import { commonItemSchema, createSectionSchema } from "./shared";

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const boardNameSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[A-Za-z0-9-\\._]*$/);

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
    columnCount: z.number().min(1).max(24),
  })
  .partial();

const saveSchema = z.object({
  id: z.string(),
  sections: z.array(createSectionSchema(commonItemSchema)),
});

const createSchema = z.object({ name: boardNameSchema, columnCount: z.number().min(1).max(24), isPublic: z.boolean() });

const permissionsSchema = z.object({
  id: z.string(),
});

const importJsonFileSchema = zfd.formData({
  file: zfd
    .file()
    .refine((file) => file.type === "application/json", { message: "Invalid file type" })
    .refine((file) => file.size < 1024 * 1024, { message: "File is too large" })
    .refine((file) => file.size > 0, { message: "File is empty" }),
  configuration: zfd.json(importConfigurationSchema),
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
  byName: byNameSchema,
  savePartialSettings: savePartialSettingsSchema,
  save: saveSchema,
  create: createSchema,
  rename: renameSchema,
  changeVisibility: changeVisibilitySchema,
  permissions: permissionsSchema,
  savePermissions: savePermissionsSchema,
  importOldmarrConfig: importJsonFileSchema,
};
