import { TRPCError } from "@trpc/server";

import { hasQueryAccessToIntegrationsAsync } from "@homarr/auth/server";
import { constructIntegrationPermissions } from "@homarr/auth/shared";
import { decryptSecret } from "@homarr/common";
import { and, eq, inArray } from "@homarr/db";
import { integrations } from "@homarr/db/schema/sqlite";
import type { IntegrationKind } from "@homarr/definitions";
import { z } from "@homarr/validation";

import { publicProcedure } from "../trpc";

type IntegrationAction = "query" | "interact";

export const createOneIntegrationMiddleware = <TKind extends IntegrationKind>(
  action: IntegrationAction,
  ...kinds: [TKind, ...TKind[]] // Ensure at least one kind is provided
) => {
  return publicProcedure.input(z.object({ integrationId: z.string() })).use(async ({ input, ctx, next }) => {
    const integration = await ctx.db.query.integrations.findFirst({
      where: and(eq(integrations.id, input.integrationId), inArray(integrations.kind, kinds)),
      with: {
        secrets: true,
        groupPermissions: true,
        userPermissions: true,
        items: {
          with: {
            item: {
              with: {
                section: {
                  columns: {
                    boardId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!integration) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Integration with id ${input.integrationId} not found or not of kinds ${kinds.join(",")}`,
      });
    }

    if (action === "interact") {
      const { hasInteractAccess } = constructIntegrationPermissions(integration, ctx.session);
      if (!hasInteractAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User does not have permission to interact with this integration",
        });
      }
    } else {
      const hasQueryAccess = await hasQueryAccessToIntegrationsAsync(ctx.db, [integration], ctx.session);
      if (!hasQueryAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User does not have permission to query this integration",
        });
      }
    }

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

export const createManyIntegrationMiddleware = <TKind extends IntegrationKind>(
  action: IntegrationAction,
  ...kinds: [TKind, ...TKind[]] // Ensure at least one kind is provided
) => {
  return publicProcedure
    .input(z.object({ integrationIds: z.array(z.string()).min(1) }))
    .use(async ({ ctx, input, next }) => {
      const dbIntegrations = await ctx.db.query.integrations.findMany({
        where: and(inArray(integrations.id, input.integrationIds), inArray(integrations.kind, kinds)),
        with: {
          secrets: true,
          items: {
            with: {
              item: {
                with: {
                  section: {
                    columns: {
                      boardId: true,
                    },
                  },
                },
              },
            },
          },
          userPermissions: true,
          groupPermissions: true,
        },
      });

      const offset = input.integrationIds.length - dbIntegrations.length;
      if (offset !== 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `${offset} of the specified integrations not found or not of kinds ${kinds.join(",")}`,
        });
      }

      if (action === "interact") {
        const haveAllInteractAccess = dbIntegrations
          .map((integration) => constructIntegrationPermissions(integration, ctx.session))
          .every(({ hasInteractAccess }) => hasInteractAccess);
        if (!haveAllInteractAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "User does not have permission to interact with at least one of the specified integrations",
          });
        }
      } else {
        const hasQueryAccess = await hasQueryAccessToIntegrationsAsync(ctx.db, dbIntegrations, ctx.session);
        if (!hasQueryAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "User does not have permission to query at least one of the specified integration",
          });
        }
      }

      return next({
        ctx: {
          integrations: dbIntegrations.map(
            ({ secrets, kind, items: _ignore1, groupPermissions: _ignore2, userPermissions: _ignore3, ...rest }) => ({
              ...rest,
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

export const createManyIntegrationOfOneItemMiddleware = <TKind extends IntegrationKind>(
  action: IntegrationAction,
  ...kinds: [TKind, ...TKind[]] // Ensure at least one kind is provided
) => {
  return publicProcedure
    .input(z.object({ integrationIds: z.array(z.string()).min(1), itemId: z.string() }))
    .use(async ({ ctx, input, next }) => {
      const dbIntegrations = await ctx.db.query.integrations.findMany({
        where: and(inArray(integrations.id, input.integrationIds), inArray(integrations.kind, kinds)),
        with: {
          secrets: true,
          items: {
            with: {
              item: {
                with: {
                  section: {
                    columns: {
                      boardId: true,
                    },
                  },
                },
              },
            },
          },
          userPermissions: true,
          groupPermissions: true,
        },
      });

      const offset = input.integrationIds.length - dbIntegrations.length;
      if (offset !== 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `${offset} of the specified integrations not found or not of kinds ${kinds.join(",")}`,
        });
      }

      if (action === "interact") {
        const haveAllInteractAccess = dbIntegrations
          .map((integration) => constructIntegrationPermissions(integration, ctx.session))
          .every(({ hasInteractAccess }) => hasInteractAccess);
        if (!haveAllInteractAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "User does not have permission to interact with at least one of the specified integrations",
          });
        }
      } else {
        const hasQueryAccess = await hasQueryAccessToIntegrationsAsync(ctx.db, dbIntegrations, ctx.session);
        if (!hasQueryAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "User does not have permission to query at least one of the specified integration",
          });
        }
      }

      const dbIntegrationWithItem = dbIntegrations.filter((integration) =>
        integration.items.some((item) => item.itemId === input.itemId),
      );

      if (dbIntegrationWithItem.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration for item was not found",
        });
      }

      return next({
        ctx: {
          integrations: dbIntegrationWithItem.map(
            ({ secrets, kind, groupPermissions: _ignore1, userPermissions: _ignore2, ...rest }) => ({
              ...rest,
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
