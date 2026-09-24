import { z } from "zod/v4";

import { integrationKinds, integrationPermissions, integrationSecretKinds } from "@homarr/definitions";
import type { IntegrationKind } from "@homarr/definitions";

import { appManageSchema } from "./app";
import { zodEnumFromArray } from "./enums";
import { createSavePermissionsSchema } from "./permissions";

export const requiresInsecureHttpOptIn = (kind: IntegrationKind, url: string) =>
  kind === "bindery" && url.startsWith("http://");

export const integrationCreateBaseSchema = z.object({
  name: z.string().nonempty().max(127),
  url: z
    .string()
    .url()
    .regex(/^https?:\/\//), // Only allow http and https for security reasons (javascript: is not allowed)
  kind: zodEnumFromArray(integrationKinds),
  secrets: z.array(
    z.object({
      kind: zodEnumFromArray(integrationSecretKinds),
      value: z.string().nonempty(),
    }),
  ),
  attemptSearchEngineCreation: z.boolean(),
  allowInsecureHttp: z.boolean().default(false),
  app: z
    .object({
      id: z.string(),
    })
    .or(appManageSchema)
    .optional(),
});

export const integrationCreateSchema = integrationCreateBaseSchema.superRefine((input, context) => {
  if (!requiresInsecureHttpOptIn(input.kind, input.url) || input.allowInsecureHttp) return;
  context.addIssue({
    code: "custom",
    path: ["allowInsecureHttp"],
    message: "HTTP sends the Bindery API key without encryption; allow it only on a trusted local network.",
  });
});

export const integrationUpdateSchema = z.object({
  id: z.string().cuid2(),
  name: z.string().nonempty().max(127),
  url: z.string().url(),
  secrets: z.array(
    z.object({
      kind: zodEnumFromArray(integrationSecretKinds),
      value: z.string().nullable(),
    }),
  ),
  appId: z.string().nullable(),
  allowInsecureHttp: z.boolean().default(false),
});

export const integrationSavePermissionsSchema = createSavePermissionsSchema(zodEnumFromArray(integrationPermissions));
