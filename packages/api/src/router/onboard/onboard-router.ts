import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { encryptSecret } from "@homarr/common/server";
import { eq, like, or } from "@homarr/db";
import { placeAllWidgetsAsync } from "@homarr/db/queries";
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
      integrations: [] as {
        containerId: string;
        containerName: string;
        kind: IntegrationKind;
        suggestedUrl: string;
        publishedPort: number | null;
        iconUrl: string | null;
      }[],
      apps: [] as {
        containerId: string;
        containerName: string;
        suggestedUrl: string;
        publishedPort: number | null;
        iconUrl: string | null;
      }[],
    };

    try {
      const { DockerSingleton, dockerLabels } = await import("@homarr/docker");

      const dockerInstances = DockerSingleton.getInstances();
      if (dockerInstances.length === 0) {
        return { status: "empty" as const, ...emptyResult };
      }

      const results = await Promise.allSettled(
        dockerInstances.map(async ({ instance, host }) => {
          const containerList = await instance.listContainers({ all: false });
          return containerList.filter((c) => !(dockerLabels.hide in c.Labels)).map((c) => ({ ...c, host }));
        }),
      );

      const containers = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

      if (containers.length === 0) {
        return { status: "empty" as const, ...emptyResult };
      }

      const likeQueries = containers.map((c) => like(icons.name, `%${extractContainerImageName(c.Image)}%`));
      const dbIcons = likeQueries.length > 0 ? await ctx.db.query.icons.findMany({ where: or(...likeQueries) }) : [];

      const seenKinds = new Set<IntegrationKind>();
      const discoveredIntegrations = emptyResult.integrations;
      const discoveredApps = emptyResult.apps;

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
          });
        } else if (!kind && dbIcon) {
          discoveredApps.push({
            containerId: container.Id,
            containerName,
            suggestedUrl,
            publishedPort,
            iconUrl,
          });
        }
      }

      return {
        status: "success" as const,
        integrations: discoveredIntegrations,
        apps: discoveredApps,
      };
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

      await placeAllWidgetsAsync(
        db,
        {
          boardId: board.id,
          sectionId: section.id,
          layoutId: layout.id,
          columnCount: layout.columnCount,
        },
        allIntegrations,
        allApps,
      );
    }

    await nextOnboardingStepAsync(db, undefined);
  }),
});
