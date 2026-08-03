import { TRPCError } from "@trpc/server";
import { parse } from "superjson";

import { createId } from "@homarr/common";
import { decryptSecret } from "@homarr/common/server";
import { customWidgetDefinitions } from "@homarr/db/schema";
import { eq } from "@homarr/db";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { applyAuth } from "../custom-widget/auth";
import { assertCustomApiItemBindingAsync, customApiItemInputSchema } from "../custom-widget/custom-widget-access";
import { extractActionButtonDisplay, extractDisplayDataWithFallback } from "../custom-widget/display-data";
import {
  consumeBoundedResponseAsync,
  readBoundedJsonResponseAsync,
  validateCustomApiUrl,
  withCustomApiResponseAsync,
} from "./custom-api-security";

const logger = createLogger({ module: "widget:customApi" });

export const customApiRouter = createTRPCRouter({
  getData: protectedProcedure.input(customApiItemInputSchema).query(async ({ ctx, input }) => {
    await assertCustomApiItemBindingAsync(ctx, input, "view");
    const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.definitionId),
      with: { secrets: true },
    });

    if (!definition) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });
    }

    if (!definition.enabled) {
      return { type: "disabled" };
    }

    let displayConfig: Record<string, unknown>;
    try {
      displayConfig = parse(definition.displayConfig) as Record<string, unknown>;
    } catch {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Widget has corrupt display configuration" });
    }

    if (definition.displayType === "actionButton") {
      const actionDisplay = extractActionButtonDisplay(displayConfig);
      return {
        ...actionDisplay,
        canExecute: ctx.session.user.permissions.includes("admin"),
      };
    }

    try {
      const decryptedSecrets = definition.secrets.map((s) => ({
        kind: s.kind,
        value: decryptSecret(s.value),
      }));
      const url = validateCustomApiUrl(definition.url);
      const headers = new Headers({ Accept: "application/json" });
      if (definition.method !== "GET" && definition.requestBody) headers.set("Content-Type", "application/json");
      applyAuth(headers, url, definition.authType, decryptedSecrets, definition.headerName);

      return await withCustomApiResponseAsync(
        url,
        {
          method: definition.method,
          headers,
          body: definition.method !== "GET" ? definition.requestBody : undefined,
        },
        async (response) => {
          if (!response.ok) {
            await consumeBoundedResponseAsync(response);
            throw new Error(`Custom API returned HTTP ${response.status}`);
          }
          const json = await readBoundedJsonResponseAsync(response);
          return extractDisplayDataWithFallback(json, definition.displayType, displayConfig);
        },
      );
    } catch (error) {
      const errorId = createId();
      logger.error("Failed to fetch custom API data", { errorId, definitionId: input.definitionId, error });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Custom API request failed",
      });
    }
  }),
});
