import { createHash } from "node:crypto";

import type { MySqlRawQueryResult } from "drizzle-orm/mysql2";
import type { QueryResult } from "pg";
import { TRPCError } from "@trpc/server";
import SuperJSON from "superjson";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { encryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import { handleTransactionsAsync, eq, inArray, like, or } from "@homarr/db";
import { getServerSettingByKeyAsync } from "@homarr/db/queries";
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
  layouts,
  onboarding,
  sectionLayouts,
  sections,
  serverSettings,
} from "@homarr/db/schema";
import {
  emptySuperJSON,
  everyoneGroup,
  extractContainerImageName,
  getBoardLaneColumnCount,
  getDefaultWidgetConfig,
  getIconUrl,
  getRootSectionLane,
  getWidgetIntegrationIssue,
  getWidgetKindsForIntegration,
  matchIntegrationKindFromContainer,
  rootSectionOffsets,
  widgetIntegrationLimits,
} from "@homarr/definitions";
import type { IntegrationKind, OnboardingLayoutPreset, WidgetKind } from "@homarr/definitions";
import { onboardingCompleteSetupSchema, onboardingIntegrationDraftSchema } from "@homarr/validation/onboarding";

import { onboardingClaimSettingKey } from "../../onboarding-claim";
import { env } from "../../env";
import { createTRPCRouter, onboardingClaimedProcedure, onboardingProcedure, publicProcedure } from "../../trpc";
import { MissingSecretError, testConnectionAsync } from "../integration/integration-test-connection";
import { getOnboardingOrFallbackAsync, nextOnboardingStepAsync } from "./onboard-queries";
import { probeRuntimeCapabilitiesAsync } from "./capability-probes";

const logger = createLogger({ module: "onboardRouter" });

interface PortInfo {
  IP?: string;
  PublicPort?: number;
}

interface SuggestedUrlResult {
  url: string;
  publishedPort: number | null;
}

interface DiscoveredIntegration {
  sourceId: string;
  containerId: string;
  containerName: string;
  kind: IntegrationKind;
  suggestedUrl: string;
  publishedPort: number | null;
  iconUrl: string | null;
  source: "label" | "docker";
  group?: string;
  boardName?: string;
  host: string;
  widgetKind?: WidgetKind;
  description?: string;
  pingUrl?: string;
}

interface DiscoveredApp {
  sourceId: string;
  containerId: string;
  containerName: string;
  suggestedUrl: string;
  publishedPort: number | null;
  iconUrl: string | null;
  source: "label" | "docker";
  group?: string;
  boardName?: string;
  description?: string;
  pingUrl?: string;
  host: string;
  widgetKind?: WidgetKind;
}

const stableOnboardingId = (prefix: "app" | "integration", sourceId: string) => {
  const digest = createHash("sha256").update(sourceId).digest("hex").slice(0, 32);
  return `onboarding_${prefix}_${digest}`;
};

const usableDockerHost = (host: string) => {
  if (host === "socket" || host.startsWith("/")) return null;
  return host.replace(/:\d+$/, "");
};

export const buildSuggestedUrl = (ports: PortInfo[] | undefined, host: string): SuggestedUrlResult => {
  const port = ports?.find((candidate) => candidate.PublicPort !== undefined);
  if (!port?.PublicPort) return { url: "", publishedPort: null };
  const configuredHost = usableDockerHost(host);
  const ip = port.IP && port.IP !== "0.0.0.0" && port.IP !== "::" ? port.IP : configuredHost;
  return { url: ip ? `http://${ip}:${port.PublicPort}` : "", publishedPort: port.PublicPort };
};

const getLayoutPresetColumnCount = (preset: OnboardingLayoutPreset) => {
  const columns: Record<OnboardingLayoutPreset, number> = {
    focused: 8,
    balanced: 10,
    wide: 12,
  };
  return columns[preset];
};

const normalizeLabelBoardName = (name: string) => name.replace(/[^A-Za-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
const defaultAppIcon = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/homarr.svg";

const runtimeCapabilitySchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("available"), detail: z.string().optional() }),
  z.object({ status: z.literal("disabled") }),
  z.object({ status: z.literal("unavailable") }),
]);
const runtimeCapabilitiesSchema = z.object({
  kubernetes: runtimeCapabilitySchema,
  workshop: runtimeCapabilitySchema,
});

