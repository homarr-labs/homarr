import { z } from "zod/v4";

import { matchesDeclaredOptionType } from "./option-value-types";

const optionSchemaKeys = new Set([
  "type",
  "title",
  "description",
  "default",
  "enum",
  "const",
  "minimum",
  "maximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "format",
  "items",
  "properties",
  "required",
  "additionalProperties",
  "if",
  "then",
  "else",
  "x-homarr",
]);
const optionTypes = new Set(["object", "array", "string", "number", "integer", "boolean", "null"]);
const optionControls = new Set([
  "text",
  "textarea",
  "number",
  "switch",
  "select",
  "multi-select",
  "slider",
  "date",
  "time",
  "color",
  "icon",
  "url",
  "duration",
  "timeZone",
  "json",
]);
const optionFormats = new Set(["date", "date-time", "time", "color", "uri", "icon", "duration", "time-zone"]);
const finiteNumberKeywords = ["minimum", "maximum", "multipleOf"] as const;
const nonNegativeIntegerKeywords = ["minLength", "maxLength", "minItems", "maxItems"] as const;
const credentialOptionName =
  /(^|[-_])(authorization|api[-_]?keys?|passwords?|passwds?|secrets?|tokens?|access[-_]?tokens?|refresh[-_]?tokens?|client[-_]?secrets?)($|[-_])/iu;
const controlsByType: Readonly<Record<string, ReadonlySet<string>>> = {
  string: new Set(["text", "textarea", "select", "date", "time", "color", "icon", "url", "timeZone", "json"]),
  number: new Set(["number", "select", "slider", "duration", "json"]),
  integer: new Set(["number", "select", "slider", "duration", "json"]),
  boolean: new Set(["switch", "select", "json"]),
  array: new Set(["multi-select", "json"]),
  object: new Set(["json"]),
  null: new Set(["json"]),
};

function validateOptionsSource(value: unknown, ctx: z.RefinementCtx, path: Array<string | number>) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    ctx.addIssue({ code: "custom", path, message: "optionsSource must be an object" });
    return;
  }
  const keys = Object.keys(value);
  if (
    keys.some((key) => !["requestId", "itemsPath", "valuePath", "labelPath"].includes(key)) ||
    !["requestId", "valuePath", "labelPath"].every((key) => {
      const candidate = (value as Record<string, unknown>)[key];
      return typeof candidate === "string" && candidate.length > 0;
    })
  ) {
    ctx.addIssue({ code: "custom", path, message: "optionsSource requires requestId, valuePath, and labelPath" });
  }
  const itemsPath = (value as Record<string, unknown>).itemsPath;
  if (itemsPath !== undefined && (typeof itemsPath !== "string" || itemsPath.length === 0)) {
    ctx.addIssue({ code: "custom", path: [...path, "itemsPath"], message: "itemsPath must be a non-empty path" });
  }
}

function validatePresentation(
  value: unknown,
  schema: Record<string, unknown>,
  ctx: z.RefinementCtx,
  path: Array<string | number>,
) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    ctx.addIssue({ code: "custom", path, message: "x-homarr must be an object" });
    return;
  }
  const metadata = value as Record<string, unknown>;
  const allowed = new Set(["control", "placeholder", "advanced", "order", "optionsSource"]);
  for (const key of Object.keys(metadata)) {
    if (!allowed.has(key))
      ctx.addIssue({ code: "custom", path: [...path, key], message: `Unsupported x-homarr field '${key}'` });
  }
  if (
    metadata.control !== undefined &&
    (typeof metadata.control !== "string" || !optionControls.has(metadata.control))
  ) {
    ctx.addIssue({ code: "custom", path: [...path, "control"], message: "Unknown Homarr option control" });
  } else if (
    typeof metadata.control === "string" &&
    typeof schema.type === "string" &&
    !controlsByType[schema.type]?.has(metadata.control)
  ) {
    ctx.addIssue({
      code: "custom",
      path: [...path, "control"],
      message: `Control '${metadata.control}' does not support ${schema.type} values`,
    });
  }
  if (metadata.placeholder !== undefined && typeof metadata.placeholder !== "string") {
    ctx.addIssue({ code: "custom", path: [...path, "placeholder"], message: "placeholder must be a string" });
  }
  if (metadata.advanced !== undefined && typeof metadata.advanced !== "boolean") {
    ctx.addIssue({ code: "custom", path: [...path, "advanced"], message: "advanced must be a boolean" });
  }
  if (metadata.order !== undefined && (typeof metadata.order !== "number" || !Number.isFinite(metadata.order))) {
    ctx.addIssue({ code: "custom", path: [...path, "order"], message: "order must be a finite number" });
  }
  if (metadata.optionsSource !== undefined) {
    validateOptionsSource(metadata.optionsSource, ctx, [...path, "optionsSource"]);
    if (metadata.control !== "select" && metadata.control !== "multi-select") {
      ctx.addIssue({
        code: "custom",
        path: [...path, "optionsSource"],
        message: "Dynamic options require a select or multi-select control",
      });
    }
  }
}

