import { z } from "zod/v4";

import { validateCustomJsxTemplate } from "../jsx/analyzer";
import { customWidgetMethods } from "./schema-types";

export const customJsxNetworkScopes = ["public", "private", "loopback"] as const;
export type CustomJsxNetworkScope = (typeof customJsxNetworkScopes)[number];

export const customJsxRequestParameterTypes = ["string", "number", "boolean"] as const;
export type CustomJsxRequestParameterType = (typeof customJsxRequestParameterTypes)[number];

const requestIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z][a-z0-9_-]*$/,
    "Request IDs must start with a letter and contain only lowercase letters, numbers, - or _",
  );

const requestParametersSchema = z
  .record(requestIdSchema, z.enum(customJsxRequestParameterTypes))
  .refine((parameters) => Object.keys(parameters).length <= 32, "A request can declare at most 32 parameters");

const reservedRequestHeaders = new Set([
  "authorization",
  "connection",
  "content-length",
  "cookie",
  "expect",
  "forwarded",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "via",
]);

const staticHeadersSchema = z
  .record(z.string().min(1).max(128), z.string().max(8192))
  .refine((headers) => Object.keys(headers).length <= 32, "A request can declare at most 32 static headers")
  .refine(
    (headers) =>
      Object.keys(headers).every((name) => {
        const normalized = name.trim().toLowerCase();
        return (
          !reservedRequestHeaders.has(normalized) &&
          !normalized.startsWith("proxy-") &&
          !normalized.startsWith("sec-") &&
          !normalized.startsWith("x-forwarded-")
        );
      }),
    "Static headers cannot override authentication, cookies, routing, forwarding, proxy, or hop-by-hop headers",
  );

const collectBodyParameterNames = (value: unknown, result = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectBodyParameterNames(entry, result));
    return result;
  }
  if (value === null || typeof value !== "object") return result;
  const entries = Object.entries(value);
  if (entries.length === 1 && entries[0]?.[0] === "$param" && typeof entries[0][1] === "string") {
    result.add(entries[0][1]);
    return result;
  }
  entries.forEach(([, entry]) => collectBodyParameterNames(entry, result));
  return result;
};

export const customJsxRequestSchema = z
  .object({
    id: requestIdSchema,
    kind: z.enum(["query", "action"]),
    method: z.enum(customWidgetMethods),
    pathTemplate: z
      .string()
      .min(1)
      .max(2048)
      .startsWith("/")
      .refine((path) => !path.startsWith("//"), "Path templates must be same-origin paths")
      .refine((path) => !path.includes("\\"), "Path templates cannot contain backslashes")
      .refine((path) => !path.includes("#"), "Path templates cannot contain URL fragments"),
    parameters: requestParametersSchema,
    bodyTemplate: z.json().optional(),
    staticHeaders: staticHeadersSchema.optional(),
    auth: z.enum(["inherit", "none"]),
    minimumBoardPermission: z.enum(["view", "modify", "full"]),
    cacheTtlSeconds: z.number().int().min(0).max(3600).optional(),
    allowViewerExecution: z.literal(true).optional(),
  })
  .superRefine((request, ctx) => {
    if (request.kind === "query" && request.method !== "GET") {
      ctx.addIssue({
        code: "custom",
        path: ["method"],
        message: "Query requests must use GET",
      });
    }

    if (request.kind === "action" && request.method === "GET") {
      ctx.addIssue({
        code: "custom",
        path: ["method"],
        message: "Action requests must use POST, PUT, PATCH, or DELETE",
      });
    }

    if (request.kind === "query" && request.minimumBoardPermission !== "view") {
      ctx.addIssue({
        code: "custom",
        path: ["minimumBoardPermission"],
        message: "Query requests use view permission",
      });
    }

    if (request.method === "DELETE" && request.minimumBoardPermission !== "full") {
      ctx.addIssue({
        code: "custom",
        path: ["minimumBoardPermission"],
        message: "DELETE actions require full board permission",
      });
    }

    if (
      request.kind === "action" &&
      request.method !== "DELETE" &&
      request.minimumBoardPermission === "view" &&
      request.allowViewerExecution !== true
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["allowViewerExecution"],
        message: "Viewer actions require explicit allowViewerExecution approval",
      });
    }

    if (request.kind === "query" && request.bodyTemplate !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["bodyTemplate"],
        message: "GET query requests cannot define a request body",
      });
    }

    if (request.kind === "action" && request.cacheTtlSeconds !== undefined && request.cacheTtlSeconds !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["cacheTtlSeconds"],
        message: "Actions cannot be cached",
      });
    }

    const declaredParameters = new Set(Object.keys(request.parameters));
    const pathParameters = [...request.pathTemplate.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1] ?? "");
    for (const parameter of [...pathParameters, ...collectBodyParameterNames(request.bodyTemplate)]) {
      if (!declaredParameters.has(parameter)) {
        ctx.addIssue({
          code: "custom",
          path: [request.bodyTemplate === undefined ? "pathTemplate" : "parameters"],
          message: `Placeholder '${parameter}' is not declared in request parameters`,
        });
      }
    }
  });

