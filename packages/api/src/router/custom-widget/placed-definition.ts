import { TRPCError } from "@trpc/server";
import { parse as parseSuperJson } from "superjson";
import { isRecord } from "@homarr/common";
import { eq } from "@homarr/db";
import { boards, customWidgetDefinitions, items, legacyCustomWidgetDefinitions } from "@homarr/db/schema";
import {
  getCustomWidgetDefaultOptions,
  normalizeCustomWidgetOptions,
  validateCustomWidgetOptions,
} from "@homarr/custom-widgets/core";
import { throwIfActionForbiddenAsync } from "../board/board-access";
import { parseStoredCustomWidgetDefinition } from "./stored-definition";

interface CustomWidgetItemOptions {
  definitionId: string;
  configuration: Record<string, unknown>;
  configurationVersion: number;
  refreshInterval?: number;
}

type RouterContext = Parameters<typeof throwIfActionForbiddenAsync>[0];

const parseItemOptions = (raw: string): CustomWidgetItemOptions => {
  try {
    const options = parseSuperJson(raw) as Record<string, unknown>;
    if (typeof options.definitionId !== "string" || options.definitionId.length === 0) throw new Error();
    return {
      definitionId: options.definitionId,
      configuration: isRecord(options.configuration) ? options.configuration : {},
      configurationVersion:
        typeof options.configurationVersion === "number" && Number.isInteger(options.configurationVersion)
          ? options.configurationVersion
          : 1,
      refreshInterval: typeof options.refreshInterval === "number" ? options.refreshInterval : undefined,
    };
  } catch {
    throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget item not found" });
  }
};

export async function resolvePlacedDefinitionAsync(ctx: RouterContext, itemId: string) {
  const item = await ctx.db.query.items.findFirst({
    where: eq(items.id, itemId),
    columns: { id: true, boardId: true, kind: true, options: true },
  });
  if (!item || item.kind !== "customApi") {
    throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget item not found" });
  }

  await throwIfActionForbiddenAsync(ctx, eq(boards.id, item.boardId), "view");
  const itemOptions = parseItemOptions(item.options);
  const stored = await ctx.db.query.customWidgetDefinitions.findFirst({
    where: eq(customWidgetDefinitions.id, itemOptions.definitionId),
    with: { secrets: true },
  });
  if (!stored) {
    const legacy = await ctx.db.query.legacyCustomWidgetDefinitions.findFirst({
      where: eq(legacyCustomWidgetDefinitions.id, itemOptions.definitionId),
      columns: { id: true },
    });
    if (legacy) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "LEGACY_CUSTOM_WIDGET_MIGRATION_REQUIRED",
      });
    }
    throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget unavailable" });
  }
  if (!stored.enabled) throw new TRPCError({ code: "FORBIDDEN", message: "Widget is disabled" });

  const definition = parseStoredCustomWidgetDefinition(stored);
  const configuration =
    itemOptions.configurationVersion === stored.updatedAt.getTime()
      ? { ...getCustomWidgetDefaultOptions(definition.options), ...itemOptions.configuration }
      : normalizeCustomWidgetOptions(definition.options, itemOptions.configuration);
  const issues = validateCustomWidgetOptions(definition.options, configuration);
  if (issues.length > 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Custom widget configuration needs repair: ${issues[0]?.path} ${issues[0]?.message}`,
    });
  }
  return { item, stored, definition, itemOptions, configuration };
}
