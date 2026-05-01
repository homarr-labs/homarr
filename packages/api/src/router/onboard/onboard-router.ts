import superjson from "superjson";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { eq } from "@homarr/db";
import { groups, integrationItems, itemLayouts, items, onboarding } from "@homarr/db/schema";
import {
  defaultBookmarkApps,
  defaultWidgetConfigs,
  emptySuperJSON,
  everyoneGroup,
  getWidgetKindsForIntegration,
  onboardingSteps,
} from "@homarr/definitions";
import type { WidgetKind } from "@homarr/definitions";
import { zodEnumFromArray } from "@homarr/validation/enums";

import { createTRPCRouter, onboardingProcedure, publicProcedure } from "../../trpc";
import { getOnboardingOrFallbackAsync, nextOnboardingStepAsync } from "./onboard-queries";

const widgetConfigMap = new Map(defaultWidgetConfigs.map((config) => [config.kind, config]));

const getWidgetConfig = (kind: WidgetKind) => widgetConfigMap.get(kind);

export const onboardRouter = createTRPCRouter({
  currentStep: publicProcedure.query(async ({ ctx }) => {
    return await getOnboardingOrFallbackAsync(ctx.db);
  }),
  nextStep: publicProcedure
    .input(
      z.object({
        preferredStep: zodEnumFromArray(onboardingSteps).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await nextOnboardingStepAsync(ctx.db, input.preferredStep);
    }),
  previousStep: publicProcedure.mutation(async ({ ctx }) => {
    const { previous } = await getOnboardingOrFallbackAsync(ctx.db);

    if (previous !== "start") {
      return;
    }

    await ctx.db.update(onboarding).set({
      previousStep: null,
      step: "start",
    });
  }),
  setupIntegrations: onboardingProcedure.requiresStep("integrations").mutation(async ({ ctx }) => {
    const db = ctx.db;

    const allIntegrations = await db.query.integrations.findMany();
    const allApps = await db.query.apps.findMany();

    const board = await db.query.boards.findFirst({
      with: {
        sections: true,
        layouts: true,
      },
    });

    if (board) {
      const everyoneGroupRow = await db.query.groups.findFirst({
        where: eq(groups.name, everyoneGroup),
      });
      if (everyoneGroupRow && !everyoneGroupRow.homeBoardId) {
        await db.update(groups).set({ homeBoardId: board.id }).where(eq(groups.id, everyoneGroupRow.id));
      }

      const section = board.sections.find((boardSection) => boardSection.kind === "empty");
      const layout = board.layouts[0];

      if (section && layout) {
        const columnCount = layout.columnCount;
        let xOffset = 0;
        let yOffset = 0;
        let rowMaxHeight = 0;

        const placeWidgetAsync = async (
          kind: WidgetKind,
          linkedIntegrationIds: string[],
          options?: string,
          size?: { width: number; height: number },
        ) => {
          const itemWidth = size?.width ?? 2;
          const itemHeight = size?.height ?? 2;

          if (xOffset + itemWidth > columnCount) {
            xOffset = 0;
            yOffset += rowMaxHeight;
            rowMaxHeight = 0;
          }

          const itemId = createId();
          await db.insert(items).values({
            id: itemId,
            boardId: board.id,
            kind,
            options: options ?? emptySuperJSON,
            advancedOptions: emptySuperJSON,
          });

          await db.insert(itemLayouts).values({
            itemId,
            sectionId: section.id,
            layoutId: layout.id,
            xOffset,
            yOffset,
            width: itemWidth,
            height: itemHeight,
          });

          for (const integrationId of linkedIntegrationIds) {
            await db.insert(integrationItems).values({
              itemId,
              integrationId,
            });
          }

          rowMaxHeight = Math.max(rowMaxHeight, itemHeight);
          xOffset += itemWidth;
        };

        const placedWidgets = new Set<WidgetKind>();

        // Place integration-specific widgets
        for (const integration of allIntegrations) {
          const kind = integration.kind;

          for (const widgetKind of getWidgetKindsForIntegration(kind)) {
            if (placedWidgets.has(widgetKind)) continue;
            const config = getWidgetConfig(widgetKind);
            if (config?.skip) continue;
            placedWidgets.add(widgetKind);

            const matchingIds = allIntegrations
              .filter((row) => getWidgetKindsForIntegration(row.kind).includes(widgetKind))
              .map((row) => row.id);

            const options = config?.options ? superjson.stringify(config.options) : undefined;
            await placeWidgetAsync(
              widgetKind,
              matchingIds,
              options,
              config && { width: config.width, height: config.height },
            );
          }
        }

        // Place an app widget for each app in the DB
        for (const app of allApps) {
          const appOptions = superjson.stringify({ appId: app.id, openInNewTab: true, showTitle: true });
          await placeWidgetAsync("app", [], appOptions, { width: 1, height: 1 });
        }

        // Place general widgets from config
        const bookmarkAppNames = new Set(defaultBookmarkApps.map((bookmark) => bookmark.name));
        const bookmarkAppIds = allApps.filter((app) => bookmarkAppNames.has(app.name)).map((app) => app.id);

        for (const config of defaultWidgetConfigs) {
          if (config.skip) continue;
          if (placedWidgets.has(config.kind)) continue;
          placedWidgets.add(config.kind);

          let options = config.options ? { ...config.options } : undefined;

          if (config.kind === "bookmarks" && bookmarkAppIds.length > 0) {
            options = { ...options, items: bookmarkAppIds };
          }

          await placeWidgetAsync(config.kind, [], options ? superjson.stringify(options) : undefined, {
            width: config.width,
            height: config.height,
          });
        }
      }
    }

    await nextOnboardingStepAsync(db, undefined);
  }),
});
