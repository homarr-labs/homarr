import superjson from "superjson";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { encryptSecret } from "@homarr/common/server";
import type { Database } from "@homarr/db";
import { eq } from "@homarr/db";
import {
  groups,
  integrationItems,
  integrations,
  integrationSecrets,
  itemLayouts,
  items,
  onboarding,
} from "@homarr/db/schema";
import {
  defaultBookmarkApps,
  defaultWidgetConfigs,
  emptySuperJSON,
  everyoneGroup,
  getWidgetKindsForIntegration,
  integrationKinds,
  integrationSecretKinds,
  onboardingSteps,
} from "@homarr/definitions";
import type { WidgetKind } from "@homarr/definitions";
import { zodEnumFromArray } from "@homarr/validation/enums";

import { createTRPCRouter, onboardingProcedure, publicProcedure } from "../../trpc";
import { MissingSecretError, testConnectionAsync } from "../integration/integration-test-connection";
import { mapTestConnectionError } from "../integration/map-test-connection-error";
import { getOnboardingOrFallbackAsync, nextOnboardingStepAsync } from "./onboard-queries";

const widgetConfigMap = new Map(defaultWidgetConfigs.map((config) => [config.kind, config]));

const getWidgetConfig = (kind: WidgetKind) => widgetConfigMap.get(kind);

interface PlaceWidgetContext {
  db: Database;
  boardId: string;
  sectionId: string;
  layoutId: string;
  columnCount: number;
  xOffset: number;
  yOffset: number;
  rowMaxHeight: number;
}

const placeWidgetAsync = async (
  ctx: PlaceWidgetContext,
  kind: WidgetKind,
  linkedIntegrationIds: string[],
  options?: string,
  size?: { width: number; height: number },
) => {
  const itemWidth = size?.width ?? 2;
  const itemHeight = size?.height ?? 2;

  if (ctx.xOffset + itemWidth > ctx.columnCount) {
    ctx.xOffset = 0;
    ctx.yOffset += ctx.rowMaxHeight;
    ctx.rowMaxHeight = 0;
  }

  const itemId = createId();
  await ctx.db.insert(items).values({
    id: itemId,
    boardId: ctx.boardId,
    kind,
    options: options ?? emptySuperJSON,
    advancedOptions: emptySuperJSON,
  });

  await ctx.db.insert(itemLayouts).values({
    itemId,
    sectionId: ctx.sectionId,
    layoutId: ctx.layoutId,
    xOffset: ctx.xOffset,
    yOffset: ctx.yOffset,
    width: itemWidth,
    height: itemHeight,
  });

  for (const integrationId of linkedIntegrationIds) {
    await ctx.db.insert(integrationItems).values({
      itemId,
      integrationId,
    });
  }

  ctx.rowMaxHeight = Math.max(ctx.rowMaxHeight, itemHeight);
  ctx.xOffset += itemWidth;
};

export const onboardRouter = createTRPCRouter({
  currentStep: publicProcedure.query(async ({ ctx }) => {
    return await getOnboardingOrFallbackAsync(ctx.db);
  }),
  nextStep: publicProcedure
    .input(
      z.object({
        // Preferred step is only needed for 'preferred' conditions
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
  createIntegration: onboardingProcedure
    .requiresStep("integrations")
    .input(
      z.object({
        name: z.string().nonempty().max(127),
        url: z
          .string()
          .url()
          .regex(/^https?:\/\//),
        kind: zodEnumFromArray(integrationKinds),
        secrets: z.array(
          z.object({
            kind: zodEnumFromArray(integrationSecretKinds),
            value: z.string().nonempty(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await testConnectionAsync({
        id: "new",
        name: input.name,
        url: input.url,
        kind: input.kind,
        secrets: input.secrets,
      }).catch((error) => {
        if (error instanceof MissingSecretError) {
          return { success: false as const, error };
        }
        throw error;
      });

      if (!result.success) {
        return { error: mapTestConnectionError(result.error) };
      }

      const integrationId = createId();
      await ctx.db.insert(integrations).values({
        id: integrationId,
        name: input.name,
        url: input.url,
        kind: input.kind,
        appId: null,
      });

      if (input.secrets.length >= 1) {
        await ctx.db.insert(integrationSecrets).values(
          input.secrets.map((secret) => ({
            kind: secret.kind,
            value: encryptSecret(secret.value),
            integrationId,
          })),
        );
      }
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

    if (!board) {
      await nextOnboardingStepAsync(db, undefined);
      return;
    }

    const everyoneGroupRow = await db.query.groups.findFirst({
      where: eq(groups.name, everyoneGroup),
    });
    if (everyoneGroupRow && !everyoneGroupRow.homeBoardId) {
      await db.update(groups).set({ homeBoardId: board.id }).where(eq(groups.id, everyoneGroupRow.id));
    }

    const section = board.sections.find((boardSection) => boardSection.kind === "empty");
    const layout = board.layouts[0];

    if (section && layout) {
      const widgetCtx: PlaceWidgetContext = {
        db,
        boardId: board.id,
        sectionId: section.id,
        layoutId: layout.id,
        columnCount: layout.columnCount,
        xOffset: 0,
        yOffset: 0,
        rowMaxHeight: 0,
      };

      const placedWidgets = new Set<WidgetKind>();

      for (const integration of allIntegrations) {
        for (const widgetKind of getWidgetKindsForIntegration(integration.kind)) {
          if (placedWidgets.has(widgetKind)) continue;
          const config = getWidgetConfig(widgetKind);
          if (config?.skip) continue;
          placedWidgets.add(widgetKind);

          const matchingIds = allIntegrations
            .filter((row) => getWidgetKindsForIntegration(row.kind).includes(widgetKind))
            .map((row) => row.id);

          const options = config?.options ? superjson.stringify(config.options) : undefined;
          await placeWidgetAsync(
            widgetCtx,
            widgetKind,
            matchingIds,
            options,
            config && {
              width: config.width,
              height: config.height,
            },
          );
        }
      }

      for (const app of allApps) {
        const appOptions = superjson.stringify({ appId: app.id, openInNewTab: true, showTitle: true });
        await placeWidgetAsync(widgetCtx, "app", [], appOptions, { width: 1, height: 1 });
      }

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

        await placeWidgetAsync(widgetCtx, config.kind, [], options ? superjson.stringify(options) : undefined, {
          width: config.width,
          height: config.height,
        });
      }
    }

    await nextOnboardingStepAsync(db, undefined);
  }),
});
