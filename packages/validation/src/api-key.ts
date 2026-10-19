import { z } from "zod/v4";

import { integrationKinds } from "@homarr/definitions";

// Restricted requests use a deliberately small canonical path alphabet. Reject
// encoded separators, dot segments and alternate normalization before URL parsing.
export const integrationEndpointPathSchema = z
  .string()
  .min(1)
  .max(1024)
  .regex(/^\/(?:[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*\/?)?$/)
  .refine((path) => !path.split("/").some((segment) => segment === "." || segment === ".."), {
    message: "Use an exact endpoint path without dot segments or encoded characters",
  });

const queryParameterSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/),
    values: z
      .array(
        z
          .string()
          .max(256)
          .refine((value) => !/\p{Cc}/u.test(value), { message: "Query values cannot contain control characters" }),
      )
      .min(1)
      .max(32),
  })
  .strict();

export const restrictedIntegrationEndpointSchema = z
  .object({
    integrationId: z.string().min(1).max(128),
    methods: z
      .array(z.enum(["GET", "HEAD"]))
      .min(1)
      .max(2),
    path: integrationEndpointPathSchema,
    query: z.array(queryParameterSchema).max(16).default([]),
  })
  .strict()
  .refine((rule) => new Set(rule.methods).size === rule.methods.length, { message: "Duplicate method" })
  .refine((rule) => new Set(rule.query.map(({ name }) => name)).size === rule.query.length, {
    message: "Duplicate query parameter",
  });

export const createRestrictedApiKeySchema = z
  .object({ endpoints: z.array(restrictedIntegrationEndpointSchema).min(1).max(32) })
  .strict();

export const apiKeyRestrictionsSchema = z
  .object({
    version: z.literal(1),
    endpoints: z
      .array(
        restrictedIntegrationEndpointSchema.safeExtend({
          integrationUrl: z.string().url().max(8192),
          integrationKind: z.enum(integrationKinds),
        }),
      )
      .min(1)
      .max(32),
  })
  .strict();

export type ApiKeyRestrictions = z.infer<typeof apiKeyRestrictionsSchema>;
