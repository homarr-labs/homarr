import { TRPCError } from "@trpc/server";

import { decryptSecret, encryptSecret } from "@homarr/common";
import type { Database } from "@homarr/db";
import { and, createId, eq } from "@homarr/db";
import { integrations, integrationSecrets } from "@homarr/db/schema/sqlite";
import type { IntegrationSecretKind } from "@homarr/definitions";
import { integrationKinds, integrationSecretKindObject } from "@homarr/definitions";
import { validation } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../../trpc";
import { testConnectionAsync } from "./integration-test-connection";

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
          integrationKinds.indexOf(integrationA.kind) - integrationKinds.indexOf(integrationB.kind),
      );
  }),
  byId: publicProcedure.input(validation.integration.byId).query(async ({ ctx, input }) => {
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
        value: integrationSecretKindObject[secret.kind].isPublic ? decryptSecret(secret.value) : null,
        updatedAt: secret.updatedAt,
      })),
    };
  }),
  create: publicProcedure.input(validation.integration.create).mutation(async ({ ctx, input }) => {
    await testConnectionAsync({
      id: "new",
      name: input.name,
      url: input.url,
      kind: input.kind,
      secrets: input.secrets,
    });

    const integrationId = createId();
    await ctx.db.insert(integrations).values({
      id: integrationId,
      name: input.name,
      url: input.url,
      kind: input.kind,
    });

    if (input.secrets.length >= 1) {
      await ctx.db.insert(integrationSecrets).values(
        input.secrets.map((secret) => ({
          kind: secret.kind,
          value: encryptSecret(secret.value),
          integrationId,
        })),
      );
    }
  }),
  update: publicProcedure.input(validation.integration.update).mutation(async ({ ctx, input }) => {
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

    await testConnectionAsync(
      {
        id: input.id,
        name: input.name,
        url: input.url,
        kind: integration.kind,
        secrets: input.secrets,
      },
      integration.secrets,
    );

    await ctx.db
      .update(integrations)
      .set({
        name: input.name,
        url: input.url,
      })
      .where(eq(integrations.id, input.id));

    const changedSecrets = input.secrets.filter(
      (secret): secret is { kind: IntegrationSecretKind; value: string } =>
        secret.value !== null && // only update secrets that have a value
        !integration.secrets.find(
          // Checked above
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          (dbSecret) => dbSecret.kind === secret.kind && dbSecret.value === encryptSecret(secret.value!),
        ),
    );

    if (changedSecrets.length > 0) {
      for (const changedSecret of changedSecrets) {
        const secretInput = {
          integrationId: input.id,
          value: changedSecret.value,
          kind: changedSecret.kind,
        };
        if (!integration.secrets.some((secret) => secret.kind === changedSecret.kind)) {
          await addSecretAsync(ctx.db, secretInput);
        } else {
          await updateSecretAsync(ctx.db, secretInput);
        }
      }
    }
  }),
  delete: publicProcedure.input(validation.integration.delete).mutation(async ({ ctx, input }) => {
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
});

interface UpdateSecretInput {
  integrationId: string;
  value: string;
  kind: IntegrationSecretKind;
}
const updateSecretAsync = async (db: Database, input: UpdateSecretInput) => {
  await db
    .update(integrationSecrets)
    .set({
      value: encryptSecret(input.value),
    })
    .where(and(eq(integrationSecrets.integrationId, input.integrationId), eq(integrationSecrets.kind, input.kind)));
};

interface AddSecretInput {
  integrationId: string;
  value: string;
  kind: IntegrationSecretKind;
}
const addSecretAsync = async (db: Database, input: AddSecretInput) => {
  await db.insert(integrationSecrets).values({
    kind: input.kind,
    value: encryptSecret(input.value),
    integrationId: input.integrationId,
  });
};