export const onboardRouter = createTRPCRouter({
  currentStep: publicProcedure.query(async ({ ctx }) => await getOnboardingOrFallbackAsync(ctx.db)),

  nextStep: onboardingClaimedProcedure.mutation(async ({ ctx }) => {
    const { current } = await getOnboardingOrFallbackAsync(ctx.db);
    if (current !== "start") {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The welcome step is already complete." });
    }
    await nextOnboardingStepAsync(ctx.db);
  }),

  testIntegration: onboardingProcedure
    .requiresStep("setup")
    .input(onboardingIntegrationDraftSchema)
    .mutation(async ({ input }) => {
      const result = await testConnectionAsync({
        id: stableOnboardingId("integration", input.sourceId),
        name: input.name,
        url: input.url,
        kind: input.kind,
        secrets: input.secrets,
      }).catch((error) => {
        if (!(error instanceof MissingSecretError)) throw error;
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      });

      return { success: result.success };
    }),

  detectRuntimeCapabilities: onboardingProcedure
    .requiresStep("setup")
    .output(runtimeCapabilitiesSchema)
    .query(async () => {
      const { env: dockerEnv } = await import("@homarr/docker/env");
      return await probeRuntimeCapabilitiesAsync({
        kubernetesEnabled: dockerEnv.ENABLE_KUBERNETES,
        workshopApiUrl: env.WORKSHOP_API_URL ?? env.HOMARR_WEBSITE_URL,
      });
    }),

  discoverDockerServices: onboardingProcedure.requiresStep("setup").query(async ({ ctx }) => {
    const empty = { integrations: [] as DiscoveredIntegration[], apps: [] as DiscoveredApp[] };

    try {
      const { createDockerSourceId, listDiscoveredContainersAsync, dockerLabels } = await import("@homarr/docker");
      const discovery = await listDiscoveredContainersAsync();
      const successfulHosts = discovery.hosts.filter((host) => host.status === "success");
      const unavailableHosts = discovery.hosts.filter((host) => host.status === "unavailable");
      const containers = successfulHosts.flatMap((hostResult) =>
        hostResult.containers
          .filter((container) => !(dockerLabels.hide in (container.Labels ?? {})))
          .map((container) => ({ ...container, host: hostResult.host })),
      );
      const labeledContainerKeys = new Set(
        discovery.services.map((service) => createDockerSourceId(service.host, service.containerId)),
      );
      const imageCandidates = containers.filter(
        (container) => !labeledContainerKeys.has(createDockerSourceId(container.host, container.Id)),
      );
      const candidateImageNames = [
        ...new Set(imageCandidates.map((container) => extractContainerImageName(container.Image)).filter(Boolean)),
      ].slice(0, 64);
      const likeQueries = candidateImageNames.map((imageName) => like(icons.name, `%${imageName}%`));
      const dbIcons = likeQueries.length > 0 ? await ctx.db.query.icons.findMany({ where: or(...likeQueries) }) : [];
      const cdnIconUrl = (slug: string) =>
        `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/${slug}.svg`;
      const strictIconMatch = (imageName: string) => {
        const normalized = imageName.toLowerCase().trim();
        if (normalized.length < 3) return null;
        return (
          dbIcons.find((icon) => icon.name.toLowerCase() === normalized)?.url ??
          dbIcons.find((icon) => icon.name.toLowerCase().startsWith(normalized))?.url ??
          null
        );
      };

      const discoveredIntegrations: DiscoveredIntegration[] = [];
      const discoveredApps: DiscoveredApp[] = [];

      for (const service of discovery.services) {
        if (service.integrationKind) {
          discoveredIntegrations.push({
            sourceId: service.sourceId,
            containerId: service.containerId,
            containerName: service.name,
            kind: service.integrationKind,
            suggestedUrl: service.href,
            publishedPort: null,
            iconUrl: service.icon ?? getIconUrl(service.integrationKind),
            source: "label",
            group: service.group,
            boardName: service.boardName,
            host: service.host,
            widgetKind: service.widgetKind,
            description: service.description,
            pingUrl: service.pingUrl,
          });
        } else {
          discoveredApps.push({
            sourceId: service.sourceId,
            containerId: service.containerId,
            containerName: service.name,
            suggestedUrl: service.href,
            publishedPort: null,
            iconUrl: service.icon ?? null,
            source: "label",
            group: service.group,
            boardName: service.boardName,
            description: service.description,
            pingUrl: service.pingUrl,
            host: service.host,
            widgetKind: service.widgetKind,
          });
        }
      }

      for (const container of imageCandidates) {
        const imageName = extractContainerImageName(container.Image);
        const containerName = container.Names[0]?.split("/")[1] ?? "Unknown";
        const dbIcon = strictIconMatch(imageName);
        const iconUrl = dbIcon ?? cdnIconUrl(imageName.toLowerCase());
        const { url: suggestedUrl, publishedPort } = buildSuggestedUrl(container.Ports, container.host);
        const kind = matchIntegrationKindFromContainer({ image: container.Image, name: containerName });
        const sourceId = createDockerSourceId(container.host, container.Id);

        if (kind) {
          discoveredIntegrations.push({
            sourceId,
            containerId: container.Id,
            containerName,
            kind,
            suggestedUrl,
            publishedPort,
            iconUrl,
            source: "docker",
            host: container.host,
          });
        } else if (dbIcon) {
          discoveredApps.push({
            sourceId,
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

      const hosts = discovery.hosts.map((host) =>
        host.status === "success"
          ? { host: host.host, status: host.status, containerCount: host.containers.length }
          : { host: host.host, status: host.status, reason: host.reason, containerCount: 0 },
      );
      const status =
        successfulHosts.length === 0
          ? "unavailable"
          : unavailableHosts.length > 0
            ? "partial"
            : discoveredIntegrations.length === 0 && discoveredApps.length === 0
              ? "empty"
              : "success";

      return { status, hosts, integrations: discoveredIntegrations, apps: discoveredApps };
    } catch (error) {
      logger.warn(new ErrorWithMetadata("Docker discovery failed during onboarding", {}, { cause: error }));
      const reason = error instanceof Error ? error.message : "Docker discovery failed";
      return {
        status: "unavailable" as const,
        hosts: [{ host: "unknown", status: "unavailable" as const, reason, containerCount: 0 }],
        ...empty,
      };
    }
  }),

  completeSetup: onboardingProcedure
    .requiresStep("setup")
    .input(onboardingCompleteSetupSchema)
    .mutation(async ({ ctx, input }) => {
      const boardList = await ctx.db.query.boards.findMany({
        with: {
          sections: { with: { layouts: true } },
          layouts: true,
          items: { with: { integrations: true, layouts: true } },
        },
      });
      const existingTargetBoard = input.board.id
        ? boardList.find((board) => board.id === input.board.id)
        : boardList.length === 1
          ? boardList[0]
          : undefined;
      if (input.board.id !== undefined && !existingTargetBoard) {
        throw new TRPCError({ code: "NOT_FOUND", message: "The selected board no longer exists." });
      }
      const pendingBoardRow =
        boardList.length === 0 && input.board.id === undefined
          ? {
              id: createId(),
              name: input.board.name,
              creatorId: ctx.session?.user.id ?? null,
            }
          : undefined;
      const pendingLayouts = pendingBoardRow
        ? [
            {
              id: createId(),
              name: "Mobile",
              boardId: pendingBoardRow.id,
              columnCount: 3,
              leftGutterColumnCount: 0,
              rightGutterColumnCount: 0,
              breakpoint: 0,
              role: "mobile" as const,
            },
            {
              id: createId(),
              name: "Base",
              boardId: pendingBoardRow.id,
              columnCount: 10,
              leftGutterColumnCount: 0,
              rightGutterColumnCount: 0,
              breakpoint: 768,
              role: "base" as const,
            },
          ]
        : [];
      const targetBoard =
        existingTargetBoard ??
        (pendingBoardRow
          ? ({
              ...pendingBoardRow,
              isPublic: false,
              pageTitle: null,
              metaTitle: null,
              logoImageUrl: null,
              faviconImageUrl: null,
              backgroundImageUrl: null,
              backgroundImageAttachment: "fixed",
              backgroundImageRepeat: "no-repeat",
              backgroundImageSize: "cover",
              primaryColor: input.board.primaryColor,
              secondaryColor: input.board.secondaryColor,
              opacity: 100,
              customCss: null,
              iconColor: null,
              itemRadius: input.board.itemRadius,
              disableStatus: false,
              sections: [],
              layouts: pendingLayouts,
              items: [],
            } satisfies (typeof boardList)[number])
          : undefined);
      if (!targetBoard) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Select the exact board to configure when more than one board exists.",
        });
      }

      await Promise.all(
        input.integrations.map(async (integration) => {
          const result = await testConnectionAsync({
            id: stableOnboardingId("integration", integration.sourceId),
            name: integration.name,
            url: integration.url,
            kind: integration.kind,
            secrets: integration.secrets,
          }).catch((error) => {
            if (!(error instanceof MissingSecretError)) throw error;
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          });
          if (!result.success) {
            logger.warn("Creating onboarding integration after its connection test failed", {
              name: integration.name,
              kind: integration.kind,
              error: result.error.message,
            });
          }
        }),
      );

      const plannedIntegrationIds = input.integrations.map((integration) =>
        stableOnboardingId("integration", integration.sourceId),
      );
      const existingPlannedIntegrations =
        plannedIntegrationIds.length > 0
          ? await ctx.db.query.integrations.findMany({ where: inArray(integrations.id, plannedIntegrationIds) })
          : [];
      const existingIntegrationById = new Map(
        existingPlannedIntegrations.map((integration) => [integration.id, integration]),
      );
      const integrationPlans = input.integrations.map((integration) => {
        const id = stableOnboardingId("integration", integration.sourceId);
        const existing = existingIntegrationById.get(id);
        const appId = existing?.appId ?? stableOnboardingId("app", integration.sourceId);
        return {
          id,
          existing: existing !== undefined,
          row: {
            id,
            name: integration.name,
            url: integration.url,
            kind: integration.kind,
            appId,
          } satisfies typeof integrations.$inferSelect,
          appRow: {
            id: appId,
            name: integration.name,
            iconUrl: integration.iconUrl ?? getIconUrl(integration.kind),
            href: integration.url,
            pingUrl: integration.pingUrl ?? integration.url,
            description: integration.description ?? null,
          } satisfies typeof apps.$inferSelect,
          secretRows: integration.secrets.map((secret) => ({
            kind: secret.kind,
            value: encryptSecret(secret.value),
            integrationId: id,
          })),
        };
      });
      const plannedAppRows = [
        ...integrationPlans.map((plan) => plan.appRow),
        ...input.apps.map(
          (app) =>
            ({
              id: stableOnboardingId("app", app.sourceId),
              name: app.name,
              iconUrl: app.iconUrl ?? defaultAppIcon,
              href: app.href,
              pingUrl: app.pingUrl ?? app.href,
              description: app.description ?? null,
            }) satisfies typeof apps.$inferSelect,
        ),
      ];
      const plannedAppIds = plannedAppRows.map((app) => app.id);
      if (new Set(plannedAppIds).size !== plannedAppIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Onboarding app source IDs resolve to the same app." });
      }
      const existingPlannedApps =
        plannedAppIds.length > 0 ? await ctx.db.query.apps.findMany({ where: inArray(apps.id, plannedAppIds) }) : [];
      const existingPlannedAppIds = new Set(existingPlannedApps.map((app) => app.id));
      const appPlans = plannedAppRows.map((row) => ({ id: row.id, existing: existingPlannedAppIds.has(row.id), row }));

      const plannedIntegrationIdSet = new Set(plannedIntegrationIds);
      const plannedAppIdSet = new Set(plannedAppIds);
      if (input.selectedIntegrationIds.some((id) => plannedIntegrationIdSet.has(id))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A new integration cannot also be selected by ID." });
      }
      if (input.selectedAppIds.some((id) => plannedAppIdSet.has(id))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A new app cannot also be selected by ID." });
      }
      const persistedSelectedIntegrations =
        input.selectedIntegrationIds.length > 0
          ? await ctx.db.query.integrations.findMany({ where: inArray(integrations.id, input.selectedIntegrationIds) })
          : [];
      const persistedSelectedApps =
        input.selectedAppIds.length > 0
          ? await ctx.db.query.apps.findMany({ where: inArray(apps.id, input.selectedAppIds) })
          : [];
      if (persistedSelectedIntegrations.length !== input.selectedIntegrationIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "One or more selected integrations no longer exist." });
      }
      if (persistedSelectedApps.length !== input.selectedAppIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "One or more selected apps no longer exist." });
      }
      const selectedIntegrations = [...persistedSelectedIntegrations, ...integrationPlans.map((plan) => plan.row)];
      const selectedApps = [...persistedSelectedApps, ...plannedAppRows];

      const selectedDockerSources =
        input.selectedDockerSourceIds.length > 0
          ? await import("@homarr/docker")
              .then(({ listDiscoveredContainersAsync }) => listDiscoveredContainersAsync())
              .then((discovery) => {
                const selectedIds = new Set(input.selectedDockerSourceIds);
                return discovery.services.filter((service) => selectedIds.has(service.sourceId));
              })
          : [];
      const discoveredSourceIds = new Set(selectedDockerSources.map((service) => service.sourceId));
      const missingDockerSourceIds = input.selectedDockerSourceIds.filter(
        (sourceId) => !discoveredSourceIds.has(sourceId),
      );
      const selectedLabelBoardNames = [
        ...new Set(
          selectedDockerSources.flatMap((service) => (service.boardName === undefined ? [] : [service.boardName])),
        ),
      ];
      const isFreshSoleBoard =
        pendingBoardRow !== undefined ||
        (boardList.length === 1 && targetBoard.name === "dashboard" && targetBoard.creatorId === null);
      const requestedBoardNames = new Set([targetBoard.name, input.board.name]);
      const matchingSelectedBoardName = selectedLabelBoardNames.find((name) =>
        requestedBoardNames.has(normalizeLabelBoardName(name)),
      );
      const selectedLabelBoardName = matchingSelectedBoardName ?? selectedLabelBoardNames[0];
      let targetBoardName = input.board.name;
      if (isFreshSoleBoard && selectedLabelBoardNames.length === 1 && selectedLabelBoardName) {
        const normalizedLabelBoardName = normalizeLabelBoardName(selectedLabelBoardName);
        const parsedName = onboardingCompleteSetupSchema.shape.board.shape.name.safeParse(normalizedLabelBoardName);
        if (!parsedName.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The selected homarr.board label is not a valid board name.",
          });
        }
        targetBoardName = parsedName.data;
      }
      if (
        boardList.some(
          (board) => board.id !== targetBoard.id && board.name.toLowerCase() === targetBoardName.toLowerCase(),
        )
      ) {
        throw new TRPCError({ code: "CONFLICT", message: "A board with this name already exists." });
      }
      const targetBoardNames = new Set([targetBoard.name, targetBoardName]);
      const ignoredDockerSources = selectedDockerSources.filter(
        (service) =>
          service.boardName !== undefined && !targetBoardNames.has(normalizeLabelBoardName(service.boardName)),
      );
      const ignoredDockerSourceIds = new Set(ignoredDockerSources.map((service) => service.sourceId));
      const acceptedDockerSources = selectedDockerSources.filter(
        (service) => !ignoredDockerSourceIds.has(service.sourceId),
      );
      const groupedDockerSources = acceptedDockerSources.filter((service) => service.group !== undefined);
      const ungroupedDockerSources = acceptedDockerSources.filter((service) => service.group === undefined);

      const emptySection = targetBoard.sections.find(
        (section) => section.kind === "empty" && getRootSectionLane(section.xOffset) === "main",
      );
      const sectionId = emptySection?.id ?? createId();
      const baseLayout = targetBoard.layouts.find((layout) => layout.role === "base") ?? targetBoard.layouts.at(-1);
      if (!baseLayout || targetBoard.layouts.length === 0) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The target board has no layouts." });
      }

      const requestedGutters = {
        left: input.board.leftSidebar ? 1 : 0,
        right: input.board.rightSidebar ? 1 : 0,
      };
      const mainRootSectionIds = new Set(
        targetBoard.sections
          .filter((section) => section.kind === "empty" && getRootSectionLane(section.xOffset) === "main")
          .map((section) => section.id),
      );
      const requiredColumns = Math.max(
        1,
        ...targetBoard.items.flatMap((item) =>
          item.layouts
            .filter((layout) => layout.layoutId === baseLayout.id && mainRootSectionIds.has(layout.sectionId))
            .map((layout) => layout.xOffset + layout.width),
        ),
        ...targetBoard.sections.flatMap((section) =>
          section.kind === "container"
            ? section.layouts
                .filter(
                  (layout) =>
                    layout.layoutId === baseLayout.id &&
                    layout.parentSectionId !== null &&
                    mainRootSectionIds.has(layout.parentSectionId),
                )
                .map((layout) => layout.xOffset + layout.width)
            : [],
        ),
      );
      let leftGutterColumnCount = requestedGutters.left;
      let rightGutterColumnCount = requestedGutters.right;
      const desiredColumns = input.board.columnCount ?? getLayoutPresetColumnCount(input.board.layoutPreset);
      if (requiredColumns + leftGutterColumnCount + rightGutterColumnCount > 24) rightGutterColumnCount = 0;
      if (requiredColumns + leftGutterColumnCount + rightGutterColumnCount > 24) leftGutterColumnCount = 0;
      const baseColumnCount = Math.min(
        24,
        Math.max(desiredColumns, requiredColumns + leftGutterColumnCount + rightGutterColumnCount),
      );

      const rootSectionsToInsert: (typeof sections.$inferInsert)[] = [];
      const ensureRootSection = (lane: "left" | "right", enabled: boolean) => {
        if (!enabled) return;
        const exists = targetBoard.sections.some(
          (section) => section.kind === "empty" && getRootSectionLane(section.xOffset) === lane,
        );
        if (!exists) {
          rootSectionsToInsert.push({
            id: createId(),
            boardId: targetBoard.id,
            kind: "empty",
            xOffset: rootSectionOffsets[lane],
            yOffset: 0,
          });
        }
      };
      ensureRootSection("left", input.board.leftSidebar);
      ensureRootSection("right", input.board.rightSidebar);

      const existingItemsByKind = new Map<WidgetKind, (typeof targetBoard.items)[number]>();
      const existingAppIds = new Set<string>();
      for (const item of targetBoard.items) {
        if (!existingItemsByKind.has(item.kind)) existingItemsByKind.set(item.kind, item);
        if (item.kind !== "app") continue;
        try {
          const options = SuperJSON.parse<{ appId?: unknown }>(item.options);
          if (typeof options.appId === "string") existingAppIds.add(options.appId);
        } catch {
          // A malformed existing item must not make first-run setup destructive.
        }
      }

      const newItems: (typeof items.$inferInsert)[] = [];
      const newItemLayouts: (typeof itemLayouts.$inferInsert)[] = [];
      const newIntegrationItems: (typeof integrationItems.$inferInsert)[] = [];
      const skippedWidgets: Array<{
        sourceId: string;
        widgetKind: WidgetKind;
        code: "integration-not-supported" | "integration-required" | "incompatible-integration";
        integrationKind?: IntegrationKind;
      }> = [];
      const newContainerSections: (typeof sections.$inferInsert)[] = [];
      const newSectionLayouts: (typeof sectionLayouts.$inferInsert)[] = [];
      const contexts = targetBoard.layouts.map((layout) => {
        const configuredLayout =
          layout.id === baseLayout.id
            ? { ...layout, columnCount: baseColumnCount, leftGutterColumnCount, rightGutterColumnCount }
            : layout;
        const columnCount = getBoardLaneColumnCount(configuredLayout, "main");
        const existing = targetBoard.items.flatMap((item) =>
          item.layouts.filter((position) => position.layoutId === layout.id && position.sectionId === sectionId),
        );
        const existingContainers = targetBoard.sections.flatMap((section) =>
          section.kind === "container"
            ? section.layouts.filter(
                (position) => position.layoutId === layout.id && position.parentSectionId === sectionId,
              )
            : [],
        );
        return {
          layoutId: layout.id,
          columnCount,
          xOffset: 0,
          yOffset: [...existing, ...existingContainers].reduce(
            (max, position) => Math.max(max, position.yOffset + position.height),
            0,
          ),
          rowMaxHeight: 0,
        };
      });

      const placeNewItem = (
        kind: WidgetKind,
        options: string,
        width: number,
        height: number,
        sectionIdsByLayout?: ReadonlyMap<string, string>,
        positionsByLayout?: ReadonlyMap<string, { xOffset: number; yOffset: number; width: number }>,
      ) => {
        const id = createId();
        newItems.push({ id, boardId: targetBoard.id, kind, options, advancedOptions: emptySuperJSON });
        for (const context of contexts) {
          const sectionForLayout = sectionIdsByLayout?.get(context.layoutId);
          const position = positionsByLayout?.get(context.layoutId);
          if (sectionForLayout && position) {
            newItemLayouts.push({
              itemId: id,
              sectionId: sectionForLayout,
              layoutId: context.layoutId,
              xOffset: position.xOffset,
              yOffset: position.yOffset,
              width: position.width,
              height,
            });
            continue;
          }
          const itemWidth = Math.min(context.columnCount, width);
          if (context.xOffset + itemWidth > context.columnCount) {
            context.xOffset = 0;
            context.yOffset += context.rowMaxHeight;
            context.rowMaxHeight = 0;
          }
          newItemLayouts.push({
            itemId: id,
            sectionId,
            layoutId: context.layoutId,
            xOffset: context.xOffset,
            yOffset: context.yOffset,
            width: itemWidth,
            height,
          });
          context.xOffset += itemWidth;
          context.rowMaxHeight = Math.max(context.rowMaxHeight, height);
        }
        return id;
      };

      const getDockerWidgetPlan = (service: (typeof selectedDockerSources)[number]) => {
        const widgetKind = service.widgetKind;
        if (!widgetKind || !input.selectedWidgetKinds.includes(widgetKind)) return null;
        const integration = service.integrationKind
          ? selectedIntegrations.find(
              (candidate) => candidate.id === stableOnboardingId("integration", service.sourceId),
            )
          : undefined;
        const issue = getWidgetIntegrationIssue(widgetKind, integration ? [integration.kind] : []);
        if (issue) {
          if (issue.code !== "integration-limit") {
            skippedWidgets.push({
              sourceId: service.sourceId,
              widgetKind,
              code: issue.code,
              integrationKind: integration?.kind,
            });
          }
          return null;
        }
        const config = getDefaultWidgetConfig(widgetKind);
        return config.skip ? null : { widgetKind, integration, config };
      };

      const linkExistingDockerWidget = (
        widgetKind: WidgetKind,
        integration: (typeof selectedIntegrations)[number] | undefined,
      ) => {
        const existing = existingItemsByKind.get(widgetKind);
        if (!existing) return false;
        if (!integration) return true;
        const linkedIds = new Set([
          ...existing.integrations.map((row) => row.integrationId),
          ...newIntegrationItems.filter((row) => row.itemId === existing.id).map((row) => row.integrationId),
        ]);
        if (linkedIds.has(integration.id)) return true;
        const limit = widgetIntegrationLimits[widgetKind] ?? Number.POSITIVE_INFINITY;
        if (linkedIds.size >= limit) return false;
        newIntegrationItems.push({ itemId: existing.id, integrationId: integration.id });
        return true;
      };

      const selectedIntegrationIdsByWidget = new Map<WidgetKind, string[]>();
      const labeledIntegrationSourceById = new Map(
        selectedDockerSources
          .filter((service) => service.integrationKind !== undefined)
          .map((service) => [stableOnboardingId("integration", service.sourceId), service]),
      );
      for (const integration of selectedIntegrations) {
        const labeledSource = labeledIntegrationSourceById.get(integration.id);
        if (labeledSource && ignoredDockerSourceIds.has(labeledSource.sourceId)) continue;
        for (const kind of getWidgetKindsForIntegration(integration.kind)) {
          if (labeledSource?.widgetKind === kind && input.selectedWidgetKinds.includes(kind)) {
            continue;
          }
          const ids = selectedIntegrationIdsByWidget.get(kind) ?? [];
          ids.push(integration.id);
          selectedIntegrationIdsByWidget.set(kind, ids);
        }
      }
      for (const [kind, integrationIdsForWidget] of selectedIntegrationIdsByWidget) {
        const config = getDefaultWidgetConfig(kind);
        if (config.skip) continue;
        const existing = existingItemsByKind.get(kind);
        const limit = widgetIntegrationLimits[kind] ?? Number.POSITIVE_INFINITY;
        let unlinkedIntegrationIds = integrationIdsForWidget;
        if (existing) {
          const linkedIds = new Set(existing.integrations.map((row) => row.integrationId));
          const remainingCapacity = Math.max(0, limit - linkedIds.size);
          const idsForExisting = integrationIdsForWidget
            .filter((integrationId) => !linkedIds.has(integrationId))
            .slice(0, remainingCapacity);
          newIntegrationItems.push(...idsForExisting.map((integrationId) => ({ itemId: existing.id, integrationId })));
          const handledIds = new Set([...linkedIds, ...idsForExisting]);
          unlinkedIntegrationIds = integrationIdsForWidget.filter((integrationId) => !handledIds.has(integrationId));
        }
        const batchSize = Number.isFinite(limit) ? Math.max(1, limit) : Math.max(1, unlinkedIntegrationIds.length);
        for (let index = 0; index < unlinkedIntegrationIds.length; index += batchSize) {
          const integrationIdsForItem = unlinkedIntegrationIds.slice(index, index + batchSize);
          const integrationKindsForItem = integrationIdsForItem.flatMap((integrationId) => {
            const integration = selectedIntegrations.find((candidate) => candidate.id === integrationId);
            return integration ? [integration.kind] : [];
          });
          if (getWidgetIntegrationIssue(kind, integrationKindsForItem)) continue;
          const itemId = placeNewItem(
            kind,
            config.options ? SuperJSON.stringify(config.options) : emptySuperJSON,
            config.width,
            config.height,
          );
          newIntegrationItems.push(...integrationIdsForItem.map((integrationId) => ({ itemId, integrationId })));
        }
      }
      const selectedLabelWidgetKinds = new Set(
        acceptedDockerSources.flatMap((service) => (service.widgetKind ? [service.widgetKind] : [])),
      );
      for (const kind of input.selectedWidgetKinds.filter((kind) => !selectedLabelWidgetKinds.has(kind))) {
        if (existingItemsByKind.has(kind) || newItems.some((item) => item.kind === kind)) continue;
        if (getWidgetIntegrationIssue(kind, [])) continue;
        const config = getDefaultWidgetConfig(kind);
        if (config.skip) continue;
        placeNewItem(
          kind,
          config.options ? SuperJSON.stringify(config.options) : emptySuperJSON,
          config.width,
          config.height,
        );
      }
      const dockerSourceByAppId = new Map(
        selectedDockerSources.map((service) => [stableOnboardingId("app", service.sourceId), service]),
      );
      for (const app of selectedApps.filter((app) => !dockerSourceByAppId.has(app.id))) {
        if (existingAppIds.has(app.id)) continue;
        placeNewItem("app", SuperJSON.stringify({ appId: app.id, openInNewTab: true, showTitle: true }), 1, 1);
      }

      for (const service of ungroupedDockerSources) {
        const app = selectedApps.find((candidate) => candidate.id === stableOnboardingId("app", service.sourceId));
        if (app && !existingAppIds.has(app.id)) {
          placeNewItem("app", SuperJSON.stringify({ appId: app.id, openInNewTab: true, showTitle: true }), 1, 1);
        }
        const plan = getDockerWidgetPlan(service);
        if (!plan || linkExistingDockerWidget(plan.widgetKind, plan.integration)) continue;
        const itemId = placeNewItem(
          plan.widgetKind,
          plan.config.options ? SuperJSON.stringify(plan.config.options) : emptySuperJSON,
          plan.config.width,
          plan.config.height,
        );
        if (plan.integration) newIntegrationItems.push({ itemId, integrationId: plan.integration.id });
      }

      const groupedSourcesByName = Map.groupBy(
        groupedDockerSources.filter((service) => {
          const hasSelectedApp = selectedApps.some((app) => app.id === stableOnboardingId("app", service.sourceId));
          const hasSelectedWidget =
            service.widgetKind !== undefined &&
            input.selectedWidgetKinds.includes(service.widgetKind) &&
            (service.integrationKind === undefined ||
              selectedIntegrations.some(
                (integration) => integration.id === stableOnboardingId("integration", service.sourceId),
              ));
          return hasSelectedApp || hasSelectedWidget;
        }),
        (service) => service.group,
      );
      for (const [groupName, services] of groupedSourcesByName) {
        const groupedItemPlans: Array<{
          kind: WidgetKind;
          options: string;
          width: number;
          height: number;
          integrationId?: string;
        }> = [];
        for (const service of services) {
          const app = selectedApps.find((candidate) => candidate.id === stableOnboardingId("app", service.sourceId));
          if (app && !existingAppIds.has(app.id)) {
            groupedItemPlans.push({
              kind: "app",
              options: SuperJSON.stringify({ appId: app.id, openInNewTab: true, showTitle: true }),
              width: 1,
              height: 1,
            });
          }

          const plan = getDockerWidgetPlan(service);
          if (!plan || linkExistingDockerWidget(plan.widgetKind, plan.integration)) continue;
          groupedItemPlans.push({
            kind: plan.widgetKind,
            options: plan.config.options ? SuperJSON.stringify(plan.config.options) : emptySuperJSON,
            width: plan.config.width,
            height: plan.config.height,
            integrationId: plan.integration?.id,
          });
        }
        if (groupedItemPlans.length === 0) continue;

        const containerSectionId = createId();
        newContainerSections.push({
          id: containerSectionId,
          boardId: targetBoard.id,
          kind: "container",
          options: SuperJSON.stringify({
            title: groupName,
            customCssClasses: [],
            borderColor: "",
            showLabel: true,
            collapsible: false,
            showOpenAll: false,
          }),
        });
        const sectionIdsByLayout = new Map(targetBoard.layouts.map((layout) => [layout.id, containerSectionId]));
        const packingByLayout = new Map<
          string,
          { columns: number; xOffset: number; yOffset: number; rowMaxHeight: number; maxBottom: number }
        >();
        for (const context of contexts) {
          if (context.xOffset > 0 || context.rowMaxHeight > 0) context.yOffset += context.rowMaxHeight;
          context.xOffset = 0;
          context.rowMaxHeight = 0;
          packingByLayout.set(context.layoutId, {
            columns: context.columnCount,
            xOffset: 0,
            yOffset: 0,
            rowMaxHeight: 0,
            maxBottom: 0,
          });
        }

        const placeGroupedItem = (kind: WidgetKind, options: string, width: number, height: number) => {
          const positions = new Map<string, { xOffset: number; yOffset: number; width: number }>();
          for (const context of contexts) {
            const packing = packingByLayout.get(context.layoutId);
            if (!packing) continue;
            const itemWidth = Math.min(packing.columns, width);
            if (packing.xOffset + itemWidth > packing.columns) {
              packing.xOffset = 0;
              packing.yOffset += packing.rowMaxHeight;
              packing.rowMaxHeight = 0;
            }
            positions.set(context.layoutId, {
              xOffset: packing.xOffset,
              yOffset: packing.yOffset,
              width: itemWidth,
            });
            packing.xOffset += itemWidth;
            packing.rowMaxHeight = Math.max(packing.rowMaxHeight, height);
            packing.maxBottom = Math.max(packing.maxBottom, packing.yOffset + height);
          }
          return placeNewItem(kind, options, width, height, sectionIdsByLayout, positions);
        };

        for (const plan of groupedItemPlans) {
          const groupedItemId = placeGroupedItem(plan.kind, plan.options, plan.width, plan.height);
          if (plan.integrationId) {
            newIntegrationItems.push({ itemId: groupedItemId, integrationId: plan.integrationId });
          }
        }
        for (const context of contexts) {
          const packing = packingByLayout.get(context.layoutId);
          if (!packing) continue;
          const height = Math.max(1, packing.maxBottom);
          newSectionLayouts.push({
            sectionId: containerSectionId,
            parentSectionId: sectionId,
            layoutId: context.layoutId,
            xOffset: 0,
            yOffset: context.yOffset,
            width: context.columnCount,
            height,
          });
          context.yOffset += height;
        }
      }

      const [currentAppearance, currentCulture, currentAnalytics, currentBoardSettings] = await Promise.all([
        getServerSettingByKeyAsync(ctx.db, "appearance"),
        getServerSettingByKeyAsync(ctx.db, "culture"),
        getServerSettingByKeyAsync(ctx.db, "analytics"),
        getServerSettingByKeyAsync(ctx.db, "board"),
      ]);
      const settingValues = {
        appearance: SuperJSON.stringify({ ...currentAppearance, defaultColorScheme: input.server.defaultColorScheme }),
        culture: SuperJSON.stringify({ ...currentCulture, defaultLocale: input.server.defaultLocale }),
        analytics: SuperJSON.stringify({
          ...currentAnalytics,
          enableGeneral: input.server.analyticsEnabled ?? currentAnalytics.enableGeneral,
        }),
        board: SuperJSON.stringify({
          ...currentBoardSettings,
          homeBoardId: targetBoard.id,
          mobileHomeBoardId: targetBoard.id,
        }),
      };

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            const transitionResult = (await transaction
              .update(schema.onboarding)
              .set({ previousStep: "setup", step: "finish" })
              .where(eq(schema.onboarding.step, "setup"))) as MySqlRawQueryResult | QueryResult;
            const transitionedRows = Array.isArray(transitionResult)
              ? transitionResult[0].affectedRows
              : (transitionResult.rowCount ?? 0);
            if (transitionedRows !== 1) {
              throw new TRPCError({ code: "CONFLICT", message: "Onboarding setup was already completed." });
            }
            for (const plan of appPlans) {
              if (plan.existing) {
                await transaction.update(schema.apps).set(plan.row).where(eq(schema.apps.id, plan.id));
              } else {
                await transaction.insert(schema.apps).values(plan.row);
              }
            }
            for (const plan of integrationPlans) {
              if (plan.existing) {
                await transaction.update(schema.integrations).set(plan.row).where(eq(schema.integrations.id, plan.id));
                await transaction
                  .delete(schema.integrationSecrets)
                  .where(eq(schema.integrationSecrets.integrationId, plan.id));
              } else {
                await transaction.insert(schema.integrations).values(plan.row);
              }
              if (plan.secretRows.length > 0) {
                await transaction.insert(schema.integrationSecrets).values(plan.secretRows);
              }
            }
            const boardValues = {
              name: targetBoardName,
              primaryColor: input.board.primaryColor,
              secondaryColor: input.board.secondaryColor,
              itemRadius: input.board.itemRadius,
            };
            if (pendingBoardRow) {
              await transaction.insert(schema.boards).values({ ...pendingBoardRow, ...boardValues });
              await transaction
                .insert(schema.layouts)
                .values(
                  pendingLayouts.map((layout) =>
                    layout.id === baseLayout.id
                      ? { ...layout, columnCount: baseColumnCount, leftGutterColumnCount, rightGutterColumnCount }
                      : layout,
                  ),
                );
            } else {
              await transaction.update(schema.boards).set(boardValues).where(eq(schema.boards.id, targetBoard.id));
              await transaction
                .update(schema.layouts)
                .set({ columnCount: baseColumnCount, leftGutterColumnCount, rightGutterColumnCount })
                .where(eq(schema.layouts.id, baseLayout.id));
            }
            if (!emptySection) {
              await transaction.insert(schema.sections).values({
                id: sectionId,
                boardId: targetBoard.id,
                kind: "empty",
                xOffset: 0,
                yOffset: 0,
              });
            }
            if (rootSectionsToInsert.length > 0) {
              await transaction.insert(schema.sections).values(rootSectionsToInsert);
            }
            if (newContainerSections.length > 0) {
              await transaction.insert(schema.sections).values(newContainerSections);
            }
            if (newSectionLayouts.length > 0) {
              await transaction.insert(schema.sectionLayouts).values(newSectionLayouts);
            }
            if (newItems.length > 0) await transaction.insert(schema.items).values(newItems);
            if (newItemLayouts.length > 0) await transaction.insert(schema.itemLayouts).values(newItemLayouts);
            if (newIntegrationItems.length > 0) {
              await transaction.insert(schema.integrationItems).values(newIntegrationItems);
            }
            for (const [settingKey, value] of Object.entries(settingValues)) {
              await transaction
                .update(schema.serverSettings)
                .set({ value })
                .where(eq(schema.serverSettings.settingKey, settingKey as keyof typeof settingValues));
            }
            await transaction
              .update(schema.groups)
              .set({ homeBoardId: targetBoard.id, mobileHomeBoardId: targetBoard.id })
              .where(eq(schema.groups.name, everyoneGroup));
            await transaction
              .delete(schema.serverSettings)
              .where(eq(schema.serverSettings.settingKey, onboardingClaimSettingKey));
          });
        },
        handleSync(db) {
          db.transaction((transaction) => {
            const transitionResult = transaction
              .update(onboarding)
              .set({ previousStep: "setup", step: "finish" })
              .where(eq(onboarding.step, "setup"))
              .run();
            if (transitionResult.changes !== 1) {
              throw new TRPCError({ code: "CONFLICT", message: "Onboarding setup was already completed." });
            }
            for (const plan of appPlans) {
              if (plan.existing) {
                transaction.update(apps).set(plan.row).where(eq(apps.id, plan.id)).run();
              } else {
                transaction.insert(apps).values(plan.row).run();
              }
            }
            for (const plan of integrationPlans) {
              if (plan.existing) {
                transaction.update(integrations).set(plan.row).where(eq(integrations.id, plan.id)).run();
                transaction.delete(integrationSecrets).where(eq(integrationSecrets.integrationId, plan.id)).run();
              } else {
                transaction.insert(integrations).values(plan.row).run();
              }
              if (plan.secretRows.length > 0) {
                transaction.insert(integrationSecrets).values(plan.secretRows).run();
              }
            }
            const boardValues = {
              name: targetBoardName,
              primaryColor: input.board.primaryColor,
              secondaryColor: input.board.secondaryColor,
              itemRadius: input.board.itemRadius,
            };
            if (pendingBoardRow) {
              transaction
                .insert(boards)
                .values({ ...pendingBoardRow, ...boardValues })
                .run();
              transaction
                .insert(layouts)
                .values(
                  pendingLayouts.map((layout) =>
                    layout.id === baseLayout.id
                      ? { ...layout, columnCount: baseColumnCount, leftGutterColumnCount, rightGutterColumnCount }
                      : layout,
                  ),
                )
                .run();
            } else {
              transaction.update(boards).set(boardValues).where(eq(boards.id, targetBoard.id)).run();
              transaction
                .update(layouts)
                .set({ columnCount: baseColumnCount, leftGutterColumnCount, rightGutterColumnCount })
                .where(eq(layouts.id, baseLayout.id))
                .run();
            }
            if (!emptySection) {
              transaction
                .insert(sections)
                .values({ id: sectionId, boardId: targetBoard.id, kind: "empty", xOffset: 0, yOffset: 0 })
                .run();
            }
            if (rootSectionsToInsert.length > 0) transaction.insert(sections).values(rootSectionsToInsert).run();
            if (newContainerSections.length > 0) {
              transaction.insert(sections).values(newContainerSections).run();
            }
            if (newSectionLayouts.length > 0) {
              transaction.insert(sectionLayouts).values(newSectionLayouts).run();
            }
            if (newItems.length > 0) transaction.insert(items).values(newItems).run();
            if (newItemLayouts.length > 0) transaction.insert(itemLayouts).values(newItemLayouts).run();
            if (newIntegrationItems.length > 0) transaction.insert(integrationItems).values(newIntegrationItems).run();
            for (const [settingKey, value] of Object.entries(settingValues)) {
              transaction
                .update(serverSettings)
                .set({ value })
                .where(eq(serverSettings.settingKey, settingKey as keyof typeof settingValues))
                .run();
            }
            transaction
              .update(groups)
              .set({ homeBoardId: targetBoard.id, mobileHomeBoardId: targetBoard.id })
              .where(eq(groups.name, everyoneGroup))
              .run();
            transaction.delete(serverSettings).where(eq(serverSettings.settingKey, onboardingClaimSettingKey)).run();
          });
        },
      });

      return {
        boardId: targetBoard.id,
        boardName: targetBoardName,
        docker: {
          missingSourceIds: missingDockerSourceIds,
          ignoredSourceIds: [...ignoredDockerSourceIds],
          skippedWidgets,
        },
      };
    }),
});
