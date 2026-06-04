import { inArray } from "@homarr/db";
import type { Database } from "@homarr/db";
import { apps } from "@homarr/db/schema";
import type { IntegrationSecretKind } from "@homarr/definitions";
import { itemAdvancedOptionsSchema } from "@homarr/validation/shared";

import type { HomarrBundle, HomarrBundleApp, HomarrBundleIntegration } from "../schema";
import { parseStoredValue, replaceAppIdsInValue } from "../utils";
import type { LoadedBoardGraph } from "./load-board-graph";

const buildBoardSettings = (board: LoadedBoardGraph) => ({
  pageTitle: board.pageTitle,
  metaTitle: board.metaTitle,
  logoImageUrl: board.logoImageUrl,
  faviconImageUrl: board.faviconImageUrl,
  backgroundImageUrl: board.backgroundImageUrl,
  backgroundImageAttachment: board.backgroundImageAttachment,
  backgroundImageRepeat: board.backgroundImageRepeat,
  backgroundImageSize: board.backgroundImageSize,
  primaryColor: board.primaryColor,
  secondaryColor: board.secondaryColor,
  opacity: board.opacity,
  customCss: board.customCss,
  iconColor: board.iconColor,
  itemRadius: board.itemRadius,
  disableStatus: board.disableStatus,
  isPublic: board.isPublic,
});

const walkValues = (value: unknown, onString: (candidate: string) => void) => {
  if (typeof value === "string") {
    onString(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => walkValues(entry, onString));
    return;
  }
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((entry) => walkValues(entry, onString));
  }
};

export const serializeBoardToBundleAsync = async (
  db: Database,
  board: LoadedBoardGraph,
  homarrVersion: string,
): Promise<HomarrBundle> => {
  const appIdCandidates = new Set<string>();
  const integrationRecords = new Map<
    string,
    {
      id: string;
      kind: LoadedBoardGraph["items"][number]["integrations"][number]["integration"]["kind"];
      name: string;
      url: string;
      secretKinds: IntegrationSecretKind[];
    }
  >();

  board.items.forEach((item) => {
    const options = parseStoredValue<Record<string, unknown>>(item.options, {});
    walkValues(options, (candidate) => appIdCandidates.add(candidate));

    item.integrations.forEach(({ integration }) => {
      integrationRecords.set(integration.id, {
        id: integration.id,
        kind: integration.kind,
        name: integration.name,
        url: integration.url,
        secretKinds: integration.secrets.map((secret) => secret.kind),
      });
    });
  });

  const dbApps =
    appIdCandidates.size > 0
      ? await db.query.apps.findMany({
          where: inArray(apps.id, [...appIdCandidates]),
        })
      : [];

  const appIdToRef = new Map(dbApps.map((app) => [app.id, app.id] as const));

  const bundleApps: HomarrBundleApp[] = dbApps.map((app) => ({
    ref: app.id,
    name: app.name,
    href: app.href,
    iconUrl: app.iconUrl,
    description: app.description,
    pingUrl: app.pingUrl,
  }));

  const bundleIntegrations: HomarrBundleIntegration[] = [...integrationRecords.values()].map((integration) => ({
    ref: integration.id,
    kind: integration.kind,
    name: integration.name,
    url: integration.url,
    secretKinds: integration.secretKinds,
    secrets: "REDACTED" as const,
  }));

  const bundleItems = board.items.map((item) => {
    const options = parseStoredValue<Record<string, unknown>>(item.options, {});
    const advancedOptions = itemAdvancedOptionsSchema.parse(
      parseStoredValue(item.advancedOptions, itemAdvancedOptionsSchema.parse({})),
    );
    const portableOptions = replaceAppIdsInValue(options, appIdToRef) as Record<string, unknown>;
    const appRef = typeof options.appId === "string" ? appIdToRef.get(options.appId) : undefined;

    return {
      ref: item.id,
      kind: item.kind,
      options: portableOptions,
      advancedOptions,
      integrationRefs: item.integrations.map(({ integrationId }) => integrationId),
      appRef,
      layouts: item.layouts.map((layout) => ({
        layoutRef: layout.layoutId,
        sectionRef: layout.sectionId,
        x: layout.xOffset,
        y: layout.yOffset,
        w: layout.width,
        h: layout.height,
      })),
    };
  });

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    homarrVersion,
    boards: [
      {
        name: board.name,
        settings: buildBoardSettings(board),
        layouts: board.layouts.map((layout) => ({
          ref: layout.id,
          name: layout.name,
          columnCount: layout.columnCount,
          breakpoint: layout.breakpoint,
        })),
        sections: board.sections.map((section) => ({
          ref: section.id,
          kind: section.kind,
          name: section.name,
          yOffset: section.yOffset,
          xOffset: section.xOffset,
          options: section.options ? (parseStoredValue(section.options, {}) as Record<string, unknown>) : undefined,
          layouts:
            section.layouts.length > 0
              ? section.layouts.map((layout) => ({
                  layoutRef: layout.layoutId,
                  parentSectionRef: layout.parentSectionId ?? section.id,
                  xOffset: layout.xOffset,
                  yOffset: layout.yOffset,
                  width: layout.width,
                  height: layout.height,
                }))
              : undefined,
        })),
        items: bundleItems,
      },
    ],
    apps: bundleApps,
    integrations: bundleIntegrations,
  };
};
