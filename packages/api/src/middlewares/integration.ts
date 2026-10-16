import { ApiError } from "../procedure";
import { z } from "zod/v4";

import type { Session } from "@homarr/auth";
import { hasQueryAccessToIntegrationsAsync, intersectFederationPermissions } from "@homarr/auth/server";
import { constructIntegrationPermissions } from "@homarr/auth/shared";
import { decryptSecret } from "@homarr/common/server";
import type { AtLeastOneOf } from "@homarr/common/types";
import type { Database } from "@homarr/db";
import { and, eq, inArray } from "@homarr/db";
import { groupMembers, integrationGroupPermissions, integrationUserPermissions, integrations } from "@homarr/db/schema";
import type { IntegrationKind, WidgetIntegrationKind, WidgetKindWithIntegration } from "@homarr/definitions";
import { getWidgetIntegrationConfig } from "@homarr/definitions";
import { createLogger } from "@homarr/core/infrastructure/logs";

import { publicProcedure } from "../procedure";

export type IntegrationAction = "query" | "interact";

const logger = createLogger({ module: "integrationMiddleware" });

const getIntegrationKindForLog = (integration: object) => {
  if ("kind" in integration && typeof integration.kind === "string") return integration.kind;
  return "unknown";
};

interface IntegrationAccessMetadata {
  action: IntegrationAction;
  cardinality: "one" | "many";
  userId: string | undefined;
  requestedIntegrationIds: readonly string[];
  allowedIntegrationKinds: readonly IntegrationKind[];
}

const throwUnexpectedIntegrationKind = (kind: IntegrationKind, allowedKinds: readonly IntegrationKind[]): never => {
  logger.error("Database returned an integration outside the requested kinds", {
    integrationKind: kind,
    allowedIntegrationKinds: allowedKinds,
  });
  throw new ApiError({ code: "INTERNAL_SERVER_ERROR", message: "Integration kind validation failed" });
};

const createOneIntegrationMiddlewareForKinds = <TKind extends IntegrationKind>(
  action: IntegrationAction,
  kinds: readonly TKind[],
) => {
  return publicProcedure
    .meta({ integration: { action, cardinality: "one" } })
    .input(z.object({ integrationId: z.string() }))
    .use(async ({ context, next }, input) => {
      const userId = context.session?.user.id ?? "";
      const groups = await context.db.query.groupMembers.findMany({
        where: eq(groupMembers.userId, userId),
        columns: { groupId: true },
      });
      const accessMetadata: IntegrationAccessMetadata = {
        action,
        cardinality: "one",
        userId: context.session?.user.id,
        requestedIntegrationIds: [input.integrationId],
        allowedIntegrationKinds: kinds,
      };
      logger.debug("Resolving integration access", accessMetadata);

      const integration = await context.db.query.integrations.findFirst({
        where: and(eq(integrations.id, input.integrationId), inArray(integrations.kind, kinds)),
        with: {
          app: true,
          secrets: true,
          origin: { with: { connection: true } },
          groupPermissions: {
            where: inArray(
              integrationGroupPermissions.groupId,
              groups.map(({ groupId }) => groupId),
            ),
          },
          userPermissions: { where: eq(integrationUserPermissions.userId, userId) },
          items: {
            with: {
              item: true,
            },
          },
        },
      });

      if (!integration) {
        logger.warn("Integration access target was not found", accessMetadata);
        throw new ApiError({
          code: "NOT_FOUND",
          message: `Integration with id ${input.integrationId} not found or not of kinds ${kinds.join(",")}`,
        });
      }

      await throwIfActionIsNotAllowedAsync(action, context.db, [integration], context.session);
      assertFederationCeiling(action, integration.origin);
      logger.debug("Integration access granted", {
        ...accessMetadata,
        resolvedIntegrationKinds: [integration.kind],
      });

      const narrowedKind = kinds.find((kind) => kind === integration.kind);
      if (!narrowedKind) {
        return throwUnexpectedIntegrationKind(integration.kind, kinds);
      }

      const {
        secrets,
        origin,
        items: _ignore1,
        groupPermissions: _ignore2,
        userPermissions: _ignore3,
        ...rest
      } = integration;

      return next({
        context: {
          federationTargets: [{ id: integration.id, name: integration.name, kind: integration.kind, origin }],
          integration: {
            ...rest,
            externalUrl: rest.app?.href ?? null,
            kind: narrowedKind,
            decryptedSecrets: secrets.map((secret) => ({
              ...secret,
              value: decryptSecret(secret.value),
            })),
          },
        },
      });
    });
};

