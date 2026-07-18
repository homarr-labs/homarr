import { z } from "zod/v4";

import { customWidgetMethods } from "./schema-types";

export const customJsxNetworkScopes = ["public", "private", "loopback"] as const;
export type CustomJsxNetworkScope = (typeof customJsxNetworkScopes)[number];
export const customJsxRequestParameterTypes = ["string", "number", "boolean"] as const;
export type CustomJsxRequestParameterType = (typeof customJsxRequestParameterTypes)[number];

export const customWidgetIdentifierSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_-]*$/, "IDs must start with a letter and contain lowercase letters, numbers, - or _");
export const customWidgetParameterIdentifierSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z][A-Za-z0-9_-]*$/u, "Parameter names must start with a letter and contain letters, numbers, - or _");

const requestParametersSchema = z
  .record(customWidgetParameterIdentifierSchema, z.enum(customJsxRequestParameterTypes))
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
const headerNameSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/u, "Header names must be valid HTTP tokens")
  .refine((name) => {
    const normalized = name.toLowerCase();
    return (
      !reservedRequestHeaders.has(normalized) &&
      !normalized.startsWith("proxy-") &&
      !normalized.startsWith("sec-") &&
      !normalized.startsWith("x-forwarded-")
    );
  }, "Authentication cannot use a reserved, proxy, forwarding, or hop-by-hop header");
const staticHeadersSchema = z
  .record(headerNameSchema, z.string().max(8192))
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
  )
  .refine(
    (headers) =>
      Object.entries(headers).every(
        ([name, value]) =>
          !/(^|[-_])(api[-_]?keys?|passwords?|passwds?|secrets?|tokens?|access[-_]?tokens?|refresh[-_]?tokens?|client[-_]?secrets?)($|[-_])/iu.test(
            name,
          ) || value.trim().length === 0,
      ),
    "Credential-like static headers must use source authentication",
  );

const collectParameterNames = (value: unknown, result = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectParameterNames(entry, result));
    return result;
  }
  if (value === null || typeof value !== "object") return result;
  const entries = Object.entries(value);
  if (entries.length === 1 && entries[0]?.[0] === "$param" && typeof entries[0][1] === "string") {
    result.add(entries[0][1]);
    return result;
  }
  entries.forEach(([, entry]) => collectParameterNames(entry, result));
  return result;
};

const hasNoControlCharacters = (value: string) =>
  [...value].every((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint >= 0x20 && codePoint !== 0x7f;
  });

const authSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({ type: z.literal("bearer") }),
  z.object({ type: z.literal("basic") }),
  z.object({ type: z.literal("apiKeyHeader"), headerName: headerNameSchema }),
  z.object({
    type: z.literal("apiKeyQuery"),
    parameterName: z
      .string()
      .min(1)
      .max(256)
      .refine(hasNoControlCharacters, "Query authentication parameter names cannot contain control characters"),
  }),
]);

export const customWidgetSourceSchema = z.object({
  id: customWidgetIdentifierSchema,
  name: z.string().trim().min(1).max(128),
  baseUrl: z
    .string()
    .url()
    .max(2048)
    .superRefine((value, ctx) => {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        ctx.addIssue({ code: "custom", message: "API sources must use HTTP or HTTPS" });
      }
      if (url.username || url.password) {
        ctx.addIssue({ code: "custom", message: "Credentials must not be embedded in an API source URL" });
      }
      if (url.search || url.hash) {
        ctx.addIssue({ code: "custom", message: "API source URLs cannot contain a query string or fragment" });
      }
    }),
  networkScope: z.enum(customJsxNetworkScopes),
  auth: authSchema,
});
export type CustomWidgetSource = z.infer<typeof customWidgetSourceSchema>;

export const customJsxRequestSchema = z
  .object({
    id: customWidgetIdentifierSchema,
    sourceId: customWidgetIdentifierSchema,
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
    queryTemplate: z.record(z.string().min(1).max(256), z.json()).optional(),
    bodyTemplate: z.json().optional(),
    staticHeaders: staticHeadersSchema.optional(),
    auth: z.enum(["inherit", "none"]),
    minimumBoardPermission: z.enum(["view", "modify", "full"]),
    trigger: z.enum(["load", "manual"]).default("manual"),
    cacheTtlSeconds: z.number().int().min(0).max(3600).optional(),
    confirmation: z
      .object({
        title: z.string().min(1).max(128),
        message: z.string().min(1).max(512),
        confirmLabel: z.string().min(1).max(64).optional(),
        destructive: z.boolean().optional(),
      })
      .optional(),
    invalidates: z.array(customWidgetIdentifierSchema).max(32).optional(),
  })
  .superRefine((request, ctx) => {
    if (request.kind === "action" && request.trigger === "load") {
      ctx.addIssue({ code: "custom", path: ["trigger"], message: "Actions cannot run automatically" });
    }
    if (request.kind === "action" && request.cacheTtlSeconds !== undefined && request.cacheTtlSeconds !== 0) {
      ctx.addIssue({ code: "custom", path: ["cacheTtlSeconds"], message: "Actions cannot be cached" });
    }
    if (request.kind === "query" && request.confirmation !== undefined) {
      ctx.addIssue({ code: "custom", path: ["confirmation"], message: "Only actions can require confirmation" });
    }
    if (request.kind === "query" && request.invalidates !== undefined) {
      ctx.addIssue({ code: "custom", path: ["invalidates"], message: "Only actions can invalidate queries" });
    }
    if (request.method === "DELETE" && request.minimumBoardPermission !== "full") {
      ctx.addIssue({
        code: "custom",
        path: ["minimumBoardPermission"],
        message: "DELETE requests require full permission",
      });
    }
    const declared = new Set(Object.keys(request.parameters));
    const used = [...request.pathTemplate.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1] ?? "");
    collectParameterNames(request.queryTemplate).forEach((name) => used.push(name));
    collectParameterNames(request.bodyTemplate).forEach((name) => used.push(name));
    for (const name of used) {
      if (!declared.has(name)) {
        ctx.addIssue({ code: "custom", path: ["parameters"], message: `Placeholder '${name}' is not declared` });
      }
    }
  });
export type CustomJsxRequest = z.infer<typeof customJsxRequestSchema>;
