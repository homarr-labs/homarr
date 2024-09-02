import { z } from "zod";
import { zfd } from "zod-form-data";

import {
  backgroundImageAttachments,
  backgroundImageRepeats,
  backgroundImageSizes,
  boardPermissions,
} from "@homarr/definitions";

import { zodEnumFromArray } from "./enums";
import { createCustomErrorParams } from "./form/i18n";
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

export const createOldmarrImportConfigurationSchema = (existingBoardNames: string[]) =>
  z.object({
    name: boardNameSchema.refine(
      (value) => {
        return existingBoardNames.every((name) => name.toLowerCase().trim() !== value.toLowerCase().trim());
      },
      {
        params: createCustomErrorParams("boardAlreadyExists"),
      },
    ),
    onlyImportApps: z.boolean().default(false),
    distinctAppsByHref: z.boolean().default(true),
    screenSize: z.enum(["lg", "md", "sm"]).default("lg"),
    sidebarBehaviour: z.enum(["remove-items", "last-section"]).default("last-section"),
  });

export type OldmarrImportConfiguration = z.infer<ReturnType<typeof createOldmarrImportConfigurationSchema>>;

export const superRefineJsonImportFile = (value: File | null, context: z.RefinementCtx) => {
  if (!value) {
    return context.addIssue({
      code: "invalid_type",
      expected: "object",
      received: "null",
    });
  }

  if (value.type !== "application/json") {
    return context.addIssue({
      code: "custom",
      params: createCustomErrorParams({
        key: "invalidFileType",
        params: { expected: "JSON" },
      }),
    });
  }

  if (value.size > 1024 * 1024) {
    return context.addIssue({
      code: "custom",
      params: createCustomErrorParams({
        key: "fileTooLarge",
        params: { maxSize: "1 MB" },
      }),
    });
  }

  return null;
};

const importJsonFileSchema = zfd.formData({
  file: zfd.file().superRefine(superRefineJsonImportFile),
  configuration: zfd.json(createOldmarrImportConfigurationSchema([])),
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
