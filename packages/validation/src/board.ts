import { z } from "zod/v4";

import {
  backgroundImageAttachments,
  backgroundImageRepeats,
  backgroundImageSizes,
  boardLanes,
  boardPermissions,
  groupPermissionKeys,
  layoutRoles,
  sectionKinds,
  widgetKinds,
} from "@homarr/definitions";

import { zodEnumFromArray } from "./enums";
import { createSavePermissionsSchema } from "./permissions";
import { commonItemSchema, containerSectionOptionsSchema, itemAdvancedOptionsSchema, sectionSchema } from "./shared";

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
export const boardGutterColumnCountSchema = z.number().int().min(0).max(3);

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

export const boardSettingsSchema = boardSavePartialSettingsSchema.required().extend({
  id: z.string(),
  name: z.string(),
});

export const boardLayoutSchema = z
  .object({
    id: z.string(),
    name: z.string().trim().nonempty().max(32),
    columnCount: boardColumnCountSchema,
    leftGutterColumnCount: boardGutterColumnCountSchema.default(0),
    rightGutterColumnCount: boardGutterColumnCountSchema.default(0),
    breakpoint: z.number().int().min(0).max(32767),
    role: z.enum(layoutRoles.values),
  })
  .refine((layout) => layout.leftGutterColumnCount + layout.rightGutterColumnCount < layout.columnCount, {
    message: "Gutters must leave at least one dashboard column",
    path: ["columnCount"],
  })
  .refine(
    (layout) => layout.role !== "mobile" || (layout.leftGutterColumnCount === 0 && layout.rightGutterColumnCount === 0),
    {
      message: "Mobile layouts cannot have sidebars",
      path: ["leftGutterColumnCount"],
    },
  );

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

const permissionPrincipalSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const boardPermissionsOutputSchema = z.object({
  /** Groups that can access every board through a global permission */
  inherited: z.array(
    z.object({
      permission: zodEnumFromArray(groupPermissionKeys),
      group: permissionPrincipalSchema,
    }),
  ),
  users: z.array(
    z.object({
      user: z.object({
        id: z.string(),
        name: z.string().nullable(),
        image: z.string().nullable(),
        email: z.string().nullable(),
      }),
      permission: z.enum(boardPermissions),
    }),
  ),
  groups: z.array(
    z.object({
      group: permissionPrincipalSchema,
      permission: z.enum(boardPermissions),
    }),
  ),
});

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

/**
 * Upper bound for every grid coordinate and size.
 *
 * Placement work is proportional to the area that is actually used, so an unbounded coordinate
 * would let a single request describe a grid that takes a very long time to lay out.
 */
export const boardDocumentGridLimit = 256;

const gridLimitError = `Grid values must not exceed ${boardDocumentGridLimit}`;
const gridCoordinateSchema = z.number().int().min(0).max(boardDocumentGridLimit, { error: gridLimitError });
const gridSizeSchema = z.number().int().min(1).max(boardDocumentGridLimit, { error: gridLimitError });

/**
 * Explicit placement of an item within one specific layout.
 * Takes precedence over the placement shorthand below.
 */
export const boardItemLayoutInputSchema = z.object({
  layoutId: z.string(),
  /** Defaults to the section of the placement shorthand or the first empty section */
  sectionId: z.string().optional(),
  xOffset: gridCoordinateSchema,
  yOffset: gridCoordinateSchema,
  width: gridSizeSchema,
  height: gridSizeSchema,
});

/**
 * Placement shorthand which is applied to every layout of the board.
 * Every property is optional, omitting all of them keeps the previous behaviour
 * of automatically placing the item with its default size.
 */
export const boardItemPlacementSchema = z.object({
  sectionId: z.string().optional(),
  xOffset: gridCoordinateSchema.optional(),
  yOffset: gridCoordinateSchema.optional(),
  width: gridSizeSchema.optional(),
  height: gridSizeSchema.optional(),
  layouts: z.array(boardItemLayoutInputSchema).optional(),
});

export const addItemToBoardSchema = z.object({
  boardId: z.string(),
  kind: zodEnumFromArray(widgetKinds),
  options: z.record(z.string(), z.unknown()).default({}),
  /** Size shorthand of the web interface, bound by the columns a board can have */
  size: z.object({ width: z.number().int().min(1).max(24), height: z.number().int().min(1).max(24) }).optional(),
  integrationIds: z
    .array(z.string())
    .max(32)
    .refine((ids) => new Set(ids).size === ids.length)
    .default([]),
  advancedOptions: itemAdvancedOptionsSchema.optional(),
  ...boardItemPlacementSchema.shape,
});

