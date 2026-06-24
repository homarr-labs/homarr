import { z } from "zod";

export type SubmissionType = "css" | "widget";

export const WIDGET_SCHEMA_VERSION = "homarr-custom-widget-v2";
export const CSS_SCHEMA_VERSION = "homarr-custom-css-v1";

export const MAX_CSS_LENGTH = 16384;

export type StoreValidationResult = { success: true; data: unknown } | { success: false; error: string };

const authTypes = ["none", "bearer", "basic", "apiKeyHeader", "apiKeyQuery"] as const;
const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
const displayTypes = [
  "singleValue",
  "keyValue",
  "table",
  "statGrid",
  "progressBars",
  "statusIndicator",
  "countGrid",
  "raw",
  "actionButton",
  "customJsx",
] as const;

const widgetSchema = z
  .object({
    $schema: z.literal(WIDGET_SCHEMA_VERSION).optional(),
    name: z.string().min(1).max(128),
    url: z.string().min(1),
    authType: z.enum(authTypes),
    method: z.enum(methods),
    displayType: z.enum(displayTypes),
    displayConfig: z.object({ type: z.enum(displayTypes) }),
  })
  .refine((widget) => widget.displayConfig.type === widget.displayType, {
    message: "displayConfig.type must match displayType",
  });

const validateWidgetContent = (raw: string): StoreValidationResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { success: false, error: "Content is not valid JSON" };
  }

  const result = widgetSchema.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid custom widget JSON" };
  }

  return { success: true, data: result.data };
};

const validateCssContent = (raw: string): StoreValidationResult => {
  if (raw.trim().length === 0) {
    return { success: false, error: "CSS cannot be empty" };
  }
  if (raw.length > MAX_CSS_LENGTH) {
    return { success: false, error: `CSS must be at most ${MAX_CSS_LENGTH} characters` };
  }
  return { success: true, data: raw };
};

export const submissionValidators = {
  widget: validateWidgetContent,
  css: validateCssContent,
} satisfies Record<SubmissionType, (raw: string) => StoreValidationResult>;

export const schemaVersionByType = {
  widget: WIDGET_SCHEMA_VERSION,
  css: CSS_SCHEMA_VERSION,
} satisfies Record<SubmissionType, string>;

export const validateSubmissionContent = (type: SubmissionType, raw: string): StoreValidationResult =>
  submissionValidators[type](raw);
