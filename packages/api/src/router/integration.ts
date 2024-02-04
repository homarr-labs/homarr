import crypto from "crypto";
import { TRPCError } from "@trpc/server";

import type { Database } from "@homarr/db";
import { and, createId, eq } from "@homarr/db";
import { integrations, integrationSecrets } from "@homarr/db/schema/sqlite";
import type { IntegrationSecretKind } from "@homarr/definitions";
import {
  getSecretKinds,
  integrationKinds,
  integrationSecretKindObject,
} from "@homarr/definitions";
import { validation } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const integrationRouter = createTRPCRouter({
  all: publicProcedure.query(async ({ ctx }) => {
    const integrations = await ctx.db.query.integrations.findMany();
    return integrations
      .map((integration) => ({
        id: integration.id,
        name: integration.name,
        kind: integration.kind,
        url: integration.url,
      }))
      .sort(
        (integrationA, integrationB) =>
          integrationKinds.indexOf(integrationA.kind) -
          integrationKinds.indexOf(integrationB.kind),
      );
  }),
  byId: publicProcedure
    .input(validation.integration.byId)
    .query(async ({ ctx, input }) => {
      const integration = await ctx.db.query.integrations.findFirst({
        where: eq(integrations.id, input.id),
        with: {
          secrets: {
            columns: {
              kind: true,
              value: true,
              updatedAt: true,
            },
          },
        },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      return {
        id: integration.id,
        name: integration.name,
        kind: integration.kind,
        url: integration.url,
        secrets: integration.secrets.map((secret) => ({
          kind: secret.kind,
          // Only return the value if the secret is public, so for example the username
          value: integrationSecretKindObject[secret.kind].isPublic
            ? decryptSecret(secret.value)
            : null,
          updatedAt: secret.updatedAt,
        })),
      };
    }),
  create: publicProcedure
    .input(validation.integration.create)
    .mutation(async ({ ctx, input }) => {
      const integrationId = createId();
      await ctx.db.insert(integrations).values({
        id: integrationId,
        name: input.name,
        url: input.url,
        kind: input.kind,
      });

      for (const secret of input.secrets) {
        await ctx.db.insert(integrationSecrets).values({
          kind: secret.kind,
          value: encryptSecret(secret.value),
          updatedAt: new Date(),
          integrationId,
        });
      }
    }),
  update: publicProcedure
    .input(validation.integration.update)
    .mutation(async ({ ctx, input }) => {
      const integration = await ctx.db.query.integrations.findFirst({
        where: eq(integrations.id, input.id),
        with: {
          secrets: true,
        },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      await ctx.db
        .update(integrations)
        .set({
          name: input.name,
          url: input.url,
        })
        .where(eq(integrations.id, input.id));

      const decryptedSecrets = integration.secrets.map((secret) => ({
        ...secret,
        value: decryptSecret(secret.value),
      }));

      const changedSecrets = input.secrets.filter(
        (secret): secret is { kind: IntegrationSecretKind; value: string } =>
          secret.value !== null && // only update secrets that have a value
          !decryptedSecrets.find(
            (dSecret) =>
              dSecret.kind === secret.kind && dSecret.value === secret.value,
          ),
      );

      if (changedSecrets.length > 0) {
        for (const changedSecret of changedSecrets) {
          const secretInput = {
            integrationId: input.id,
            value: changedSecret.value,
            kind: changedSecret.kind,
          };
          if (!decryptedSecrets.some((x) => x.kind === changedSecret.kind)) {
            await addSecret(ctx.db, secretInput);
          } else {
            await updateSecret(ctx.db, secretInput);
          }
        }
      }
    }),
  delete: publicProcedure
    .input(validation.integration.delete)
    .mutation(async ({ ctx, input }) => {
      const integration = await ctx.db.query.integrations.findFirst({
        where: eq(integrations.id, input.id),
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      await ctx.db.delete(integrations).where(eq(integrations.id, input.id));
    }),
  testConnection: publicProcedure
    .input(validation.integration.testConnection)
    .mutation(async ({ ctx, input }) => {
      const secretKinds = getSecretKinds(input.kind);
      const secrets = input.secrets.filter(
        (secret): secret is { kind: IntegrationSecretKind; value: string } =>
          !!secret.value,
      );
      const everyInputSecretDefined = secretKinds.every((secretKind) =>
        secrets.some((secret) => secret.kind === secretKind),
      );
      if (!everyInputSecretDefined && input.id === null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "SECRETS_NOT_DEFINED",
        });
      }

      if (!everyInputSecretDefined && input.id !== null) {
        const integration = await ctx.db.query.integrations.findFirst({
          where: eq(integrations.id, input.id),
          with: {
            secrets: true,
          },
        });
        if (!integration) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "SECRETS_NOT_DEFINED",
          });
        }
        const decryptedSecrets = integration.secrets.map((secret) => ({
          ...secret,
          value: decryptSecret(secret.value),
        }));

        // Add secrets that are not defined in the input from the database
        for (const dbSecret of decryptedSecrets) {
          if (!secrets.find((secret) => secret.kind === dbSecret.kind)) {
            secrets.push({
              kind: dbSecret.kind,
              value: dbSecret.value,
            });
          }
        }
      }

      // TODO: actually test the connection
      // Probably by calling a function on the integration class
      // getIntegration(input.kind).testConnection(secrets)
      // getIntegration(kind: IntegrationKind): Integration
      // interface Integration {
      //   testConnection(): Promise<void>;
      // }
    }),
});

const algorithm = "aes-256-cbc"; //Using AES encryption
const key = Buffer.from(
  "1d71cceced68159ba59a277d056a66173613052cbeeccbfbd15ab1c909455a4d",
  "hex",
); // TODO: generate with const data = crypto.randomBytes(32).toString('hex')

//Encrypting text
export function encryptSecret(text: string): `${string}.${string}` {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${encrypted.toString("hex")}.${iv.toString("hex")}`;
}

// Decrypting text
function decryptSecret(value: `${string}.${string}`) {
  const [data, dataIv] = value.split(".") as [string, string];
  const iv = Buffer.from(dataIv, "hex");
  const encryptedText = Buffer.from(data, "hex");
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

interface UpdateSecretInput {
  integrationId: string;
  value: string;
  kind: IntegrationSecretKind;
}
const updateSecret = async (db: Database, input: UpdateSecretInput) => {
  await db
    .update(integrationSecrets)
    .set({
      value: encryptSecret(input.value),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(integrationSecrets.integrationId, input.integrationId),
        eq(integrationSecrets.kind, input.kind),
      ),
    );
};

interface AddSecretInput {
  integrationId: string;
  value: string;
  kind: IntegrationSecretKind;
}
const addSecret = async (db: Database, input: AddSecretInput) => {
  await db.insert(integrationSecrets).values({
    kind: input.kind,
    value: encryptSecret(input.value),
    updatedAt: new Date(),
    integrationId: input.integrationId,
  });
};
