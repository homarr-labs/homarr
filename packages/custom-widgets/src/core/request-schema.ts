import { z } from "zod/v4";

import { customWidgetMethods } from "./schema-types";
import { getCustomWidgetHttpUrlIssue } from "./url-policy";

export const customJsxNetworkScopes = ["public", "private", "loopback"] as const;
export type CustomJsxNetworkScope = (typeof customJsxNetworkScopes)[number];

export const customWidgetIdentifierSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z][A-Za-z0-9_-]*$/u, "IDs must start with a letter and contain letters, numbers, - or _");

const headerNameSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/u, "Header names must be valid HTTP tokens");

const authSchema = z.union([
  z.enum(["none", "bearer", "basic"]),
  z.strictObject({ type: z.literal("apiKeyHeader"), name: headerNameSchema }),
  z.strictObject({ type: z.literal("apiKeyQuery"), name: z.string().trim().min(1).max(256) }),
]);

export type CustomWidgetSourceUrlIssue = "invalid" | "protocol" | "credentials" | "queryOrFragment";

export function getCustomWidgetSourceUrlIssue(value: string): CustomWidgetSourceUrlIssue | null {
  const issue = getCustomWidgetHttpUrlIssue(value);
  if (issue) return issue;
  const url = new URL(value);
  if (url.search || url.hash) return "queryOrFragment";
  return null;
}

const sourceUrlIssueMessages: Record<CustomWidgetSourceUrlIssue, string> = {
  invalid: "Must be a valid URL",
  protocol: "API sources must use HTTP or HTTPS",
  credentials: "Credentials must not be embedded in an API source URL",
  queryOrFragment: "API source URLs cannot contain a query string or fragment",
};

export const customWidgetSourceSchema = z.strictObject({
  name: z.string().trim().min(1).max(128).optional(),
  baseUrl: z
    .string()
    .superRefine((value, ctx) => {
      const issue = getCustomWidgetSourceUrlIssue(value);
      if (issue) ctx.addIssue({ code: "custom", message: sourceUrlIssueMessages[issue] });
    })
    .url()
    .max(2048),
  networkScope: z.enum(customJsxNetworkScopes),
  auth: authSchema.default("none"),
});
export type CustomWidgetSource = z.infer<typeof customWidgetSourceSchema>;

export const customWidgetSourcesSchema = z
  .record(customWidgetIdentifierSchema, customWidgetSourceSchema)
  .refine((sources) => Object.keys(sources).length <= 8, "A widget can use at most 8 API sources")
  .refine((sources) => Object.hasOwn(sources, "default"), "A widget must define a default API source");

export const optionReferenceSchema = z.strictObject({ $option: customWidgetIdentifierSchema });
export const parameterReferenceSchema = z.strictObject({ $param: customWidgetIdentifierSchema });
export type CustomWidgetValueReference =
  | z.infer<typeof optionReferenceSchema>
  | z.infer<typeof parameterReferenceSchema>;

export const boundValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.null(),
    z.string(),
    z.number().finite(),
    z.boolean(),
    optionReferenceSchema,
    parameterReferenceSchema,
    z.array(boundValueSchema),
    z.record(z.string(), boundValueSchema),
  ]),
);

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

const headersSchema = z
  .record(headerNameSchema, z.string().max(8192))
  .refine((headers) => Object.keys(headers).length <= 32, "A request can declare at most 32 headers")
  .refine(
    (headers) =>
      Object.keys(headers).every((name) => {
        const normalized = name.toLowerCase();
        return (
          !reservedRequestHeaders.has(normalized) &&
          !normalized.startsWith("proxy-") &&
          !normalized.startsWith("sec-") &&
          !normalized.startsWith("x-forwarded-")
        );
      }),
    "Headers cannot override authentication, cookies, routing, forwarding, proxy, or hop-by-hop headers",
  )
  .refine(
    (headers) =>
      Object.keys(headers).every((name) => !/(?:api[-_]?key|authorization|password|secret|token)/iu.test(name)),
    "Credential headers must be configured through source authentication",
  );

const confirmationSchema = z.union([
  z.string().trim().min(1).max(512),
  z.strictObject({
    title: z.string().trim().min(1).max(128),
    message: z.string().trim().min(1).max(512),
    confirmLabel: z.string().trim().min(1).max(64).optional(),
    destructive: z.boolean().optional(),
  }),
]);

