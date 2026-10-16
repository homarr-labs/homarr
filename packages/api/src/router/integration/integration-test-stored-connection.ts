import { ApiError } from "../../procedure";
import { z } from "zod/v4";

import { eq } from "@homarr/db";
import { integrations } from "@homarr/db/schema";
import { byIdSchema } from "@homarr/validation/common";

import { protectedProcedure } from "../../procedure";
import { callFederatedProcedure, getFederationOrigin } from "../../federation/client";
import { throwIfActionForbiddenAsync } from "./integration-access";
import { MissingSecretError, testConnectionAsync } from "./integration-test-connection";

export const integrationTestStoredConnectionProcedure = protectedProcedure
  .meta({
    integration: { action: "full", cardinality: "one" },
    openapi: {
      method: "GET",
      path: "/api/integrations/{id}/test-connection",
      tags: ["integrations"],
      protect: true,
      summary: "Test a saved integration using stored credentials",
      description:
        "Requires full integration access. Runs the native connection check without changing saved configuration. Upstream authentication may establish a session. Success is a connection check, not widget or service acceptance. Failures expose only a safe category, not upstream errors or credentials.",
    },
  })
  .input(byIdSchema)
  .output(
    z.discriminatedUnion("success", [
      z.object({ success: z.literal(true) }),
      z.object({
        success: z.literal(false),
        error: z.enum(["missingSecret", "authorization", "certificate", "request", "statusCode", "parse", "unknown"]),
      }),
    ]),
  )
  .query(async ({ context, input }) => {
    const where = eq(integrations.id, input.id);
    await throwIfActionForbiddenAsync(context, where, "full");
    const origin = await getFederationOrigin(context, input.id);
    if (origin) {
      if (context.workerAccess?.role === "service" && context.workerAccess.service?.purpose !== "mcp")
        throw new ApiError({
          code: "FORBIDDEN",
          message: "Integration service grants cannot delegate to another worker",
        });
      return (await callFederatedProcedure(context, origin.connectionId, ["integration", "testConnection"], {
        id: origin.remoteIntegrationId,
      })) as
        | { success: true }
        | {
            success: false;
            error: "missingSecret" | "authorization" | "certificate" | "request" | "statusCode" | "parse" | "unknown";
          };
    }

    const integration = await context.db.query.integrations.findFirst({ where, with: { secrets: true } });
    if (!integration) {
      throw new ApiError({ code: "NOT_FOUND", message: "Integration not found" });
    }

    try {
      const result = await testConnectionAsync(
        {
          ...integration,
          secrets: integration.secrets.map(({ kind }) => ({ kind, value: null })),
        },
        integration.secrets,
      );
      if (result.success) return { success: true as const };
      return { success: false as const, error: result.error.type };
    } catch (error) {
      if (error instanceof MissingSecretError) return { success: false as const, error: "missingSecret" as const };
      return { success: false as const, error: "unknown" as const };
    }
  });
