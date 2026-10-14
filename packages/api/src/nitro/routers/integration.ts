import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { objectEntries } from "@homarr/common/object";
import {
  getIntegrationKindsByCategory,
  getPermissionsWithParents,
  integrationCategories,
  integrationDefs,
  integrationSecretKindObject,
} from "@homarr/definitions";
import { byIdSchema } from "@homarr/validation/common";
import {
  integrationCreateSchema,
  integrationSavePermissionsSchema,
  integrationUpdateSchema,
} from "@homarr/validation/integration";

import type { SourceLeafPath } from "../port-map";
import { createIntegrationAccessHelpers, withManagementSnapshot } from "./-integration-management/access";
import { MissingIntegrationSecretError, testManagementConnectionAsync } from "./-integration-management/connection";
import {
  integrationManagementProcedure,
  integrationManagementPublicProcedure,
} from "./-integration-management/projection";
import type { IntegrationManagementResources } from "./-integration-management/resources";

export type {
  IntegrationManagementResources,
  IntegrationManagementSnapshot,
  NativeConnectionInput,
  NativeConnectionLease,
} from "./-integration-management/resources";

export const portedIntegrationManagementPaths = [
  "integration.testConnection",
  "integration.getKinds",
  "integration.all",
  "integration.allThatSupportSearch",
  "integration.allOfGivenCategory",
  "integration.search",
  "integration.byIds",
  "integration.byId",
  "integration.delete",
  "integration.getIntegrationPermissions",
] as const satisfies readonly SourceLeafPath[];

export const pendingIntegrationManagementPaths = [
  "integration.create",
  "integration.update",
  "integration.saveUserIntegrationPermissions",
  "integration.saveGroupIntegrationPermissions",
] as const satisfies readonly SourceLeafPath[];

export const pendingIntegrationManagementSchemas = {
  create: integrationCreateSchema,
  update: integrationUpdateSchema,
  saveUserIntegrationPermissions: integrationSavePermissionsSchema,
  saveGroupIntegrationPermissions: integrationSavePermissionsSchema,
};

export const storedIntegrationTestResultSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true) }),
  z.object({
    success: z.literal(false),
    error: z.enum(["missingSecret", "authorization", "certificate", "request", "statusCode", "parse", "unknown"]),
  }),
]);

