import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import type { Session } from "@homarr/auth";
import { hasQueryAccessToIntegrationsAsync } from "@homarr/auth/server";
import { constructIntegrationPermissions } from "@homarr/auth/shared";
import { decryptSecret } from "@homarr/common/server";
import type { AtLeastOneOf } from "@homarr/common/types";
import type { Database } from "@homarr/db";
import { and, eq, inArray } from "@homarr/db";
import { integrations } from "@homarr/db/schema";
import type { IntegrationKind, WidgetIntegrationKind, WidgetKindWithIntegration } from "@homarr/definitions";
import { getWidgetIntegrationConfig } from "@homarr/definitions";
import { createLogger } from "@homarr/core/infrastructure/logs";

import { publicProcedure } from "../trpc";

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

const createOneIntegrationMiddlewareForKinds = <TKind extends IntegrationKind>(
  action: IntegrationAction,
  kinds: readonly TKind[],
) => {
  return publicProcedure.input(z.object({ integrationId: z.string() })).use(async ({ input, ctx, next }) => {
    const accessMetadata: IntegrationAccessMetadata = {
      action,
      cardinality: "one",
      userId: ctx.session?.user.id,
      requestedIntegrationIds: [input.integrationId],
      allowedIntegrationKinds: kinds,
    };
    logger.debug("Resolving integration access", accessMetadata);

    const integration = await ctx.db.query.integrations.findFirst({
      where: and(eq(integrations.id, input.integrationId), inArray(integrations.kind, kinds)),
      with: {
        app: true,
        secrets: true,
        groupPermissions: true,
        userPermissions: true,
        items: {
          with: {
            item: true,
          },
        },
      },
    });

    if (!integration) {
      logger.warn("Integration access target was not found", accessMetadata);
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Integration with id ${input.integrationId} not found or not of kinds ${kinds.join(",")}`,
      });
    }

    await throwIfActionIsNotAllowedAsync(action, ctx.db, [integration], ctx.session);
    logger.debug("Integration access granted", {
      ...accessMetadata,
      resolvedIntegrationKinds: [integration.kind],
    });

    const {
      secrets,
      kind,
      items: _ignore1,
      groupPermissions: _ignore2,
      userPermissions: _ignore3,
      ...rest
    } = integration;

    return next({
      ctx: {
        integration: {
          ...rest,
          externalUrl: rest.app?.href ?? null,
          kind: kind as TKind,
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
 * @returns middleware that can be used with trpc
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
  return publicProcedure.input(z.object({ integrationIds: z.array(z.string()) })).use(async ({ ctx, input, next }) => {
    const accessMetadata: IntegrationAccessMetadata = {
      action,
      cardinality: "many",
      userId: ctx.session?.user.id,
      requestedIntegrationIds: input.integrationIds,
      allowedIntegrationKinds: kinds,
    };
    logger.debug("Resolving integration access", accessMetadata);

    const findIntegrations = async () => {
      if (input.integrationIds.length === 0) return [];

      return await ctx.db.query.integrations.findMany({
        where: and(inArray(integrations.id, input.integrationIds), inArray(integrations.kind, kinds)),
        with: {
          app: true,
          secrets: true,
          items: {
            with: {
              item: true,
            },
          },
          userPermissions: true,
          groupPermissions: true,
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
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `${offset} of the specified integrations not found or not of kinds ${kinds.join(",")}: ([${input.integrationIds.join(",")}] compared to [${dbIntegrations.map(({ id, kind }) => `${kind}:${id}`).join(",")}])`,
      });
    }

    if (dbIntegrations.length >= 1) {
      await throwIfActionIsNotAllowedAsync(action, ctx.db, dbIntegrations, ctx.session);
    }

    logger.debug("Integration access granted", {
      ...accessMetadata,
      resolvedIntegrationKinds: dbIntegrations.map(({ kind }) => kind),
    });

    return next({
      ctx: {
        integrations: dbIntegrations.map(
          ({ secrets, kind, items: _ignore1, groupPermissions: _ignore2, userPermissions: _ignore3, ...rest }) => ({
            ...rest,
            externalUrl: rest.app?.href ?? null,
            kind: kind as TKind,
            decryptedSecrets: secrets.map((secret) => ({
              ...secret,
              value: decryptSecret(secret.value),
            })),
          }),
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
 * @returns middleware that can be used with trpc
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
  createOneIntegrationMiddlewareForKinds(action, getWidgetIntegrationConfig(widgetKind).supportedIntegrations);

export const createManyWidgetIntegrationMiddleware = <TWidgetKind extends WidgetKindWithIntegration>(
  action: IntegrationAction,
  widgetKind: TWidgetKind,
): ReturnType<typeof createManyIntegrationMiddlewareForKinds<WidgetIntegrationKind<TWidgetKind>>> =>
  createManyIntegrationMiddlewareForKinds(action, getWidgetIntegrationConfig(widgetKind).supportedIntegrations);

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

    throw new TRPCError({
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

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "User does not have permission to query at least one of the specified integration",
  });
};
