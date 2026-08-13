import { z } from "zod/v4";

import { colorSchemes, onboardingLayoutPresets, widgetKinds } from "@homarr/definitions";
import { supportedLanguages } from "@homarr/translation/languages";

import { boardNameSchema } from "./board";

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const httpUrlSchema = z.url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}, "Only HTTP and HTTPS URLs are permitted");
const uniqueIdsSchema = z
  .array(z.string().trim().min(1).max(255))
  .max(128)
  .refine((ids) => new Set(ids).size === ids.length, { message: "IDs must be unique" });

export const onboardingCompleteSetupSchema = z.object({
  server: z.object({
    defaultLocale: z.enum(supportedLanguages),
    defaultColorScheme: z.enum(colorSchemes),
    analyticsEnabled: z.boolean().optional(),
  }),
  board: z.object({
    id: z.string().trim().min(1).max(255).optional(),
    name: boardNameSchema,
    primaryColor: hexColorSchema,
    secondaryColor: hexColorSchema,
    itemRadius: z.enum(["xs", "sm", "md", "lg", "xl"]),
    layoutPreset: z.enum(onboardingLayoutPresets).default("balanced"),
    leftSidebar: z.boolean().default(false),
    rightSidebar: z.boolean().default(false),
  }),
  selectedIntegrationIds: uniqueIdsSchema.default([]),
  selectedAppIds: uniqueIdsSchema.default([]),
  selectedDockerSourceIds: uniqueIdsSchema.default([]),
  selectedWidgetKinds: z
    .array(z.enum(widgetKinds))
    .max(widgetKinds.length)
    .refine((kinds) => new Set(kinds).size === kinds.length, { message: "Widget kinds must be unique" })
    .default([]),
});

export const onboardingCreateIntegrationSchema = z.object({
  name: z.string().trim().min(1).max(127),
  url: httpUrlSchema,
  sourceId: z.string().trim().min(1).max(512).optional(),
  iconUrl: z.string().trim().min(1).max(2048).nullable().optional(),
  description: z.string().trim().max(512).nullable().optional(),
  pingUrl: httpUrlSchema.nullable().optional(),
});

export const onboardingDiscoveredAppSchema = z.object({
  sourceId: z.string().trim().min(1).max(512).optional(),
  name: z.string().trim().min(1).max(127),
  href: httpUrlSchema.nullable(),
  pingUrl: httpUrlSchema.nullable().optional(),
  iconUrl: z.string().trim().min(1).nullable(),
  description: z.string().trim().max(512).nullable().optional(),
});

export type OnboardingCompleteSetupInput = z.infer<typeof onboardingCompleteSetupSchema>;