/**
 * Creates a middleware that provides the integration in the context that is of the specified kinds
 * @param action query for showing data or interact for mutating data
 * @param kinds kinds of integrations that are supported
 * @returns middleware that can be used with native oRPC
 * @example publicProcedure.concat(createOneIntegrationMiddleware("query", "piHole", "homeAssistant")).query(...)
 * @throws TRPCError NOT_FOUND if the integration was not found
 * @throws TRPCError FORBIDDEN if the user does not have permission to perform the specified action on the specified integration
 */
export const createOneIntegrationMiddleware = <TKind extends IntegrationKind>(
  action: IntegrationAction,
  ...kinds: AtLeastOneOf<TKind> // Ensure at least one kind is provided
) => {
  return createOneIntegrationMiddlewareForKinds(action, kinds);
};

const createManyIntegrationMiddlewareForKinds = <TKind extends IntegrationKind>(
  action: IntegrationAction,
  kinds: readonly TKind[],
) => {
  return publicProcedure
    .meta({ integration: { action, cardinality: "many" } })
    .input(z.object({ integrationIds: z.array(z.string()) }))
    .use(async ({ context, next }, input) => {
      const userId = context.session?.user.id ?? "";
      const groups = await context.db.query.groupMembers.findMany({
        where: eq(groupMembers.userId, userId),
        columns: { groupId: true },
      });
      const accessMetadata: IntegrationAccessMetadata = {
        action,
        cardinality: "many",
        userId: context.session?.user.id,
        requestedIntegrationIds: input.integrationIds,
        allowedIntegrationKinds: kinds,
      };
      logger.debug("Resolving integration access", accessMetadata);

      const findIntegrations = async () => {
        if (input.integrationIds.length === 0) return [];

        return await context.db.query.integrations.findMany({
          where: and(inArray(integrations.id, input.integrationIds), inArray(integrations.kind, kinds)),
          with: {
            app: true,
            secrets: true,
            items: {
              with: {
                item: true,
              },
            },
            origin: { with: { connection: true } },
            userPermissions: { where: eq(integrationUserPermissions.userId, userId) },
            groupPermissions: {
              where: inArray(
                integrationGroupPermissions.groupId,
                groups.map(({ groupId }) => groupId),
              ),
            },
          },
        });
      };
      const dbIntegrations = await findIntegrations();

      const offset = input.integrationIds.length - dbIntegrations.length;
      if (offset !== 0) {
        logger.warn("Integration access targets were not found", {
          ...accessMetadata,
          missingIntegrationCount: offset,
          resolvedIntegrationIds: dbIntegrations.map(({ id }) => id),
          resolvedIntegrationKinds: dbIntegrations.map(({ kind }) => kind),
        });
        throw new ApiError({
          code: "NOT_FOUND",
          message: `${offset} of the specified integrations not found or not of kinds ${kinds.join(",")}: ([${input.integrationIds.join(",")}] compared to [${dbIntegrations.map(({ id, kind }) => `${kind}:${id}`).join(",")}])`,
        });
      }

      if (dbIntegrations.length >= 1) {
        await throwIfActionIsNotAllowedAsync(action, context.db, dbIntegrations, context.session);
        for (const integration of dbIntegrations) assertFederationCeiling(action, integration.origin);
      }

      logger.debug("Integration access granted", {
        ...accessMetadata,
        resolvedIntegrationKinds: dbIntegrations.map(({ kind }) => kind),
      });

      return next({
        context: {
          federationTargets: dbIntegrations.map(({ id, name, kind, origin }) => ({ id, name, kind, origin })),
          integrations: dbIntegrations.map(
            ({
              secrets,
              kind,
              origin: _origin,
              items: _ignore1,
              groupPermissions: _ignore2,
              userPermissions: _ignore3,
              ...rest
            }) => {
              const narrowedKind = kinds.find((allowedKind) => allowedKind === kind);
              if (!narrowedKind) return throwUnexpectedIntegrationKind(kind, kinds);
              return {
                ...rest,
                externalUrl: rest.app?.href ?? null,
                kind: narrowedKind,
                decryptedSecrets: secrets.map((secret) => ({
                  ...secret,
                  value: decryptSecret(secret.value),
                })),
              };
            },
          ),
        },
      });
    });
};

