import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { intersectFederationPermissions } from "@homarr/auth/server";
import { decryptSecret, encryptSecret } from "@homarr/common/server";
import { and, eq } from "@homarr/db";
import { federationConnections, integrationOrigins, integrationUserPermissions, integrations } from "@homarr/db/schema";
import { integrationKinds } from "@homarr/definitions";
import { exportWorkerIdentity, generateWorkerIdentity, getWorkerId, publicIdentityJwk } from "@homarr/remote-protocol";

import { getFederationProcedurePaths } from "../federation/catalog";
import {
  callFederatedProcedure,
  closeFederationConnection,
  federationSocketUrl,
  readVerifiedFederationAuthorization,
} from "../federation/client";
import type { FederationConfiguration } from "../federation/client";
import { ApiError, createApiRouter, permissionRequiredProcedure } from "../procedure";
import { federationSourceProcedures } from "./custom-widget/federation-source";
import { federationMediaProcedures } from "./custom-widget/federation-media";

const manage = permissionRequiredProcedure.requiresPermission("integration-full-all");
const idSchema = z.string().min(1).max(128);
const catalogSchema = z
  .array(
    z.object({
      id: idSchema,
      name: z.string().min(1).max(256),
      kind: z.enum(integrationKinds),
      origin: z.unknown().optional(),
      permissions: z.object({ hasUseAccess: z.boolean(), hasInteractAccess: z.boolean(), hasFullAccess: z.boolean() }),
    }),
  )
  .max(1000);

