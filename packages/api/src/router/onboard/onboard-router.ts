import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { encryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { asc, eq, inArray, like, or } from "@homarr/db";
import { placeAllWidgetsAsync } from "@homarr/db/queries";
import { getServerSettingsAsync } from "@homarr/db/queries";
import {
  apps,
  boards,
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
  everyoneGroup,
  extractContainerImageName,
  getIconUrl,
  integrationKinds,
  integrationSecretKinds,
  matchIntegrationKindFromContainer,
  onboardingSteps,
} from "@homarr/definitions";
import type { IntegrationKind } from "@homarr/definitions";
import { zodEnumFromArray } from "@homarr/validation/enums";

import { createTRPCRouter, onboardingProcedure, publicProcedure } from "../../trpc";
import { MissingSecretError, testConnectionAsync } from "../integration/integration-test-connection";
import { mapTestConnectionError } from "../integration/map-test-connection-error";
import { getOnboardingOrFallbackAsync, nextOnboardingStepAsync } from "./onboard-queries";

const logger = createLogger({ module: "onboardDockerDiscovery" });

interface PortInfo {
  IP?: string;
  PublicPort?: number;
}

interface SuggestedUrlResult {
  url: string;
  publishedPort: number | null;
}

type DockerDiscoverySource = "label" | "docker";

interface DiscoveredIntegration {
  containerId: string;
  containerName: string;
  kind: IntegrationKind;
  suggestedUrl: string;
  publishedPort: number | null;
  iconUrl: string | null;
  source: DockerDiscoverySource;
  group?: string;
}

interface DiscoveredApp {
  containerId: string;
  containerName: string;
  suggestedUrl: string;
  publishedPort: number | null;
  iconUrl: string | null;
  source: DockerDiscoverySource;
  group?: string;
  host?: string;
}

const buildSuggestedUrl = (ports: PortInfo[] | undefined, host: string): SuggestedUrlResult => {
  const port = ports?.[0];
  if (port?.PublicPort) {
    const ip = port.IP && port.IP !== "0.0.0.0" && port.IP !== "::" ? port.IP : host;
    return { url: `http://${ip}:${port.PublicPort}`, publishedPort: port.PublicPort };
  }
  return { url: "", publishedPort: null };
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
      integrations: [] as DiscoveredIntegration[],
      apps: [] as DiscoveredApp[],
    };

    try {
      const { DockerSingleton, dockerLabels, listDiscoveredContainersAsync } = await import("@homarr/docker");
      const serverSettings = await getServerSettingsAsync(ctx.db);

      const labeledServices = await listDiscoveredContainersAsync({
        readHomepageLabels: serverSettings.docker.readHomepageLabels,
      });
      const labeledContainerIds = new Set(labeledServices.map((service) => service.containerId));
      const seenKinds = new Set<IntegrationKind>();
      const discoveredIntegrations: DiscoveredIntegration[] = [];
      const discoveredApps: DiscoveredApp[] = [];

      for (const service of labeledServices) {
        if (service.integrationKind && !seenKinds.has(service.integrationKind)) {
          seenKinds.add(service.integrationKind);
          discoveredIntegrations.push({
            containerId: service.containerId,
            containerName: service.name,
            kind: service.integrationKind,
            suggestedUrl: service.href,
            publishedPort: null,
            iconUrl: service.icon ?? null,
            source: "label",
            group: service.group,
          });
          continue;
        }

        discoveredApps.push({
          containerId: service.containerId,
          containerName: service.name,
          suggestedUrl: service.href,
          publishedPort: null,
          iconUrl: service.icon ?? null,
          source: "label",
          group: service.group,
          host: service.host,
        });
      }

      const dockerInstances = DockerSingleton.getInstances();
      if (dockerInstances.length === 0) {
        const hasResults = discoveredIntegrations.length > 0 || discoveredApps.length > 0;
        return {
          status: hasResults ? ("success" as const) : ("empty" as const),
          integrations: discoveredIntegrations,
          apps: discoveredApps,
        };
      }

      const results = await Promise.allSettled(
        dockerInstances.map(async ({ instance, host }) => {
          const containerList = await instance.listContainers({ all: false });
          return containerList
            .filter((container) => !(dockerLabels.hide in container.Labels))
            .filter((container) => !labeledContainerIds.has(container.Id))
            .map((container) => ({ ...container, host }));
        }),
      );

      const containers = results.flatMap((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        }

        logger.warn("Failed to list containers for onboarding discovery", {
          host: dockerInstances[index]?.host,
          cause: result.reason,
        });
        return [];
      });

      if (containers.length === 0 && discoveredIntegrations.length === 0 && discoveredApps.length === 0) {
        return { status: "empty" as const, ...emptyResult };
      }

      const likeQueries = containers.map((container) =>
        like(icons.name, `%${extractContainerImageName(container.Image)}%`),
      );
      const dbIcons = likeQueries.length > 0 ? await ctx.db.query.icons.findMany({ where: or(...likeQueries) }) : [];

      const cdnIconUrl = (slug: string) =>
        `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/${slug}.svg`;

      const strictIconMatch = (imageName: string) => {
        const normalized = imageName.toLowerCase().trim();
        if (normalized.length < 3) return null;
        const exact = dbIcons.find((icon) => icon.name.toLowerCase() === normalized);
        if (exact) return exact.url;
        return dbIcons.find((icon) => icon.name.toLowerCase().startsWith(normalized))?.url ?? null;
      };

      for (const container of containers) {
        const imageName = extractContainerImageName(container.Image);
        const containerName = container.Names[0]?.split("/")[1] ?? "Unknown";
        const dbIcon = strictIconMatch(imageName);
        const iconUrl = dbIcon ?? cdnIconUrl(imageName.toLowerCase());

        const { url: suggestedUrl, publishedPort } = buildSuggestedUrl(container.Ports, container.host);

        const kind = matchIntegrationKindFromContainer({
          image: container.Image,
          name: containerName,
        });

        if (kind && !seenKinds.has(kind)) {
          seenKinds.add(kind);
          discoveredIntegrations.push({
            containerId: container.Id,
            containerName,
            kind,
            suggestedUrl,
            publishedPort,
            iconUrl,
            source: "docker",
          });
        } else if (!kind && dbIcon) {
          discoveredApps.push({
            containerId: container.Id,
            containerName,
            suggestedUrl,
            publishedPort,
            iconUrl,
            source: "docker",
            host: container.host,
          });
        }
      }

      const hasResults = discoveredIntegrations.length > 0 || discoveredApps.length > 0;
      return {
        status: hasResults ? ("success" as const) : ("empty" as const),
        integrations: discoveredIntegrations,
        apps: discoveredApps,
      };
    } catch (error) {
      logger.warn("Docker discovery failed during onboarding", { cause: error });
      return { status: "unavailable" as const, ...emptyResult };
    }
  }),
  syncDockerLabelApps: onboardingProcedure
    .requiresStep("integrations")
    .input(
      z.array(
        z.object({
          containerId: z.string(),
          host: z.string(),
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.length === 0) {
        return { created: 0, updated: 0, skipped: 0, notFound: 0 };
      }

      const { listDiscoveredContainersAsync, syncDiscoveredServicesAsync } = await import("@homarr/docker");
      const serverSettings = await getServerSettingsAsync(ctx.db);
      const labeledServices = await listDiscoveredContainersAsync({
        readHomepageLabels: serverSettings.docker.readHomepageLabels,
      });
      const selectedKeys = new Set(input.map((entry) => `${entry.host}/${entry.containerId}`));
      const selectedServices = labeledServices.filter((service) =>
        selectedKeys.has(`${service.host}/${service.containerId}`),
      );

      const syncResult = await syncDiscoveredServicesAsync(selectedServices, {
        targetBoardName: serverSettings.docker.targetBoardName,
        enableStatusByDefault: serverSettings.board.enableStatusByDefault,
        forceDisableStatus: serverSettings.board.forceDisableStatus,
        defaultItemWidth: serverSettings.docker.defaultItemWidth,
        defaultItemHeight: serverSettings.docker.defaultItemHeight,
      });

      return {
        ...syncResult,
        notFound: input.length - selectedServices.length,
      };
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

      const existingApps = await ctx.db.query.apps.findMany({ columns: { href: true } });
      const existingHrefs = new Set(
        existingApps.map((app) => app.href).filter((href): href is string => Boolean(href)),
      );
      const appsToCreate = input.filter((app) => !app.href || !existingHrefs.has(app.href));
      if (appsToCreate.length === 0) return;

      const defaultIcon = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/homarr.svg";
      await ctx.db.insert(apps).values(
        appsToCreate.map((app) => ({
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
    const serverSettings = await getServerSettingsAsync(db);

    const allIntegrations = await db.query.integrations.findMany();
    const allApps = await db.query.apps.findMany();
    const labelSyncedAppIds = new Set(
      (await db.query.dockerAppSources.findMany({ columns: { appId: true } })).map((source) => source.appId),
    );
    const appsForWidgetPlacement = allApps.filter((app) => !labelSyncedAppIds.has(app.id));

    const boardList = await db.query.boards.findMany({
      orderBy: asc(boards.name),
      with: {
        sections: true,
        layouts: true,
      },
    });
    const targetBoardName = serverSettings.docker.targetBoardName;
    const board = targetBoardName
      ? (boardList.find((entry) => entry.name === targetBoardName) ?? boardList.at(0))
      : boardList.at(0);

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
      const emptySectionLayouts = await db.query.itemLayouts.findMany({
        where: eq(itemLayouts.sectionId, section.id),
        columns: { itemId: true },
      });
      const emptySectionItemIds = emptySectionLayouts.map((entry) => entry.itemId);

      if (emptySectionItemIds.length > 0) {
        await db.delete(integrationItems).where(inArray(integrationItems.itemId, emptySectionItemIds));
        await db.delete(itemLayouts).where(inArray(itemLayouts.itemId, emptySectionItemIds));
        await db.delete(items).where(inArray(items.id, emptySectionItemIds));
      }

      await placeAllWidgetsAsync(
        db,
        {
          boardId: board.id,
          sectionId: section.id,
          layoutId: layout.id,
          columnCount: layout.columnCount,
        },
        allIntegrations,
        appsForWidgetPlacement,
      );
    }

    await nextOnboardingStepAsync(db, undefined);
  }),
});