export function createIntegrationManagementProcedures(resources: IntegrationManagementResources) {
  const { eq, inArray, asc, like } = resources.operators;
  const { integrations, groupPermissions, integrationUserPermissions, integrationGroupPermissions } = resources.tables;
  const access = createIntegrationAccessHelpers(resources);
  return {
    getKinds: integrationManagementPublicProcedure({
      path: "integration.getKinds",
      kind: "query",
      access: { kind: "public" },
      demo: "guarded",
    }).handler(() =>
      objectEntries(integrationDefs).map(([kind, definition]) => ({
        kind,
        name: definition.name,
        category: definition.category,
        requiredSecrets: definition.secretKinds,
      })),
    ),
    byIds: integrationManagementPublicProcedure({
      path: "integration.byIds",
      kind: "query",
      access: { kind: "public" },
      demo: "guarded",
    })
      .input(z.array(z.string()))
      .handler(({ context, input }) =>
        context.db.query.integrations.findMany({
          where: inArray(integrations.id, input),
          columns: { id: true, kind: true },
        }),
      ),
    all: integrationManagementProcedure({
      path: "integration.all",
      kind: "query",
      access: { kind: "protected" },
      demo: "guarded",
    }).handler(({ context }) =>
      withManagementSnapshot(resources, context, (snapshot) => access.getAccessibleIntegrationsAsync(snapshot)),
    ),
    allThatSupportSearch: integrationManagementProcedure({
      path: "integration.allThatSupportSearch",
      kind: "query",
      access: { kind: "protected" },
      demo: "guarded",
    }).handler(({ context }) =>
      withManagementSnapshot(resources, context, (snapshot) =>
        access.getAccessibleIntegrationsAsync(
          snapshot,
          inArray(
            integrations.kind,
            objectEntries(integrationDefs)
              .filter(([, definition]) => [...definition.category].includes("search"))
              .map(([kind]) => kind),
          ),
        ),
      ),
    ),
    allOfGivenCategory: integrationManagementProcedure({
      path: "integration.allOfGivenCategory",
      kind: "query",
      access: { kind: "protected" },
      demo: "guarded",
    })
      .input(z.object({ category: z.enum(integrationCategories) }))
      .handler(({ context, input }) =>
        withManagementSnapshot(resources, context, (snapshot) =>
          access.getAccessibleIntegrationsAsync(
            snapshot,
            inArray(integrations.kind, getIntegrationKindsByCategory(input.category)),
          ),
        ),
      ),
    search: integrationManagementProcedure({
      path: "integration.search",
      kind: "query",
      access: { kind: "protected" },
      demo: "guarded",
    })
      .input(z.object({ query: z.string(), limit: z.number().min(1).max(100).default(10) }))
      .handler(({ context, input }) =>
        withManagementSnapshot(resources, context, async (snapshot) => {
          const identity = await access.getIdentityAsync(snapshot);
          const rows = await snapshot.db.query.integrations.findMany({
            where: like(integrations.name, `%${input.query}%`),
            orderBy: asc(integrations.name),
            with: access.getIntegrationAccessRelations(identity),
          });
          await snapshot.assertCurrentAsync();
          return rows
            .filter((integration) => access.hasIntegrationQueryAccess(identity, integration))
            .toSorted((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
            .slice(0, input.limit)
            .map(
              ({ userPermissions: _userPermissions, groupPermissions: _groupPermissions, ...integration }) =>
                integration,
            );
        }),
      ),
    byId: integrationManagementProcedure({
      path: "integration.byId",
      kind: "query",
      access: { kind: "protected" },
      demo: "guarded",
    })
      .input(byIdSchema)
      .handler(({ context, input }) =>
        withManagementSnapshot(resources, context, async (snapshot) => {
          const where = eq(integrations.id, input.id);
          await access.throwIfActionForbiddenAsync(snapshot, where, "full").catch((error: unknown) => {
            if (error instanceof ORPCError && error.code === "NOT_FOUND")
              resources.logger.warn("Integration lookup refused", {
                integrationId: input.id,
                errorCode: error.code,
                reason: "integration-not-found-or-forbidden",
              });
            throw error;
          });
          const integration = await snapshot.db.query.integrations.findFirst({
            where,
            with: {
              secrets: { columns: { kind: true, value: true, updatedAt: true } },
              app: { columns: { id: true, name: true, iconUrl: true, href: true } },
            },
          });
          if (!integration) {
            resources.logger.warn("Integration lookup refused", {
              integrationId: input.id,
              errorCode: "NOT_FOUND",
              reason: "integration-not-found",
            });
            throw new ORPCError("NOT_FOUND", { message: "Integration not found" });
          }
          await snapshot.assertCurrentAsync();
          context.signal.throwIfAborted();
          return {
            id: integration.id,
            name: integration.name,
            kind: integration.kind,
            url: integration.url,
            secrets: integration.secrets.map((secret) => ({
              kind: secret.kind,
              value: integrationSecretKindObject[secret.kind].isPublic
                ? resources.codec.decryptSecret(secret.value)
                : null,
              updatedAt: secret.updatedAt,
            })),
            app: integration.app,
          };
        }),
      ),
    testConnection: integrationManagementProcedure({
      path: "integration.testConnection",
      kind: "query",
      access: { kind: "protected" },
      demo: "guarded",
    })
      .input(byIdSchema)
      .output(storedIntegrationTestResultSchema)
      .handler(({ context, input }) =>
        withManagementSnapshot(resources, context, async (snapshot) => {
          const where = eq(integrations.id, input.id);
          await access.throwIfActionForbiddenAsync(snapshot, where, "full");
          const integration = await snapshot.db.query.integrations.findFirst({ where, with: { secrets: true } });
          if (!integration) throw new ORPCError("NOT_FOUND", { message: "Integration not found" });
          await snapshot.assertCurrentAsync();
          try {
            const result = await testManagementConnectionAsync(
              resources,
              snapshot,
              context.signal,
              { ...integration, secrets: integration.secrets.map(({ kind }) => ({ kind, value: null })) },
              integration.secrets,
            );
            if (result.success) return { success: true as const };
            return { success: false as const, error: result.error.type };
          } catch (error) {
            if (error instanceof MissingIntegrationSecretError)
              return { success: false as const, error: "missingSecret" as const };
            return { success: false as const, error: "unknown" as const };
          }
        }),
      ),
    delete: integrationManagementProcedure({
      path: "integration.delete",
      kind: "mutation",
      access: { kind: "protected" },
      demo: "guarded",
    })
      .input(byIdSchema)
      .handler(({ context, input }) =>
        withManagementSnapshot(
          resources,
          context,
          async (snapshot) => {
            const where = eq(integrations.id, input.id);
            await access.throwIfActionForbiddenAsync(snapshot, where, "full");
            const integration = await snapshot.db.query.integrations.findFirst({ where });
            if (!integration) throw new ORPCError("NOT_FOUND", { message: "Integration not found" });
            await snapshot.assertCurrentAsync();
            context.signal.throwIfAborted();
            await snapshot.db.delete(integrations).where(where);
            await resources.invalidateIntegrationCacheAsync(input.id);
          },
          "mutation",
        ),
      ),
    getIntegrationPermissions: integrationManagementProcedure({
      path: "integration.getIntegrationPermissions",
      kind: "query",
      access: { kind: "protected" },
      demo: "guarded",
    })
      .input(byIdSchema)
      .handler(({ context, input }) =>
        withManagementSnapshot(resources, context, async (snapshot) => {
          await access.throwIfActionForbiddenAsync(snapshot, eq(integrations.id, input.id), "full");
          const inherited = await snapshot.db.query.groupPermissions.findMany({
            where: inArray(
              groupPermissions.permission,
              getPermissionsWithParents(["integration-use-all", "integration-interact-all", "integration-full-all"]),
            ),
            columns: { groupId: false },
            with: { group: { columns: { id: true, name: true } } },
          });
          const users = await snapshot.db.query.integrationUserPermissions.findMany({
            where: eq(integrationUserPermissions.integrationId, input.id),
            with: { user: { columns: { id: true, name: true, image: true, email: true } } },
          });
          const groups = await snapshot.db.query.integrationGroupPermissions.findMany({
            where: eq(integrationGroupPermissions.integrationId, input.id),
            with: { group: { columns: { id: true, name: true } } },
          });
          return {
            inherited: inherited.toSorted((left, right) => left.group.name.localeCompare(right.group.name)),
            users: users
              .map(({ user, permission }) => ({ user, permission }))
              .toSorted((left, right) => (left.user.name ?? "").localeCompare(right.user.name ?? "")),
            groups: groups
              .map(({ group, permission }) => ({ group: { id: group.id, name: group.name }, permission }))
              .toSorted((left, right) => left.group.name.localeCompare(right.group.name)),
          };
        }),
      ),
  };
}
