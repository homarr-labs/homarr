import { z } from "zod/v4";

import { validateCustomJsxTemplate } from "../jsx/analyzer";
import { validateCredentialFreeExport, validatePrototypeKeys } from "./definition-security";
import { validateCustomWidgetOptions } from "./options";
import { customWidgetOptionsSchemaSchema } from "./options-schema";
import { customJsxRequestSchema, customWidgetIdentifierSchema, customWidgetSourceSchema } from "./request-schema";
import type { CustomJsxRequest } from "./request-schema";
import { customWidgetAuthTypes, customWidgetSecretKinds } from "./schema-types";

export * from "./options-schema";
export * from "./request-schema";
export type CustomWidgetOptionsSchema = z.infer<typeof customWidgetOptionsSchemaSchema>;

export const customWidgetBindingIdentifierSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z][A-Za-z0-9_-]*$/u, "Binding names must start with a letter and contain letters, numbers, - or _");
export const customJsxTemplateSchema = z
  .string()
  .min(1)
  .max(50_000)
  .superRefine((template, ctx) => {
    for (const diagnostic of validateCustomJsxTemplate(template)) {
      if (diagnostic.severity === "error") {
        ctx.addIssue({
          code: "custom",
          message: `${diagnostic.message} (line ${diagnostic.line}, column ${diagnostic.column})`,
        });
      }
    }
  });

export const customWidgetSecretInputSchema = z.object({
  sourceId: customWidgetIdentifierSchema,
  kind: z.enum(customWidgetSecretKinds),
  value: z.string().min(1).max(8_192),
});

export const customWidgetSecretsInputSchema = z
  .array(customWidgetSecretInputSchema)
  .max(24)
  .superRefine((secrets, ctx) => {
    const identities = new Set<string>();
    secrets.forEach((secret, index) => {
      const identity = `${secret.sourceId}:${secret.kind}`;
      if (identities.has(identity)) {
        ctx.addIssue({ code: "custom", path: [index], message: "A widget secret can only be supplied once" });
      }
      identities.add(identity);
    });
  });

export const customWidgetDefinitionSchema = z
  .object({
    $schema: z.literal("homarr-custom-widget-v2"),
    name: z.string().trim().min(1).max(128),
    description: z.string().max(512).optional(),
    iconUrl: z
      .string()
      .url()
      .refine((value) => {
        if (!URL.canParse(value)) return false;
        const url = new URL(value);
        return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
      }, "Widget icons must use HTTP or HTTPS without embedded credentials")
      .optional(),
    sources: z.array(customWidgetSourceSchema).min(1).max(8),
    requests: z.array(customJsxRequestSchema).max(64),
    optionsSchema: customWidgetOptionsSchemaSchema,
    defaultOptions: z.record(z.string(), z.unknown()),
    template: customJsxTemplateSchema,
  })
  .strict()
  .superRefine((definition, ctx) => {
    for (const issue of validateCustomWidgetOptions(definition.optionsSchema, definition.defaultOptions)) {
      ctx.addIssue({
        code: "custom",
        path: ["defaultOptions", ...issue.path.split(".").slice(1)],
        message: issue.message,
      });
    }
    const sourceIds = validateSourceIds(definition.sources, ctx);
    const requests = validateRequests(definition, sourceIds, ctx);
    validateDynamicOptions(definition.optionsSchema, requests, ctx);
    validateTemplateRequests(definition.template, requests, ctx);
    validateTemplateBindings(definition.template, ctx);
    validateCredentialFreeExport(definition, ctx);
    validatePrototypeKeys(definition, ctx);
  });

type Definition = z.infer<typeof customWidgetDefinitionSchema>;

function validateSourceIds(sources: Definition["sources"], ctx: z.RefinementCtx) {
  const ids = new Set<string>();
  sources.forEach((source, index) => {
    if (ids.has(source.id))
      ctx.addIssue({ code: "custom", path: ["sources", index, "id"], message: `Duplicate source ID: ${source.id}` });
    ids.add(source.id);
  });
  return ids;
}

