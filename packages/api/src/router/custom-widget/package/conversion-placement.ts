import { TRPCError } from "@trpc/server";
import { parse, stringify } from "superjson";
import { z } from "zod/v4";

import { isRecord } from "@homarr/common";
import { and, eq } from "@homarr/db";
import { boards, customWidgetDefinitions, items } from "@homarr/db/schema";
import { getCustomWidgetDefaultOptions, validateCustomWidgetOptions } from "@homarr/custom-widgets/core";

import { throwIfActionForbiddenAsync } from "../../board/board-access";
import { parseStoredCustomWidgetDefinition } from "../stored-definition";
import { withWidgetInstallationLock } from "./coordination";
import { getArtifact, getInstallation, getPackagePlacements } from "./records";
import { widgetPackageAdminProcedure } from "./procedure";
import { publishWidgetPackageChange } from "./events";

export const packageConversionPlacementProcedures = {
  legacyPlacements: widgetPackageAdminProcedure
    .input(z.object({ definitionId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const placements = await getPackagePlacements(ctx, input.definitionId);
      const boardRows = await ctx.db.query.boards.findMany();
      return placements.map(({ id, boardId }) => ({
        id,
        boardId,
        boardName: boardRows.find((board) => board.id === boardId)?.name ?? boardId,
      }));
    }),
  migrateV2Placement: widgetPackageAdminProcedure
    .input(z.object({ id: z.string().min(1), itemId: z.string().min(1), definitionId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      withWidgetInstallationLock(input.id, async (signal) => {
        const installation = await getInstallation(ctx, input.id);
        if (!installation.enabled || !installation.activeArtifactId)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Preview, trust and activate the converted package first",
          });
        const origin = z
          .object({ kind: z.literal("converted-v2"), definitionId: z.string() })
          .safeParse(JSON.parse(installation.origin ?? "null"));
        if (!origin.success || origin.data.definitionId !== input.definitionId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This package was not converted from the selected definition",
          });
        const item = await ctx.db.query.items.findFirst({ where: eq(items.id, input.itemId) });
        if (!item || item.kind !== "customApi") throw new TRPCError({ code: "NOT_FOUND" });
        await throwIfActionForbiddenAsync(ctx, eq(boards.id, item.boardId), "modify");
        const previous: unknown = parse(item.options);
        if (!isRecord(previous) || previous.definitionId !== input.definitionId)
          throw new TRPCError({
            code: "CONFLICT",
            message: "The selected placement no longer uses the original definition",
          });
        const original = await ctx.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.definitionId),
        });
        if (!original) throw new TRPCError({ code: "NOT_FOUND" });
        const legacy = parseStoredCustomWidgetDefinition(original);
        const { source } = await getArtifact(ctx, installation.activeArtifactId);
        const configuration = {
          ...getCustomWidgetDefaultOptions(source.options),
          ...getCustomWidgetDefaultOptions(legacy.options),
          ...(isRecord(previous.configuration) ? previous.configuration : {}),
        };
        if (validateCustomWidgetOptions(source.options, configuration).length > 0)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "The converted configuration needs repair before migration",
          });
        const options = stringify({
          ...previous,
          definitionId: input.id,
          configuration,
          configurationVersion: source.manifest.configurationVersion,
        });
        signal.throwIfAborted();
        const result: unknown = await ctx.db
          .update(items)
          .set({ options })
          .where(and(eq(items.id, item.id), eq(items.options, item.options)));
        const resultRow: unknown = Array.isArray(result) ? result[0] : result;
        if (
          isRecord(resultRow) &&
          (resultRow.changes === 0 || resultRow.affectedRows === 0 || resultRow.rowCount === 0)
        )
          throw new TRPCError({
            code: "CONFLICT",
            message: "The placement changed while migrating; reload and try again",
          });
        await publishWidgetPackageChange({ installationId: input.id, itemIds: [item.id], kind: "activation" });
        return { itemId: item.id, boardId: item.boardId };
      }),
    ),
};