export const updateBoardItemSchema = z.object({
  boardId: z.string(),
  itemId: z.string(),
  options: z.record(z.string(), z.unknown()).optional(),
  integrationIds: z.array(z.string()).optional(),
  advancedOptions: itemAdvancedOptionsSchema.optional(),
  ...boardItemPlacementSchema.shape,
});

export const removeBoardItemSchema = z.object({
  boardId: z.string(),
  itemId: z.string(),
});

/**
 * Placement of a dynamic section within one specific layout.
 */
export const boardSectionLayoutInputSchema = z.object({
  layoutId: z.string(),
  /** Section the dynamic section is nested in, defaults to the first empty section */
  parentSectionId: z.string().optional(),
  xOffset: gridCoordinateSchema,
  yOffset: gridCoordinateSchema,
  width: gridSizeSchema,
  height: gridSizeSchema,
});

export const addBoardSectionSchema = z.object({
  boardId: z.string(),
  kind: zodEnumFromArray(sectionKinds),
  /** Which canvas an empty section belongs to; a sidebar needs the layouts to reserve columns for it */
  lane: z.enum(boardLanes).optional(),
  /** Vertical order of empty sections; container sections use layouts or parentSectionId instead */
  yOffset: gridCoordinateSchema.optional(),
  /** Only used for container sections, the title is part of these options */
  options: containerSectionOptionsSchema.optional(),
  /** Only used for container sections, defaults to the shorthand below for every layout */
  layouts: z.array(boardSectionLayoutInputSchema).optional(),
  /** Container section placement shorthand, applied to every layout */
  parentSectionId: z.string().optional(),
  xOffset: gridCoordinateSchema.optional(),
  width: gridSizeSchema.optional(),
  height: gridSizeSchema.optional(),
});

export const updateBoardSectionSchema = z.object({
  boardId: z.string(),
  sectionId: z.string(),
  lane: z.enum(boardLanes).optional(),
  yOffset: gridCoordinateSchema.optional(),
  options: containerSectionOptionsSchema.optional(),
  layouts: z.array(boardSectionLayoutInputSchema).optional(),
  parentSectionId: z.string().optional(),
  xOffset: gridCoordinateSchema.optional(),
  width: gridSizeSchema.optional(),
  height: gridSizeSchema.optional(),
});

export const removeBoardSectionSchema = z.object({
  boardId: z.string(),
  sectionId: z.string(),
});

/**
 * Flat projections of a board used as OpenAPI output schemas.
 * The internal item schema is a union over every widget kind which is not usable
 * for documentation, so the options are exposed as a plain record instead.
 */
export const boardApiLayoutSchema = z.object({
  id: z.string(),
  name: z.string(),
  columnCount: z.number(),
  leftGutterColumnCount: z.number(),
  rightGutterColumnCount: z.number(),
  breakpoint: z.number(),
  role: z.enum(layoutRoles.values),
});

export const boardApiSectionSchema = z.object({
  id: z.string(),
  kind: zodEnumFromArray(sectionKinds),
  name: z.string().nullable(),
  xOffset: z.number().nullable(),
  yOffset: z.number().nullable(),
  options: z.record(z.string(), z.unknown()),
  layouts: z.array(
    z.object({
      layoutId: z.string(),
      parentSectionId: z.string().nullable(),
      xOffset: z.number(),
      yOffset: z.number(),
      width: z.number(),
      height: z.number(),
    }),
  ),
});

export const boardApiItemSchema = z.object({
  id: z.string(),
  kind: zodEnumFromArray(widgetKinds),
  options: z.record(z.string(), z.unknown()),
  advancedOptions: itemAdvancedOptionsSchema,
  integrationIds: z.array(z.string()),
  layouts: z.array(
    z.object({
      layoutId: z.string(),
      sectionId: z.string(),
      xOffset: z.number(),
      yOffset: z.number(),
      width: z.number(),
      height: z.number(),
    }),
  ),
});

export const boardApiDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  isPublic: z.boolean(),
  creatorId: z.string().nullable(),
  layouts: z.array(boardApiLayoutSchema),
  sections: z.array(boardApiSectionSchema),
  items: z.array(boardApiItemSchema),
});

/**
 * Settings as they appear inside an exported board document.
 * Kept free of transforms so it can be used as an OpenAPI output schema.
 */
export const boardDocumentSettingsSchema = z
  .object({
    pageTitle: z.string().nullable(),
    metaTitle: z.string().nullable(),
    logoImageUrl: z.string().nullable(),
    faviconImageUrl: z.string().nullable(),
    backgroundImageUrl: z.string().nullable(),
    backgroundImageAttachment: z.enum(backgroundImageAttachments.values),
    backgroundImageRepeat: z.enum(backgroundImageRepeats.values),
    backgroundImageSize: z.enum(backgroundImageSizes.values),
    primaryColor: z.string(),
    secondaryColor: z.string(),
    opacity: z.number(),
    customCss: z.string().nullable(),
    iconColor: z.string().nullable(),
    itemRadius: z.union([z.literal("xs"), z.literal("sm"), z.literal("md"), z.literal("lg"), z.literal("xl")]),
    disableStatus: z.boolean(),
  })
  .partial();