function validateDynamicOptions(
  schema: unknown,
  requests: Map<string, CustomJsxRequest>,
  ctx: z.RefinementCtx,
  path: Array<string | number> = ["optionsSchema"],
) {
  if (schema === null || typeof schema !== "object" || Array.isArray(schema)) return;
  const node = schema as Record<string, unknown>;
  const presentation = node["x-homarr"];
  if (presentation !== null && typeof presentation === "object" && !Array.isArray(presentation)) {
    const source = (presentation as Record<string, unknown>).optionsSource;
    if (source !== null && typeof source === "object" && !Array.isArray(source)) {
      const requestId = (source as Record<string, unknown>).requestId;
      const request = typeof requestId === "string" ? requests.get(requestId) : undefined;
      if (!request || request.kind !== "query") {
        ctx.addIssue({
          code: "custom",
          path: [...path, "x-homarr", "optionsSource", "requestId"],
          message: `Dynamic options require a query request named '${String(requestId)}'`,
        });
      } else {
        for (const parameterName of Object.keys(request.parameters)) {
          if (!Object.hasOwn(request.optionsBinding ?? {}, parameterName)) {
            ctx.addIssue({
              code: "custom",
              path: [...path, "x-homarr", "optionsSource", "requestId"],
              message: `Dynamic option request '${request.id}' parameter '${parameterName}' requires an explicit optionsBinding entry`,
            });
          }
        }
      }
    }
  }
  if (node.properties !== null && typeof node.properties === "object" && !Array.isArray(node.properties)) {
    for (const [key, child] of Object.entries(node.properties))
      validateDynamicOptions(child, requests, ctx, [...path, "properties", key]);
  }
  if (node.items !== undefined) validateDynamicOptions(node.items, requests, ctx, [...path, "items"]);
  for (const branch of ["if", "then", "else"] as const) {
    if (node[branch] !== undefined) validateDynamicOptions(node[branch], requests, ctx, [...path, branch]);
  }
}

function validateRequests(definition: Definition, sourceIds: Set<string>, ctx: z.RefinementCtx) {
  const requests = new Map<string, CustomJsxRequest>();
  definition.requests.forEach((request, index) => {
    if (requests.has(request.id))
      ctx.addIssue({ code: "custom", path: ["requests", index, "id"], message: `Duplicate request ID: ${request.id}` });
    if (!sourceIds.has(request.sourceId)) {
      ctx.addIssue({
        code: "custom",
        path: ["requests", index, "sourceId"],
        message: `Unknown source ID: ${request.sourceId}`,
      });
    }
    const source = definition.sources.find((candidate) => candidate.id === request.sourceId);
    if (source?.auth.type === "apiKeyHeader" && request.auth === "inherit") {
      const authHeader = source.auth.headerName.toLowerCase();
      if (Object.keys(request.staticHeaders ?? {}).some((header) => header.toLowerCase() === authHeader)) {
        ctx.addIssue({
          code: "custom",
          path: ["requests", index, "staticHeaders"],
          message: "Static headers cannot override the source authentication header",
        });
      }
    }
    if (source?.auth.type === "apiKeyQuery" && request.auth === "inherit") {
      const authParameter = source.auth.parameterName.toLowerCase();
      if (Object.keys(request.queryTemplate ?? {}).some((parameter) => parameter.toLowerCase() === authParameter)) {
        ctx.addIssue({
          code: "custom",
          path: ["requests", index, "queryTemplate"],
          message: "Query templates cannot override the source authentication parameter",
        });
      }
    }
    for (const [parameterName, binding] of Object.entries(request.optionsBinding ?? {})) {
      if (typeof binding !== "object") continue;
      const optionName = binding.$option;
      const optionSchema = definition.optionsSchema.properties?.[optionName];
      if (optionSchema === null || typeof optionSchema !== "object" || Array.isArray(optionSchema)) {
        ctx.addIssue({
          code: "custom",
          path: ["requests", index, "optionsBinding", parameterName, "$option"],
          message: `Unknown widget option '${optionName}'`,
        });
        continue;
      }
      const parameterType = request.parameters[parameterName];
      const declaredOptionType = (optionSchema as Record<string, unknown>).type;
      const optionType = declaredOptionType === "integer" ? "number" : declaredOptionType;
      if (parameterType !== undefined && optionType !== parameterType) {
        ctx.addIssue({
          code: "custom",
          path: ["requests", index, "optionsBinding", parameterName, "$option"],
          message: `Option '${optionName}' must be ${parameterType} to supply parameter '${parameterName}'`,
        });
      }
    }
    requests.set(request.id, request);
  });
  definition.requests.forEach((request, index) => {
    request.invalidates?.forEach((requestId, invalidationIndex) => {
      const target = requests.get(requestId);
      if (!target || target.kind !== "query") {
        ctx.addIssue({
          code: "custom",
          path: ["requests", index, "invalidates", invalidationIndex],
          message: `Invalidation target '${requestId}' must be a query request`,
        });
      }
    });
  });
  return requests;
}