export const customJsxRequestSchema = z
  .strictObject({
    source: customWidgetIdentifierSchema.default("default"),
    kind: z.enum(["query", "action"]).default("query"),
    method: z.enum(customWidgetMethods).default("GET"),
    path: z
      .string()
      .min(1)
      .max(2048)
      .startsWith("/")
      .refine((path) => !path.startsWith("//"), "Request paths must be same-origin")
      .refine((path) => !path.includes("\\"), "Request paths cannot contain backslashes")
      .refine((path) => !path.includes("#"), "Request paths cannot contain URL fragments")
      .refine(
        (path) => !/[{}]/u.test(path.replaceAll(/\{(?:option|param):[A-Za-z][A-Za-z0-9_-]*\}/gu, "")),
        "Request paths contain an invalid placeholder; use {option:name} or {param:name}",
      ),
    trigger: z.enum(["load", "manual"]).optional(),
    query: z.record(z.string().min(1).max(256), boundValueSchema).optional(),
    body: boundValueSchema.optional(),
    headers: headersSchema.optional(),
    auth: z.enum(["inherit", "none"]).default("inherit"),
    permission: z.enum(["view", "modify", "full"]).optional(),
    cacheSeconds: z.number().int().min(0).max(3600).optional(),
    confirmation: confirmationSchema.optional(),
    invalidates: z.array(customWidgetIdentifierSchema).max(32).optional(),
  })
  .superRefine((request, context) => {
    if (request.method === "DELETE" && request.kind !== "action") {
      context.addIssue({
        code: "custom",
        path: ["kind"],
        message: "DELETE requests must be manual actions",
      });
    }
  })
  .transform((request) => {
    const confirmation =
      request.method === "DELETE" && request.confirmation === undefined
        ? ({ title: "Confirm action", message: "Are you sure?", destructive: true } as const)
        : request.confirmation;
    return {
      ...request,
      trigger: request.kind === "action" ? ("manual" as const) : (request.trigger ?? ("load" as const)),
      permission:
        request.method === "DELETE"
          ? ("full" as const)
          : (request.permission ?? (request.kind === "action" ? ("modify" as const) : ("view" as const))),
      ...(confirmation === undefined ? {} : { confirmation }),
    };
  });

export type CustomJsxRequest = z.infer<typeof customJsxRequestSchema>;
export type CustomJsxRequestInput = z.input<typeof customJsxRequestSchema>;

export interface CustomWidgetConfirmation {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}

export function getCustomWidgetConfirmation(
  request: Pick<CustomJsxRequest, "confirmation" | "method">,
): CustomWidgetConfirmation | undefined {
  if (typeof request.confirmation === "string") {
    return { title: "Confirm action", message: request.confirmation };
  }
  return request.confirmation;
}

export const customWidgetRequestsSchema = z
  .record(customWidgetIdentifierSchema, customJsxRequestSchema)
  .refine((requests) => Object.keys(requests).length <= 64, "A widget can define at most 64 requests");

const pathReferencePattern = /\{(option|param):([A-Za-z][A-Za-z0-9_-]*)\}/gu;

export interface CustomWidgetRequestReferences {
  options: Set<string>;
  params: Set<string>;
}

export function collectCustomWidgetRequestReferences(request: Pick<CustomJsxRequest, "path" | "query" | "body">) {
  const references: CustomWidgetRequestReferences = { options: new Set(), params: new Set() };
  for (const match of request.path.matchAll(pathReferencePattern)) {
    const name = match[2];
    if (name) references[match[1] === "option" ? "options" : "params"].add(name);
  }
  collectBoundValueReferences(request.query, references);
  collectBoundValueReferences(request.body, references);
  return references;
}

function collectBoundValueReferences(value: unknown, references: CustomWidgetRequestReferences): void {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectBoundValueReferences(entry, references));
    return;
  }
  if (value === null || typeof value !== "object") return;
  const entries = Object.entries(value);
  if (entries.length === 1 && entries[0]?.[0] === "$option" && typeof entries[0][1] === "string") {
    references.options.add(entries[0][1]);
    return;
  }
  if (entries.length === 1 && entries[0]?.[0] === "$param" && typeof entries[0][1] === "string") {
    references.params.add(entries[0][1]);
    return;
  }
  entries.forEach(([, entry]) => collectBoundValueReferences(entry, references));
}
