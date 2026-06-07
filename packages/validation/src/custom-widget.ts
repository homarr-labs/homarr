import { z } from "zod/v4";

export const customWidgetAuthTypes = ["none", "bearer", "basic", "apiKeyHeader", "apiKeyQuery"] as const;
export type CustomWidgetAuthType = (typeof customWidgetAuthTypes)[number];

export const customWidgetDisplayTypes = [
  "singleValue",
  "keyValue",
  "table",
  "statGrid",
  "progressBars",
  "statusIndicator",
  "countGrid",
  "raw",
  "actionButton",
] as const;
export type CustomWidgetDisplayType = (typeof customWidgetDisplayTypes)[number];

export const customWidgetMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
export type CustomWidgetMethod = (typeof customWidgetMethods)[number];

export const customWidgetSecretKinds = ["apiKey", "username", "password"] as const;
export type CustomWidgetSecretKind = (typeof customWidgetSecretKinds)[number];

const singleValueDisplayConfigSchema = z.object({
  type: z.literal("singleValue"),
  jsonPath: z.string().min(1),
  label: z.string(),
  unit: z.string(),
  valueSize: z.enum(["sm", "md", "lg", "xl"]).optional(),
  labelPosition: z.enum(["above", "below"]).optional(),
});

const keyValueMappingSchema = z.object({
  label: z.string().min(1),
  jsonPath: z.string().min(1),
  unit: z.string(),
});

const keyValueDisplayConfigSchema = z.object({
  type: z.literal("keyValue"),
  mappings: z.array(keyValueMappingSchema).min(1),
  layout: z.enum(["list", "grid"]).optional(),
  columns: z.number().int().min(1).max(3).optional(),
});

const tableColumnSchema = z.object({
  header: z.string().min(1),
  jsonPath: z.string().min(1),
});

const tableDisplayConfigSchema = z.object({
  type: z.literal("table"),
  tablePath: z.string().min(1),
  columns: z.array(tableColumnSchema).min(1),
  striped: z.boolean().optional(),
  compact: z.boolean().optional(),
});

const statGridItemSchema = z.object({
  label: z.string().min(1),
  jsonPath: z.string().min(1),
  unit: z.string(),
  color: z.string().optional(),
});

const statGridDisplayConfigSchema = z.object({
  type: z.literal("statGrid"),
  items: z.array(statGridItemSchema).min(1),
  columns: z.number().int().min(1).max(4).optional(),
  cardStyle: z.enum(["filled", "outline", "subtle"]).optional(),
});

const progressBarItemSchema = z.object({
  label: z.string().min(1),
  valuePath: z.string().min(1),
  maxPath: z.string().optional(),
  unit: z.string(),
  color: z.string().optional(),
});

const progressBarsDisplayConfigSchema = z.object({
  type: z.literal("progressBars"),
  bars: z.array(progressBarItemSchema).min(1),
  showPercentage: z.boolean().optional(),
  barSize: z.enum(["sm", "md", "lg"]).optional(),
});

const statusIndicatorItemSchema = z.object({
  label: z.string().min(1),
  jsonPath: z.string().min(1),
  goodValues: z.array(z.string()).min(1),
});

const statusIndicatorDisplayConfigSchema = z.object({
  type: z.literal("statusIndicator"),
  items: z.array(statusIndicatorItemSchema).min(1),
  layout: z.enum(["list", "grid"]).optional(),
  dotSize: z.enum(["sm", "md", "lg"]).optional(),
});

const countGridItemSchema = z.object({
  label: z.string().min(1),
  jsonPath: z.string().min(1),
  unit: z.string(),
});

const countGridDisplayConfigSchema = z.object({
  type: z.literal("countGrid"),
  items: z.array(countGridItemSchema).min(1),
  columns: z.number().int().min(2).max(4).optional(),
  valueSize: z.enum(["sm", "md", "lg"]).optional(),
});

const rawDisplayConfigSchema = z.object({
  type: z.literal("raw"),
  jsonPath: z.string().min(1),
  maxHeight: z.number().int().min(50).max(1000).optional(),
});

const actionButtonDisplayConfigSchema = z.object({
  type: z.literal("actionButton"),
  buttonLabel: z.string().min(1),
  buttonColor: z.string().optional(),
  confirmText: z.string().optional(),
  successMessage: z.string().optional(),
});

export const displayConfigSchema = z.discriminatedUnion("type", [
  singleValueDisplayConfigSchema,
  keyValueDisplayConfigSchema,
  tableDisplayConfigSchema,
  statGridDisplayConfigSchema,
  progressBarsDisplayConfigSchema,
  statusIndicatorDisplayConfigSchema,
  countGridDisplayConfigSchema,
  rawDisplayConfigSchema,
  actionButtonDisplayConfigSchema,
]);

export type DisplayConfig = z.infer<typeof displayConfigSchema>;

const baseDefinitionSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  iconUrl: z.string().url().optional(),
  baseUrl: z.string().min(1),
  authType: z.enum(customWidgetAuthTypes),
  headerName: z.string().max(256).optional(),
  endpoint: z.string().min(1),
  method: z.enum(customWidgetMethods),
  requestBody: z.string().optional(),
  displayType: z.enum(customWidgetDisplayTypes),
  displayConfig: displayConfigSchema,
});

const secretsInputSchema = z.array(
  z.object({
    kind: z.enum(customWidgetSecretKinds),
    value: z.string().min(1),
  }),
);

export const customWidgetCreateSchema = baseDefinitionSchema.extend({
  secrets: secretsInputSchema,
});

export const customWidgetUpdateSchema = baseDefinitionSchema.partial().extend({
  id: z.string(),
  secrets: secretsInputSchema.optional(),
});

export const customWidgetImportSchema = z.object({
  $schema: z.literal("homarr-custom-widget-v1").optional(),
  name: z.string().min(1).max(128),
  description: z.string().max(512).nullish(),
  iconUrl: z.string().url().nullish(),
  baseUrl: z.string().min(1),
  authType: z.enum(customWidgetAuthTypes),
  headerName: z.string().max(256).nullish(),
  endpoint: z.string().min(1),
  method: z.enum(customWidgetMethods),
  requestBody: z.string().nullish(),
  displayType: z.enum(customWidgetDisplayTypes),
  displayConfig: displayConfigSchema,
});

export type CustomWidgetImport = z.infer<typeof customWidgetImportSchema>;
