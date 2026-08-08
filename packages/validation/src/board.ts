import { z } from "zod/v4";

import {
  backgroundImageAttachments,
  backgroundImageRepeats,
  backgroundImageSizes,
  boardPermissions,
  layoutRoles,
  widgetKinds,
} from "@homarr/definitions";

import { zodEnumFromArray } from "./enums";
import { createSavePermissionsSchema } from "./permissions";
import { commonItemSchema, sectionSchema } from "./shared";

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const hexColorNullableSchema = hexColorSchema
  .or(z.literal(""))
  .nullable()
  .transform((value) => (value?.trim().length === 0 ? null : value));

export const boardNameSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[A-Za-z0-9-_]*$/);
export const boardColumnCountSchema = z.number().min(1).max(24);

export const boardByNameSchema = z.object({
  name: boardNameSchema,
});

export const boardRenameSchema = z.object({
  id: z.string(),
  name: boardNameSchema,
});

export const boardDuplicateSchema = z.object({
  id: z.string(),
  name: boardNameSchema,
});

export const boardChangeVisibilitySchema = z.object({
  id: z.string(),
  visibility: z.enum(["public", "private"]),
});

const trimmedNullableString = z
  .string()
  .nullable()
  .transform((value) => (value?.trim().length === 0 ? null : value));

export const boardSavePartialSettingsSchema = z
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
  })
  .partial();

export const boardLayoutSchema = z.object({
  id: z.string(),
  name: z.string().trim().nonempty().max(32),
  columnCount: boardColumnCountSchema,
  breakpoint: z.number().int().min(0).max(32767),
  role: z.enum(layoutRoles.values),
});

export const responsiveBoardLayoutsSchema = z
  .array(boardLayoutSchema)
  .min(2)
  .superRefine((layouts, ctx) => {
    const mobileLayouts = layouts.filter((layout) => layout.role === "mobile");
    const baseLayouts = layouts.filter((layout) => layout.role === "base");
    const mobileLayout = mobileLayouts.at(0);
    const baseLayout = baseLayouts.at(0);
    if (mobileLayouts.length !== 1 || baseLayouts.length !== 1 || !mobileLayout || !baseLayout) {
      ctx.addIssue({ code: "custom", message: "Boards require exactly one Mobile and one Base layout" });
      return;
    }

    if (mobileLayout.breakpoint !== 0) {
      ctx.addIssue({ code: "custom", message: "The Mobile layout breakpoint must be 0" });
    }

    if (layouts.some((layout) => layout.id !== baseLayout.id && layout.breakpoint >= baseLayout.breakpoint)) {
      ctx.addIssue({ code: "custom", message: "The Base layout must have the highest breakpoint" });
    }

    if (new Set(layouts.map((layout) => layout.breakpoint)).size !== layouts.length) {
      ctx.addIssue({ code: "custom", message: "Layout breakpoints must be unique" });
    }

    if (new Set(layouts.map((layout) => layout.id)).size !== layouts.length) {
      ctx.addIssue({ code: "custom", message: "Layout IDs must be unique" });
    }
  });

export const boardSaveLayoutsSchema = z.object({
  id: z.string(),
  layouts: responsiveBoardLayoutsSchema,
});

export const boardResetLayoutSchema = z.object({
  boardId: z.string(),
  layoutId: z.string(),
});

export const boardSaveSchema = z.object({
  id: z.string(),
  sections: z.array(sectionSchema),
  items: z.array(commonItemSchema),
});

export const boardCreateSchema = z.object({
  name: boardNameSchema,
  columnCount: boardColumnCountSchema,
  isPublic: z.boolean(),
});

export const boardSavePermissionsSchema = createSavePermissionsSchema(zodEnumFromArray(boardPermissions));

const boardPermissionEntrySchema = z.object({
  permission: z.enum(boardPermissions),
});

export const boardSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  logoImageUrl: z.string().nullable(),
  isPublic: z.boolean(),
  creator: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      image: z.string().nullable(),
      email: z.string().nullable(),
    })
    .nullable(),
  isHome: z.boolean(),
  isMobileHome: z.boolean(),
  userPermissions: z.array(boardPermissionEntrySchema),
  groupPermissions: z.array(boardPermissionEntrySchema),
});

export const addItemToBoardSchema = z.object({
  boardId: z.string(),
  kind: zodEnumFromArray(widgetKinds),
  options: z.record(z.string(), z.unknown()).default({}),
  integrationIds: z.array(z.string()).default([]),
});
