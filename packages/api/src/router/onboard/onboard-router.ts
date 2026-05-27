import { TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { encryptSecret } from "@homarr/common/server";
import type { Database } from "@homarr/db";
import { eq, like, or } from "@homarr/db";
import {
  apps,
  groups,
  icons,
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
  extractContainerImageName,
  getIconUrl,
  getWidgetKindsForIntegration,
  integrationKinds,
  integrationSecretKinds,
  matchIntegrationKindFromContainer,
  onboardingSteps,
} from "@homarr/definitions";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { zodEnumFromArray } from "@homarr/validation/enums";

import { createTRPCRouter, onboardingProcedure, publicProcedure } from "../../trpc";
import { MissingSecretError, testConnectionAsync } from "../integration/integration-test-connection";
import { mapTestConnectionError } from "../integration/map-test-connection-error";
import { getOnboardingOrFallbackAsync, nextOnboardingStepAsync } from "./onboard-queries";

interface PortInfo {
  IP?: string;
  PublicPort?: number;
}

interface SuggestedUrlResult {
  url: string;
  publishedPort: number | null;
}

const buildSuggestedUrl = (ports: PortInfo[] | undefined, host: string): SuggestedUrlResult => {
  const port = ports?.[0];
  if (port?.PublicPort) {
    const ip = port.IP && port.IP !== "0.0.0.0" && port.IP !== "::" ? port.IP : host;
    return { url: `http://${ip}:${port.PublicPort}`, publishedPort: port.PublicPort };
  }
  return { url: "", publishedPort: null };
};

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
        url: z.string().nonempty(),
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
        if (!(error instanceof MissingSecretError)) throw error;

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      });

      if (!result.success) {
        return { error: mapTestConnectionError(result.error) };
      }

      const integrationId = createId();
      const appId = createId();

      await ctx.db.insert(apps).values({
        id: appId,
        name: input.name,
        iconUrl: getIconUrl(input.kind),
        href: input.url,
        pingUrl: input.url,
        description: null,
      });

      await ctx.db.insert(integrations).values({
        id: integrationId,
        name: input.name,
        url: input.url,
        kind: input.kind,
        appId,
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
  discoverDockerServices: onboardingProcedure.requiresStep("integrations").query(async ({ ctx }) => {
    const emptyResult = {
      integrations: [] as { containerId: string; containerName: string; kind: IntegrationKind; suggestedUrl: string; publishedPort: number | null; iconUrl: string | null }[],
      apps: [] as { containerId: string; containerName: string; suggestedUrl: string; iconUrl: string | null }[],
    };

    try {
      const { DockerSingleton, dockerLabels } = await import("@homarr/docker");
      const { bestMatch } = await import("@homarr/common");

      const dockerInstances = DockerSingleton.getInstances();
      if (dockerInstances.length === 0) {
        return { status: "empty" as const, ...emptyResult };
      }

      const results = await Promise.allSettled(
        dockerInstances.map(async ({ instance, host }) => {
          const containerList = await instance.listContainers({ all: true });
          return containerList
            .filter((c) => !(dockerLabels.hide in c.Labels))
            .map((c) => ({ ...c, host }));
        }),
      );

      const containers = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

      if (containers.length === 0) {
        return { status: "empty" as const, ...emptyResult };
      }

      const likeQueries = containers.map((c) => like(icons.name, `%${extractContainerImageName(c.Image)}%`));
      const dbIcons = likeQueries.length > 0
        ? await ctx.db.query.icons.findMany({ where: or(...likeQueries) })
        : [];

      const seenKinds = new Set<IntegrationKind>();
      const discoveredIntegrations = emptyResult.integrations;
      const discoveredApps = emptyResult.apps;

      for (const container of containers) {
        const imageName = extractContainerImageName(container.Image);
        const containerName = container.Names[0]?.split("/")[1] ?? "Unknown";
        const iconUrl = bestMatch(imageName, dbIcons, (icon) => icon.name)?.url ?? null;

        const { url: suggestedUrl, publishedPort } = buildSuggestedUrl(container.Ports, container.host);

        const kind = matchIntegrationKindFromContainer({ image: container.Image, name: containerName });

        if (kind && !seenKinds.has(kind)) {
          seenKinds.add(kind);
          discoveredIntegrations.push({
            containerId: container.Id,
            containerName,
            kind,
            suggestedUrl,
            publishedPort,
            iconUrl,
          });
        } else if (!kind && iconUrl) {
          discoveredApps.push({
            containerId: container.Id,
            containerName,
            suggestedUrl,
            iconUrl,
          });
        }
      }

      return { status: "success" as const, integrations: discoveredIntegrations, apps: discoveredApps };
    } catch {
      return { status: "unavailable" as const, ...emptyResult };
    }
  }),
  createAppsFromDiscovery: onboardingProcedure
    .requiresStep("integrations")
    .input(
      z.array(
        z.object({
          name: z.string().nonempty().max(127),
          href: z.string().nullable(),
          iconUrl: z.string().nullable(),
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.length === 0) return;
      const defaultIcon = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/homarr.svg";
      await ctx.db.insert(apps).values(
        input.map((app) => ({
          id: createId(),
          name: app.name,
          iconUrl: app.iconUrl ?? defaultIcon,
          href: app.href,
          description: null,
        })),
      );
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
      const existingItems = await db.query.items.findMany({
        where: eq(items.boardId, board.id),
      });
      for (const item of existingItems) {
        await db.delete(integrationItems).where(eq(integrationItems.itemId, item.id));
        await db.delete(itemLayouts).where(eq(itemLayouts.itemId, item.id));
      }
      if (existingItems.length > 0) {
        await db.delete(items).where(eq(items.boardId, board.id));
      }

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