export type CustomJsxRequest = z.infer<typeof customJsxRequestSchema>;

const customJsxTemplateSchema = z
  .string()
  .min(1)
  .max(50000)
  .superRefine((template, ctx) => {
    for (const diagnostic of validateCustomJsxTemplate(template)) {
      if (diagnostic.severity === "error") {
        ctx.addIssue({
          code: "custom",
          message: `${diagnostic.message} (line ${diagnostic.line}, column ${diagnostic.column})`,
        });
      }
    }
  })
  .describe(
    "JSX template string using whitelisted Mantine components. Access API data via {data.fieldName}. Direct fetch and XMLHttpRequest access are unavailable; v2 templates reference named requests.",
  );

export const customJsxDisplayConfigV1Schema = z.object({
  type: z
    .literal("customJsx")
    .describe("Display type discriminator — must be 'customJsx' when displayType is customJsx"),
  template: customJsxTemplateSchema,
  jsxApiVersion: z.never().optional(),
  networkScope: z.never().optional(),
  requests: z.never().optional(),
});

export const customJsxDisplayConfigV2Schema = z
  .object({
    type: z.literal("customJsx"),
    jsxApiVersion: z.literal(2),
    template: customJsxTemplateSchema,
    networkScope: z.enum(customJsxNetworkScopes),
    requests: z.array(customJsxRequestSchema).max(64),
  })
  .superRefine((config, ctx) => {
    const requestsById = new Map<string, CustomJsxRequest>();
    for (const [index, request] of config.requests.entries()) {
      if (requestsById.has(request.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["requests", index, "id"],
          message: `Duplicate request ID: ${request.id}`,
        });
      }
      requestsById.set(request.id, request);
    }

    const networkComponentPattern = /<(SubFetch|ActionButton|ToggleSwitch)\b([^>]*)>/g;
    for (const match of config.template.matchAll(networkComponentPattern)) {
      const component = match[1] as "SubFetch" | "ActionButton" | "ToggleSwitch";
      const attributes = match[2] ?? "";
      const idMatch = attributes.match(/\brequestId\s*=\s*(?:"([^"]+)"|'([^']+)')/);
      const requestId = idMatch?.[1] ?? idMatch?.[2];
      if (!requestId) {
        ctx.addIssue({
          code: "custom",
          path: ["template"],
          message: `${component} must use a literal requestId`,
        });
        continue;
      }

      const request = requestsById.get(requestId);
      const expectedKind = component === "SubFetch" ? "query" : "action";
      if (!request) {
        ctx.addIssue({
          code: "custom",
          path: ["template"],
          message: `${component} references unknown request '${requestId}'`,
        });
      } else if (request.kind !== expectedKind) {
        ctx.addIssue({
          code: "custom",
          path: ["template"],
          message: `${component} requires a ${expectedKind} request, but '${requestId}' is ${request.kind}`,
        });
      }

      if (/\b(?:url|method|headers|body)\s*=/.test(attributes)) {
        ctx.addIssue({
          code: "custom",
          path: ["template"],
          message: `${component} cannot declare inline network settings`,
        });
      }
    }
  });

export type CustomJsxDisplayConfigV2 = z.infer<typeof customJsxDisplayConfigV2Schema>;
