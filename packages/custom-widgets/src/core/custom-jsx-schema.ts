import { z } from "zod/v4";

import { validateCustomJsxTemplate } from "../jsx/analyzer";
import { CUSTOM_JSX_BINDING_IDENTIFIER_PATTERN } from "../jsx/policy";
import { validateCredentialFreeExport, validatePrototypeKeys } from "./definition-security";
import { customWidgetOptionsSchema } from "./options-schema";
import {
  collectCustomWidgetRequestReferences,
  customWidgetIdentifierSchema,
  customWidgetRequestsSchema,
  customWidgetSourcesSchema,
} from "./request-schema";
import type { CustomJsxRequest } from "./request-schema";
import { customWidgetSecretKinds } from "./schema-types";

export * from "./options-schema";
export * from "./request-schema";
export const CUSTOM_WIDGET_SCHEMA = "homarr-custom-widget-v2";

export const customWidgetBindingIdentifierSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    CUSTOM_JSX_BINDING_IDENTIFIER_PATTERN,
    "Binding names must start with a letter and contain letters, numbers, - or _",
  );

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

export const customWidgetSecretInputSchema = z.strictObject({
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
      if (identities.has(identity))
        ctx.addIssue({ code: "custom", path: [index], message: "A widget secret can only be supplied once" });
      identities.add(identity);
    });
  });

export const customWidgetDefinitionSchema = z
  .strictObject({
    $schema: z.literal(CUSTOM_WIDGET_SCHEMA),
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
    sources: customWidgetSourcesSchema,
    requests: customWidgetRequestsSchema,
    options: customWidgetOptionsSchema,
    template: customJsxTemplateSchema,
  })
  .superRefine((definition, ctx) => {
    validateRequests(definition, ctx);
    validateCaseInsensitiveSourceIds(definition.sources, ctx);
    validateTemplateRequests(definition.template, definition.requests, ctx);
    validateCredentialFreeExport(definition, ctx);
    validatePrototypeKeys(definition, ctx);
  });

type Definition = z.infer<typeof customWidgetDefinitionSchema>;

function validateRequests(definition: Definition, ctx: z.RefinementCtx) {
  for (const [requestId, request] of Object.entries(definition.requests)) {
    if (!definition.sources[request.source]) {
      ctx.addIssue({
        code: "custom",
        path: ["requests", requestId, "source"],
        message: `Unknown source '${request.source}'`,
      });
    }
    const references = collectCustomWidgetRequestReferences(request);
    for (const optionName of references.options) {
      if (!definition.options[optionName]) {
        ctx.addIssue({
          code: "custom",
          path: ["requests", requestId],
          message: `Unknown widget option '${optionName}'`,
        });
      }
    }
    if (request.trigger === "load" && references.params.size > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["requests", requestId],
        message: `Load requests cannot use invocation parameters: ${[...references.params].join(", ")}`,
      });
    }
    request.invalidates?.forEach((target, index) => {
      if (definition.requests[target]?.kind !== "query") {
        ctx.addIssue({
          code: "custom",
          path: ["requests", requestId, "invalidates", index],
          message: `Invalidation target '${target}' must be a query`,
        });
      }
    });
  }
  for (const [optionName, option] of Object.entries(definition.options)) {
    const requestId = option.choicesFrom?.request;
    if (requestId && definition.requests[requestId]?.kind !== "query") {
      ctx.addIssue({
        code: "custom",
        path: ["options", optionName, "choicesFrom", "request"],
        message: `Dynamic choices require a query named '${requestId}'`,
      });
    }
    if (requestId) {
      const request = definition.requests[requestId];
      const references = request ? collectCustomWidgetRequestReferences(request) : null;
      if (request && (request.trigger !== "load" || (references?.params.size ?? 0) > 0)) {
        ctx.addIssue({
          code: "custom",
          path: ["options", optionName, "choicesFrom", "request"],
          message: "Dynamic choices require a load query without invocation parameters",
        });
      }
    }
  }
}

function validateCaseInsensitiveSourceIds(sources: Definition["sources"], ctx: z.RefinementCtx) {
  const seen = new Map<string, string>();
  for (const sourceId of Object.keys(sources)) {
    const normalized = sourceId.toLowerCase();
    const existing = seen.get(normalized);
    if (existing) {
      ctx.addIssue({
        code: "custom",
        path: ["sources", sourceId],
        message: `Source ID '${sourceId}' conflicts case-insensitively with '${existing}'`,
      });
    } else {
      seen.set(normalized, sourceId);
    }
  }
}

function validateTemplateRequests(template: string, requests: Record<string, CustomJsxRequest>, ctx: z.RefinementCtx) {
  for (const match of template.matchAll(/<(SubFetch|ActionButton|ToggleSwitch)\b([^>]*)>/gu)) {
    const component = match[1] as "SubFetch" | "ActionButton" | "ToggleSwitch";
    const attributes = match[2] ?? "";
    const idMatch = attributes.match(/\brequestId\s*=\s*(?:"([^"]+)"|'([^']+)')/u);
    const requestId = idMatch?.[1] ?? idMatch?.[2];
    if (!requestId) {
      ctx.addIssue({ code: "custom", path: ["template"], message: `${component} must use a literal requestId` });
      continue;
    }
    const request = requests[requestId];
    const expectedKind = component === "SubFetch" ? "query" : "action";
    if (!request)
      ctx.addIssue({
        code: "custom",
        path: ["template"],
        message: `${component} references unknown request '${requestId}'`,
      });
    else if (request.kind !== expectedKind)
      ctx.addIssue({ code: "custom", path: ["template"], message: `${component} requires a ${expectedKind} request` });
    else if (component === "SubFetch" && request.trigger !== "manual")
      ctx.addIssue({ code: "custom", path: ["template"], message: `SubFetch requires '${requestId}' to be manual` });
  }
}

export type HomarrCustomWidgetV2 = z.infer<typeof customWidgetDefinitionSchema>;
export type HomarrCustomWidgetV2Input = z.input<typeof customWidgetDefinitionSchema>;
export const customWidgetCreateSchema = customWidgetDefinitionSchema.safeExtend({
  secrets: customWidgetSecretsInputSchema.default([]),
});
export const customWidgetUpdateSchema = z
  .strictObject(customWidgetDefinitionSchema.shape)
  .partial()
  .extend({ id: z.string().min(1), secrets: customWidgetSecretsInputSchema.optional() });
export const customWidgetImportSchema = customWidgetDefinitionSchema;
export type CustomWidgetCreateInput = z.infer<typeof customWidgetCreateSchema>;
export type CustomWidgetUpdateInput = z.infer<typeof customWidgetUpdateSchema>;
export type CustomWidgetImport = z.infer<typeof customWidgetImportSchema>;