/**
 * Creates a middleware that provides the integrations in the context that are of the specified kinds and have the specified item
 * It also ensures that the user has permission to perform the specified action on the integrations
 * @param action query for showing data or interact for mutating data
 * @param kinds kinds of integrations that are supported
 * @returns middleware that can be used with native oRPC
 * @example publicProcedure.concat(createManyIntegrationMiddleware("query", "piHole", "homeAssistant")).query(...)
 * @throws TRPCError NOT_FOUND if the integration was not found
 * @throws TRPCError FORBIDDEN if the user does not have permission to perform the specified action on at least one of the specified integrations
 */
export const createManyIntegrationMiddleware = <TKind extends IntegrationKind>(
  action: IntegrationAction,
  ...kinds: AtLeastOneOf<TKind> // Ensure at least one kind is provided
) => {
  return createManyIntegrationMiddlewareForKinds(action, kinds);
};

export const createOneWidgetIntegrationMiddleware = <TWidgetKind extends WidgetKindWithIntegration>(
  action: IntegrationAction,
  widgetKind: TWidgetKind,
): ReturnType<typeof createOneIntegrationMiddlewareForKinds<WidgetIntegrationKind<TWidgetKind>>> =>
  createOneIntegrationMiddlewareForKinds<WidgetIntegrationKind<TWidgetKind>>(
    action,
    getWidgetIntegrationConfig(widgetKind).supportedIntegrations,
  );

export const createManyWidgetIntegrationMiddleware = <TWidgetKind extends WidgetKindWithIntegration>(
  action: IntegrationAction,
  widgetKind: TWidgetKind,
): ReturnType<typeof createManyIntegrationMiddlewareForKinds<WidgetIntegrationKind<TWidgetKind>>> =>
  createManyIntegrationMiddlewareForKinds<WidgetIntegrationKind<TWidgetKind>>(
    action,
    getWidgetIntegrationConfig(widgetKind).supportedIntegrations,
  );

/**
 * Throws a TRPCError FORBIDDEN if the user does not have permission to perform the specified action on at least one of the specified integrations
 * @param action action to perform
 * @param db db instance
 * @param integrations integrations to check permissions for
 * @param session session of the user
 * @throws TRPCError FORBIDDEN if the user does not have permission to perform the specified action on at least one of the specified integrations
 */
const throwIfActionIsNotAllowedAsync = async (
  action: IntegrationAction,
  db: Database,
  integrationRecords: Parameters<typeof hasQueryAccessToIntegrationsAsync>[1],
  session: Session | null,
) => {
  if (action === "interact") {
    const haveAllInteractAccess = integrationRecords
      .map((integration) => constructIntegrationPermissions(integration, session))
      .every(({ hasInteractAccess }) => hasInteractAccess);
    if (haveAllInteractAccess) return;

    logger.warn("Integration access denied", {
      action,
      userId: session?.user.id,
      integrationIds: integrationRecords.map(({ id }) => id),
      integrationKinds: integrationRecords.map(getIntegrationKindForLog),
    });

    throw new ApiError({
      code: "FORBIDDEN",
      message: "User does not have permission to interact with at least one of the specified integrations",
    });
  }

  const hasQueryAccess = await hasQueryAccessToIntegrationsAsync(db, integrationRecords, session);

  if (hasQueryAccess) return;

  logger.warn("Integration access denied", {
    action,
    userId: session?.user.id,
    integrationIds: integrationRecords.map(({ id }) => id),
    integrationKinds: integrationRecords.map(getIntegrationKindForLog),
  });

  throw new ApiError({
    code: "FORBIDDEN",
    message: "User does not have permission to query at least one of the specified integration",
  });
};

function assertFederationCeiling(
  action: IntegrationAction,
  origin: Parameters<typeof intersectFederationPermissions>[1],
) {
  const ceiling = intersectFederationPermissions(
    { hasUseAccess: true, hasInteractAccess: true, hasFullAccess: true },
    origin,
    action === "query",
  );
  if ((action === "query" && !ceiling.hasUseAccess) || (action === "interact" && !ceiling.hasInteractAccess))
    throw new ApiError({
      code: "FORBIDDEN",
      message: "The source worker has not approved this operation or its access has expired",
    });
}
