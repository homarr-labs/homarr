import { z } from "zod/v4";

export const customWidgetAuthTypes = ["none", "bearer", "basic", "apiKeyHeader", "apiKeyQuery"] as const;
export type CustomWidgetAuthType = (typeof customWidgetAuthTypes)[number];

export const customWidgetDisplayTypes = ["singleValue", "keyValue", "table"] as const;
export type CustomWidgetDisplayType = (typeof customWidgetDisplayTypes)[number];

export const customWidgetMethods = ["GET", "POST"] as const;
export type CustomWidgetMethod = (typeof customWidgetMethods)[number];

export const customWidgetSecretKinds = ["apiKey", "username", "password"] as const;
export type CustomWidgetSecretKind = (typeof customWidgetSecretKinds)[number];

const singleValueDisplayConfigSchema = z.object({
  type: z.literal("singleValue"),
  jsonPath: z.string().min(1),
  label: z.string(),
  unit: z.string(),
});

const keyValueMappingSchema = z.object({
  label: z.string().min(1),
  jsonPath: z.string().min(1),
  unit: z.string(),
});

const keyValueDisplayConfigSchema = z.object({
  type: z.literal("keyValue"),
  mappings: z.array(keyValueMappingSchema).min(1),
});

const tableColumnSchema = z.object({
  header: z.string().min(1),
  jsonPath: z.string().min(1),
});

const tableDisplayConfigSchema = z.object({
  type: z.literal("table"),
  tablePath: z.string().min(1),
  columns: z.array(tableColumnSchema).min(1),
});

export const displayConfigSchema = z.discriminatedUnion("type", [
  singleValueDisplayConfigSchema,
  keyValueDisplayConfigSchema,
  tableDisplayConfigSchema,
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
  flowGraph: z.string().optional(),
});

export const customWidgetImportSchema = z.object({
  $schema: z.literal("homarr-custom-widget-v1").optional(),
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

export type CustomWidgetImport = z.infer<typeof customWidgetImportSchema>;

export const flowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()),
});

export const flowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

export const flowGraphSchema = z.object({
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
});

export type FlowGraphSchema = z.infer<typeof flowGraphSchema>;
