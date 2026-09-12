import { z } from "zod/v4";

import { boundValueSchema, customWidgetIdentifierSchema } from "./request-schema";
import { compileCustomWidgetStyles } from "./scoped-styles";

export const CUSTOM_WIDGET_SCHEMA_V3 = "homarr-custom-widget-v3";
export const CUSTOM_WIDGET_SUPPORTED_SCHEMAS = ["homarr-custom-widget-v2", CUSTOM_WIDGET_SCHEMA_V3] as const;

const preferenceValueSchema = z.union([
  z.string().max(8_192),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(512)).max(256),
  z.array(z.number().finite()).max(256),
]);
export const customWidgetPreferenceSchema = z
  .strictObject({
    type: z.enum(["string", "number", "boolean", "string[]", "number[]"]),
    defaultValue: preferenceValueSchema,
  })
  .superRefine((value, ctx) => {
    if (!isCustomWidgetPreferenceValue(value.type, value.defaultValue)) {
      ctx.addIssue({
        code: "custom",
        path: ["defaultValue"],
        message: "Preference default must match its declared type",
      });
    }
  });

export function isCustomWidgetPreferenceValue(type: string, value: unknown): boolean {
  if (type.endsWith("[]")) {
    return (
      Array.isArray(value) &&
      value.length <= 256 &&
      value.every(
        (entry) =>
          isCustomWidgetPreferenceValue(type.slice(0, -2), entry) && (typeof entry !== "string" || entry.length <= 512),
      )
    );
  }
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "string") return typeof value === "string" && value.length <= 8_192;
  return type === "boolean" && typeof value === "boolean";
}

export const customWidgetNativeCapabilitySchema = z
  .strictObject({
    capability: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/u),
    integrationOption: customWidgetIdentifierSchema.optional(),
    kind: z.enum(["query", "action"]).default("query"),
    input: z.record(customWidgetIdentifierSchema, boundValueSchema).default({}),
    trigger: z.enum(["load", "manual"]).default("load"),
    confirmation: z
      .strictObject({
        title: z.string().min(1).max(128),
        message: z.string().min(1).max(512),
        confirmLabel: z.string().max(64).optional(),
        destructive: z.boolean().optional(),
      })
      .optional(),
    permission: z.enum(["view", "modify", "full"]).default("view"),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "action" && (value.trigger !== "manual" || value.permission === "view" || !value.confirmation)) {
      ctx.addIssue({
        code: "custom",
        message: "Native actions require a manual trigger, confirmation, and modify or full permission",
      });
    }
  });
export type CustomWidgetNativeCapability = z.infer<typeof customWidgetNativeCapabilitySchema>;

export const customWidgetContentSchema = customWidgetPreferenceSchema.safeExtend({
  permission: z.enum(["modify", "full"]),
});
export type CustomWidgetContentDeclaration = z.infer<typeof customWidgetContentSchema>;

export const customWidgetExtensionsSchema = z.strictObject({
  stylesheet: z
    .string()
    .max(30_000)
    .superRefine((value, ctx) => {
      try {
        compileCustomWidgetStyles(value, "validation");
      } catch (error) {
        ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : "Invalid stylesheet" });
      }
    })
    .optional(),
  fragments: z
    .record(customWidgetIdentifierSchema, z.string().min(1).max(20_000))
    .refine((value) => Object.keys(value).length <= 32, "At most 32 view fragments are supported")
    .optional(),
  preferences: z
    .record(customWidgetIdentifierSchema, customWidgetPreferenceSchema)
    .refine((value) => Object.keys(value).length <= 64, "At most 64 saved preferences are supported")
    .optional(),
  content: z
    .record(customWidgetIdentifierSchema, customWidgetContentSchema)
    .refine((value) => Object.keys(value).length <= 32, "At most 32 shared content fields are supported")
    .optional(),
  native: z
    .record(customWidgetIdentifierSchema, customWidgetNativeCapabilitySchema)
    .refine((value) => Object.keys(value).length <= 64, "At most 64 native capabilities are supported")
    .optional(),
});
export type CustomWidgetExtensions = z.infer<typeof customWidgetExtensionsSchema>;