function validateScalarKeywords(schema: Record<string, unknown>, ctx: z.RefinementCtx, path: Array<string | number>) {
  for (const key of finiteNumberKeywords) {
    if (schema[key] !== undefined && (typeof schema[key] !== "number" || !Number.isFinite(schema[key]))) {
      ctx.addIssue({ code: "custom", path: [...path, key], message: `${key} must be a finite number` });
    }
  }
  if (typeof schema.multipleOf === "number" && schema.multipleOf <= 0)
    ctx.addIssue({ code: "custom", path: [...path, "multipleOf"], message: "multipleOf must be greater than zero" });
  for (const key of nonNegativeIntegerKeywords) {
    if (schema[key] !== undefined && (!Number.isInteger(schema[key]) || Number(schema[key]) < 0)) {
      ctx.addIssue({ code: "custom", path: [...path, key], message: `${key} must be a non-negative integer` });
    }
  }
  for (const [minimum, maximum] of [
    ["minimum", "maximum"],
    ["minLength", "maxLength"],
    ["minItems", "maxItems"],
  ] as const) {
    if (typeof schema[minimum] === "number" && typeof schema[maximum] === "number" && schema[minimum] > schema[maximum])
      ctx.addIssue({ code: "custom", path, message: `${minimum} cannot be greater than ${maximum}` });
  }
}

function validateChoices(schema: Record<string, unknown>, ctx: z.RefinementCtx, path: Array<string | number>) {
  if (
    schema.enum !== undefined &&
    (!Array.isArray(schema.enum) || schema.enum.length === 0 || schema.enum.length > 100)
  ) {
    ctx.addIssue({ code: "custom", path: [...path, "enum"], message: "enum must contain between 1 and 100 values" });
  } else if (
    Array.isArray(schema.enum) &&
    schema.enum.some((entry) => !matchesDeclaredOptionType(schema.type, entry))
  ) {
    ctx.addIssue({ code: "custom", path: [...path, "enum"], message: "Every enum value must match the option type" });
  }
  if (schema.const !== undefined && !matchesDeclaredOptionType(schema.type, schema.const))
    ctx.addIssue({ code: "custom", path: [...path, "const"], message: "const must match the option type" });
}

