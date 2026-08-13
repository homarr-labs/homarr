import { z } from "zod/v4";

import {
  colorSchemes,
  integrationKinds,
  integrationSecretKinds,
  onboardingLayoutPresets,
  widgetKinds,
} from "@homarr/definitions";
import { supportedLanguages } from "@homarr/translation/languages";

import { boardNameSchema } from "./board";
import { zodEnumFromArray } from "./enums";

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const httpUrlSchema = z.url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}, "Only HTTP and HTTPS URLs are permitted");
const uniqueIdsSchema = (maxLength = 255) =>
  z
    .array(z.string().trim().min(1).max(maxLength))
    .max(128)
    .refine((ids) => new Set(ids).size === ids.length, { message: "IDs must be unique" });
const sourceIdSchema = z.string().trim().min(1).max(512);

export const onboardingCreateIntegrationSchema = z.object({
  name: z.string().trim().min(1).max(127),
  url: httpUrlSchema,
  sourceId: sourceIdSchema.optional(),
  iconUrl: z.string().trim().min(1).max(2048).nullable().optional(),
  description: z.string().trim().max(512).nullable().optional(),
  pingUrl: httpUrlSchema.nullable().optional(),
});

export const onboardingIntegrationDraftSchema = onboardingCreateIntegrationSchema.extend({
  sourceId: sourceIdSchema,
  kind: zodEnumFromArray(integrationKinds),
  secrets: z.array(
    z.object({
      kind: zodEnumFromArray(integrationSecretKinds),
      value: z.string().nonempty(),
    }),
  ),
});

export const onboardingDiscoveredAppSchema = z.object({
  sourceId: sourceIdSchema.optional(),
  name: z.string().trim().min(1).max(127),
  href: httpUrlSchema.nullable(),
  pingUrl: httpUrlSchema.nullable().optional(),
  iconUrl: z.string().trim().min(1).nullable(),
  description: z.string().trim().max(512).nullable().optional(),
});

export const onboardingAppDraftSchema = onboardingDiscoveredAppSchema.extend({
  sourceId: sourceIdSchema,
  href: httpUrlSchema,
});

const integrationDraftsSchema = z
  .array(onboardingIntegrationDraftSchema)
  .max(128)
  .refine((drafts) => new Set(drafts.map((draft) => draft.sourceId)).size === drafts.length, {
    message: "Integration source IDs must be unique",
  });
const appDraftsSchema = z
  .array(onboardingAppDraftSchema)
  .max(128)
  .refine((drafts) => new Set(drafts.map((draft) => draft.sourceId)).size === drafts.length, {
    message: "App source IDs must be unique",
  });

export const onboardingCompleteSetupSchema = z
  .object({
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
    selectedIntegrationIds: uniqueIdsSchema().default([]),
    selectedAppIds: uniqueIdsSchema().default([]),
    integrations: integrationDraftsSchema.default([]),
    apps: appDraftsSchema.default([]),
    selectedDockerSourceIds: uniqueIdsSchema(512).default([]),
    selectedWidgetKinds: z
      .array(z.enum(widgetKinds))
      .max(widgetKinds.length)
      .refine((kinds) => new Set(kinds).size === kinds.length, { message: "Widget kinds must be unique" })
      .default([]),
  })
  .superRefine((input, ctx) => {
    const integrationSourceIds = new Set(input.integrations.map((integration) => integration.sourceId));
    for (const [index, app] of input.apps.entries()) {
      if (!integrationSourceIds.has(app.sourceId)) continue;
      ctx.addIssue({
        code: "custom",
        message: "A source ID cannot be used by both an integration and an app",
        path: ["apps", index, "sourceId"],
      });
    }
  });

export type OnboardingCompleteSetupInput = z.infer<typeof onboardingCompleteSetupSchema>;