export const federationRouter = createApiRouter({
  ...federationSourceProcedures,
  ...federationMediaProcedures,
  procedurePaths: manage
    .input(z.object({ access: z.enum(["query", "interact", "full"]) }).optional())
    .query(({ input }) => getFederationProcedurePaths(input?.access)),
  connections: manage.query(async ({ context }) => {
    const rows = await context.db.query.federationConnections.findMany();
    return rows.map((row) => {
      let ready = false;
      try {
        const config = JSON.parse(
          decryptSecret(row.encryptedConfiguration as `${string}.${string}`),
        ) as FederationConfiguration;
        const remoteIntegrationId = config.verifiedAuthorization?.integrationIds[0];
        if (remoteIntegrationId)
          ready = intersectFederationPermissions(
            { hasUseAccess: true, hasInteractAccess: true, hasFullAccess: true },
            { remoteIntegrationId, connection: row },
          ).hasUseAccess;
      } catch {
        /* An unknown or older approval requires explicit reauthorization. */
      }
      return {
        id: row.id,
        workerId: row.workerId,
        name: row.name,
        enabled: row.enabled,
        ready,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
  }),
  prepareConnection: manage
    .input(
      z.object({
        workerId: z.string().regex(/^[A-Za-z0-9_-]{43}$/u),
        publicKey: z.record(z.string(), z.unknown()),
        name: z.string().trim().min(1).max(128),
        mode: z.enum(["direct", "relay"]),
        address: z.string().url().max(2048),
        capability: z.string().min(20).max(512),
      }),
    )
    .mutation(async ({ context, input }) => {
      let publicKey: JsonWebKey;
      try {
        publicKey = publicIdentityJwk(input.publicKey);
        federationSocketUrl(input.mode, input.address, input.workerId);
      } catch {
        throw new ApiError({ code: "BAD_REQUEST", message: "Invalid source worker identity or connection address" });
      }
      if ((await getWorkerId(publicKey)) !== input.workerId)
        throw new ApiError({ code: "BAD_REQUEST", message: "Worker ID does not match its pinned public key" });
      if (input.workerId === context.workerAccess?.workerId)
        throw new ApiError({ code: "BAD_REQUEST", message: "Choose a different worker as an integration source" });
      const existing = await context.db.query.federationConnections.findFirst({
        where: eq(federationConnections.workerId, input.workerId),
      });
      if (existing?.enabled)
        throw new ApiError({ code: "CONFLICT", message: "This source worker is already configured" });
      const identity = await generateWorkerIdentity();
      const connectionId = existing?.id ?? createId();
      const config: FederationConfiguration = {
        version: 1,
        mode: input.mode,
        address: input.address,
        capability: input.capability,
        devicePrivateJwk: await exportWorkerIdentity(identity),
      };
      closeFederationConnection(connectionId);
      const configuration = {
        name: input.name,
        publicKey: JSON.stringify(publicKey),
        encryptedConfiguration: encryptSecret(JSON.stringify(config)),
        enabled: false,
      };
      if (existing)
        await context.db
          .update(federationConnections)
          .set(configuration)
          .where(eq(federationConnections.id, connectionId));
      else
        await context.db
          .insert(federationConnections)
          .values({ id: connectionId, workerId: input.workerId, ...configuration });
      const audience = `${context.baseUrl ?? "http://localhost"}/remote/federation/${context.workerAccess?.workerId ?? connectionId}`;
      return { connectionId, devicePublicJwk: identity.publicJwk, audience, principalId: `account:${connectionId}` };
    }),
  authorizeConnection: manage
    .input(z.object({ connectionId: idSchema, grantToken: z.string().min(20).max(32768) }))
    .mutation(async ({ context, input }) => {
      const row = await context.db.query.federationConnections.findFirst({
        where: eq(federationConnections.id, input.connectionId),
      });
      if (!row) throw new ApiError({ code: "NOT_FOUND", message: "Source worker connection not found" });
      const config = JSON.parse(
        decryptSecret(row.encryptedConfiguration as `${string}.${string}`),
      ) as FederationConfiguration;
      config.grantToken = input.grantToken;
      closeFederationConnection(row.id);
      await context.db
        .update(federationConnections)
        .set({ encryptedConfiguration: encryptSecret(JSON.stringify(config)), enabled: true })
        .where(eq(federationConnections.id, row.id));
      try {
        await callFederatedProcedure(context, row.id, ["integration", "all"], undefined);
        config.verifiedAuthorization = await readVerifiedFederationAuthorization(context, row.id);
        await context.db
          .update(federationConnections)
          .set({ encryptedConfiguration: encryptSecret(JSON.stringify(config)) })
          .where(eq(federationConnections.id, row.id));
      } catch (error) {
        await context.db
          .update(federationConnections)
          .set({ enabled: false })
          .where(eq(federationConnections.id, row.id));
        closeFederationConnection(row.id);
        throw error;
      }
      return { connectionId: row.id, enabled: true };
    }),
  catalog: manage.input(z.object({ connectionId: idSchema })).query(async ({ context, input, signal }) => {
    const result = await callFederatedProcedure(context, input.connectionId, ["integration", "all"], undefined, {
      signal,
    });
    return catalogSchema
      .parse(result)
      .filter((integration) => !integration.origin)
      .map(({ origin: _origin, ...integration }) => integration);
  }),
  importIntegrations: manage
    .input(z.object({ connectionId: idSchema, integrationIds: z.array(idSchema).min(1).max(200) }))
    .mutation(async ({ context, input, signal }) => {
      const connection = await context.db.query.federationConnections.findFirst({
        where: eq(federationConnections.id, input.connectionId),
      });
      if (!connection?.enabled) throw new ApiError({ code: "BAD_GATEWAY", message: "Source worker is disabled" });
      const catalog = catalogSchema.parse(
        await callFederatedProcedure(context, input.connectionId, ["integration", "all"], undefined, { signal }),
      );
      const requested = [...new Set(input.integrationIds)].map((id) => {
        const integration = catalog.find((entry) => entry.id === id && !entry.origin);
        if (!integration)
          throw new ApiError({
            code: "FORBIDDEN",
            message: "Source worker did not authorize the selected integration",
          });
        return integration;
      });
      const aliases = [];
      for (const source of requested) {
        const existing = await context.db.query.integrationOrigins.findFirst({
          where: and(
            eq(integrationOrigins.connectionId, input.connectionId),
            eq(integrationOrigins.remoteIntegrationId, source.id),
          ),
        });
        let integrationId = existing?.integrationId;
        if (!integrationId) {
          integrationId = createId();
          await context.db
            .insert(integrations)
            .values({ id: integrationId, name: source.name, kind: source.kind, url: "https://worker.invalid" });
          try {
            await context.db
              .insert(integrationOrigins)
              .values({ integrationId, connectionId: input.connectionId, remoteIntegrationId: source.id });
            await context.db
              .insert(integrationUserPermissions)
              .values({ integrationId, userId: context.session.user.id, permission: "full" })
              .onConflictDoNothing();
          } catch (error) {
            await context.db.delete(integrations).where(eq(integrations.id, integrationId));
            throw error;
          }
        } else {
          const alias = await context.db.query.integrations.findFirst({
            where: eq(integrations.id, integrationId),
            columns: { kind: true },
          });
          if (!alias || alias.kind !== source.kind)
            throw new ApiError({
              code: "CONFLICT",
              message: "The source integration type changed; remove its old alias before importing it again",
            });
          await context.db.update(integrations).set({ name: source.name }).where(eq(integrations.id, integrationId));
        }
        aliases.push({
          id: integrationId,
          name: source.name,
          kind: source.kind,
          origin: {
            connectionId: connection.id,
            workerId: connection.workerId,
            workerName: connection.name,
            integrationId: source.id,
          },
        });
      }
      return aliases;
    }),
  disable: manage.input(z.object({ connectionId: idSchema })).mutation(async ({ context, input }) => {
    await context.db
      .update(federationConnections)
      .set({ enabled: false })
      .where(eq(federationConnections.id, input.connectionId));
    closeFederationConnection(input.connectionId);
    return { enabled: false };
  }),
});
