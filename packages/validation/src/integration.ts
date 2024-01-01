import { z } from "zod";

import { integrationKinds, integrationSecretKinds } from "@homarr/definitions";

import { zodEnumFromArray } from "./enums";

const integrationCreateSchema = z.object({
  name: z.string().nonempty().max(127),
  url: z.string().url(),
  kind: zodEnumFromArray(integrationKinds),
  secrets: z.array(
    z.object({
      kind: zodEnumFromArray(integrationSecretKinds),
      value: z.string(),
    }),
  ),
});

const integrationUpdateSchema = z.object({
  id: z.string().cuid2(),
  name: z.string().nonempty().max(127),
  url: z.string().url(),
  secrets: z.array(
    z.object({
      kind: zodEnumFromArray(integrationSecretKinds),
      value: z.string().nullable(),
    }),
  ),
});

const idSchema = z.object({
  id: z.string(),
});

const testConnectionSchema = z.object({
  id: z.string().cuid2().nullable(), // Is used to use existing secrets if they have not been updated
  url: z.string().url(),
  kind: zodEnumFromArray(integrationKinds),
  secrets: z.array(
    z.object({
      kind: zodEnumFromArray(integrationSecretKinds),
      value: z.string().nullable(),
    }),
  ),
});

export const integrationSchemas = {
  create: integrationCreateSchema,
  update: integrationUpdateSchema,
  delete: idSchema,
  byId: idSchema,
  testConnection: testConnectionSchema,
};