const boardDocumentLayoutSchema = z.object({
  /** Local reference, remapped to a freshly generated id on import */
  id: z.string(),
  name: z.string().trim().nonempty().max(32),
  // More permissive than the 24 columns the board settings offer so that a board created by an
  // older version or the oldmarr importer survives a round trip, but still small enough that a
  // grid of this width stays cheap to work with
  columnCount: z.number().int().min(1).max(boardDocumentGridLimit, { error: gridLimitError }),
  leftGutterColumnCount: boardGutterColumnCountSchema.default(0),
  rightGutterColumnCount: boardGutterColumnCountSchema.default(0),
  breakpoint: z.number().min(0).max(32767),
  role: z.enum(layoutRoles.values).default(layoutRoles.defaultValue),
});

const boardDocumentSectionSchema = z.object({
  /** Local reference, remapped to a freshly generated id on import */
  id: z.string(),
  kind: zodEnumFromArray(sectionKinds),
  name: z.string().nullable().optional(),
  /** Lane of a canvas: -1 left sidebar, 0 main, 1 right sidebar. A container is placed by its layouts */
  xOffset: z.number().int().min(-1).max(1).nullable().optional(),
  yOffset: gridCoordinateSchema.nullable().optional(),
  options: containerSectionOptionsSchema.optional(),
  layouts: z
    .array(
      z.object({
        layoutId: z.string(),
        parentSectionId: z.string().nullable().optional(),
        xOffset: gridCoordinateSchema,
        yOffset: gridCoordinateSchema,
        width: gridSizeSchema,
        height: gridSizeSchema,
      }),
    )
    .optional(),
});

const boardDocumentItemSchema = z.object({
  /** Only kept so exports stay recognisable, a board import always generates a new id */
  id: z.string().optional(),
  kind: zodEnumFromArray(widgetKinds),
  options: z.record(z.string(), z.unknown()).default({}),
  advancedOptions: itemAdvancedOptionsSchema.optional(),
  integrationIds: z.array(z.string()).default([]),
  ...boardItemPlacementSchema.shape,
});

/**
 * What should happen when the target already exists.
 * `skip` and `replace` make repeated imports of the same document idempotent.
 */
export const importConflictStrategySchema = z.enum(["fail", "skip", "replace"]).default("fail");

/**
 * Full description of a board, symmetric between export and import.
 * All ids inside the document are local references only, on import the server
 * always generates fresh ids so the same document can be imported repeatedly.
 */
export const boardImportSchema = z.object({
  name: boardNameSchema,
  isPublic: z.boolean().default(false),
  settings: boardDocumentSettingsSchema.optional(),
  layouts: z.array(boardDocumentLayoutSchema).min(1),
  sections: z.array(boardDocumentSectionSchema).min(1),
  items: z.array(boardDocumentItemSchema).default([]),
  onConflict: importConflictStrategySchema,
});

export const boardExportSchema = z.object({
  name: z.string(),
  isPublic: z.boolean(),
  settings: boardDocumentSettingsSchema,
  layouts: z.array(boardApiLayoutSchema),
  sections: z.array(
    z.object({
      id: z.string(),
      kind: zodEnumFromArray(sectionKinds),
      name: z.string().nullable(),
      xOffset: z.number().nullable(),
      yOffset: z.number().nullable(),
      options: containerSectionOptionsSchema.optional(),
      layouts: z.array(
        z.object({
          layoutId: z.string(),
          parentSectionId: z.string().nullable(),
          xOffset: z.number(),
          yOffset: z.number(),
          width: z.number(),
          height: z.number(),
        }),
      ),
    }),
  ),
  items: z.array(
    z.object({
      id: z.string(),
      kind: zodEnumFromArray(widgetKinds),
      options: z.record(z.string(), z.unknown()),
      advancedOptions: itemAdvancedOptionsSchema,
      integrationIds: z.array(z.string()),
      layouts: z.array(
        z.object({
          layoutId: z.string(),
          sectionId: z.string(),
          xOffset: z.number(),
          yOffset: z.number(),
          width: z.number(),
          height: z.number(),
        }),
      ),
    }),
  ),
});

export const updateBoardItemLayoutSchema = z.object({
  boardId: z.string(),
  itemId: z.string(),
  layoutId: z.string(),
  xOffset: z.number().int().min(0).max(32767),
  yOffset: z.number().int().min(0).max(32767),
  width: z.number().int().min(1).max(24),
  height: z.number().int().min(1).max(24),
});