function validateOptionSchemaNode(
  value: unknown,
  ctx: z.RefinementCtx,
  path: Array<string | number>,
  isRoot = false,
  requiresType = true,
  propertyTypesRequired = true,
): void {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    ctx.addIssue({ code: "custom", path, message: "Option schemas must be objects" });
    return;
  }
  const schema = value as Record<string, unknown>;
  for (const key of Object.keys(schema)) {
    if (!optionSchemaKeys.has(key)) {
      ctx.addIssue({ code: "custom", path: [...path, key], message: `Unsupported option schema keyword '${key}'` });
    }
  }
  if (
    (requiresType && typeof schema.type !== "string") ||
    (schema.type !== undefined && !optionTypes.has(String(schema.type)))
  ) {
    ctx.addIssue({ code: "custom", path: [...path, "type"], message: "Every option schema needs one supported type" });
  }
  for (const key of ["title", "description"] as const) {
    if (schema[key] !== undefined && typeof schema[key] !== "string") {
      ctx.addIssue({ code: "custom", path: [...path, key], message: `${key} must be a string` });
    }
  }
  validateScalarKeywords(schema, ctx, path);
  if (schema.format !== undefined && (typeof schema.format !== "string" || !optionFormats.has(schema.format))) {
    ctx.addIssue({ code: "custom", path: [...path, "format"], message: "Unsupported option format" });
  }
  if (schema.format !== undefined && schema.type !== "string") {
    ctx.addIssue({ code: "custom", path: [...path, "format"], message: "Option formats require a string type" });
  }
  validateChoices(schema, ctx, path);
  if (isRoot && schema.type !== "object") {
    ctx.addIssue({ code: "custom", path: [...path, "type"], message: "The root options schema must be an object" });
  }
  if (schema.additionalProperties !== undefined && schema.additionalProperties !== false) {
    ctx.addIssue({
      code: "custom",
      path: [...path, "additionalProperties"],
      message: "additionalProperties can only be false",
    });
  }
  if (schema.type === "object" && schema.additionalProperties !== false) {
    ctx.addIssue({
      code: "custom",
      path: [...path, "additionalProperties"],
      message: "Object options must set additionalProperties to false",
    });
  }
  if (schema.properties !== undefined) {
    if (schema.type !== undefined && schema.type !== "object") {
      ctx.addIssue({ code: "custom", path: [...path, "properties"], message: "properties require an object type" });
    }
    if (schema.properties === null || typeof schema.properties !== "object" || Array.isArray(schema.properties)) {
      ctx.addIssue({ code: "custom", path: [...path, "properties"], message: "properties must be an object" });
    } else {
      for (const [key, child] of Object.entries(schema.properties)) {
        if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/u.test(key)) {
          ctx.addIssue({
            code: "custom",
            path: [...path, "properties", key],
            message: "Option names must start with a letter and contain letters, numbers, - or _",
          });
        }
        if (credentialOptionName.test(key)) {
          ctx.addIssue({
            code: "custom",
            path: [...path, "properties", key],
            message: "Credentials must use source authentication, not widget options",
          });
        }
        validateOptionSchemaNode(child, ctx, [...path, "properties", key], false, propertyTypesRequired);
      }
    }
  }
  if (schema.required !== undefined && !Array.isArray(schema.required)) {
    ctx.addIssue({ code: "custom", path: [...path, "required"], message: "required must be an array" });
  } else if (
    Array.isArray(schema.required) &&
    schema.properties !== null &&
    typeof schema.properties === "object" &&
    !Array.isArray(schema.properties)
  ) {
    for (const key of schema.required) {
      if (typeof key !== "string" || !Object.hasOwn(schema.properties, key)) {
        ctx.addIssue({ code: "custom", path: [...path, "required"], message: "required contains an unknown option" });
      }
    }
  }
  if (schema.type === "array" && schema.items === undefined) {
    ctx.addIssue({ code: "custom", path: [...path, "items"], message: "Array options require an items schema" });
  }
  if (schema.items !== undefined) {
    if (schema.type !== undefined && schema.type !== "array") {
      ctx.addIssue({ code: "custom", path: [...path, "items"], message: "items require an array type" });
    }
    validateOptionSchemaNode(schema.items, ctx, [...path, "items"]);
  }
  for (const branch of ["if", "then", "else"] as const) {
    if (schema[branch] !== undefined) {
      validateOptionSchemaNode(schema[branch], ctx, [...path, branch], false, false, branch !== "if");
    }
  }
  if (schema["x-homarr"] !== undefined) validatePresentation(schema["x-homarr"], schema, ctx, [...path, "x-homarr"]);
}

export const customWidgetOptionsSchemaSchema = z
  .object({
    type: z.literal("object"),
    properties: z.record(z.string(), z.unknown()).default({}),
    required: z.array(z.string()).optional(),
    additionalProperties: z.literal(false).default(false),
    title: z.string().optional(),
    description: z.string().optional(),
    if: z.unknown().optional(),
    // oxlint-disable-next-line unicorn/no-thenable -- JSON Schema uses the standard `then` keyword.
    then: z.unknown().optional(),
    else: z.unknown().optional(),
  })
  .strict()
  .superRefine((schema, ctx) => validateOptionSchemaNode(schema, ctx, [], true));