function validateTemplateRequests(template: string, requests: Map<string, CustomJsxRequest>, ctx: z.RefinementCtx) {
  for (const match of template.matchAll(/<(SubFetch|ActionButton|ToggleSwitch)\b([^>]*)>/g)) {
    const component = match[1] as "SubFetch" | "ActionButton" | "ToggleSwitch";
    const idMatch = (match[2] ?? "").match(/\brequestId\s*=\s*(?:"([^"]+)"|'([^']+)')/);
    const requestId = idMatch?.[1] ?? idMatch?.[2];
    if (!requestId) {
      ctx.addIssue({ code: "custom", path: ["template"], message: `${component} must use a literal requestId` });
      continue;
    }
    const request = requests.get(requestId);
    const expectedKind = component === "SubFetch" ? "query" : "action";
    if (!request)
      ctx.addIssue({
        code: "custom",
        path: ["template"],
        message: `${component} references unknown request '${requestId}'`,
      });
    else if (request.kind !== expectedKind) {
      ctx.addIssue({
        code: "custom",
        path: ["template"],
        message: `${component} requires a ${expectedKind} request, but '${requestId}' is ${request.kind}`,
      });
    } else if (component === "SubFetch" && request.trigger !== "manual") {
      ctx.addIssue({
        code: "custom",
        path: ["template"],
        message: `SubFetch requires a manual query, but '${requestId}' is load-triggered`,
      });
    } else if (Object.keys(request.parameters).length > 0 && !/\bparams\s*=/u.test(match[2] ?? "")) {
      ctx.addIssue({
        code: "custom",
        path: ["template"],
        message: `${component} must supply params for request '${requestId}'`,
      });
    }
  }
}

function validateTemplateBindings(template: string, ctx: z.RefinementCtx) {
  for (const match of template.matchAll(/<[A-Z][A-Za-z0-9.]*(?:\s[^<>]*?)?\bbind\s*=\s*(?:"([^"]+)"|'([^']+)'|\{)/gu)) {
    const inputName = match[1] ?? match[2];
    if (!inputName) ctx.addIssue({ code: "custom", path: ["template"], message: "bind must use a literal input name" });
    else if (!customWidgetBindingIdentifierSchema.safeParse(inputName).success)
      ctx.addIssue({ code: "custom", path: ["template"], message: `Invalid bind input name '${inputName}'` });
  }
}

export type HomarrCustomWidgetV2 = z.infer<typeof customWidgetDefinitionSchema>;
export const customWidgetCreateSchema = customWidgetDefinitionSchema.safeExtend({
  secrets: customWidgetSecretsInputSchema.default([]),
});
export const customWidgetUpdateSchema = z
  .object(customWidgetDefinitionSchema.shape)
  .partial()
  .extend({
    id: z.string().min(1),
    secrets: customWidgetSecretsInputSchema.optional(),
  })
  .strict();
export const customWidgetImportSchema = customWidgetDefinitionSchema;
export type CustomWidgetCreateInput = z.infer<typeof customWidgetCreateSchema>;
export type CustomWidgetUpdateInput = z.infer<typeof customWidgetUpdateSchema>;
export type CustomWidgetImport = z.infer<typeof customWidgetImportSchema>;
export const customWidgetAuthTypeSchema = z.enum(customWidgetAuthTypes);
