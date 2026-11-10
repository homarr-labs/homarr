import { useMemo } from "react";
import { IconBuildingStore } from "@tabler/icons-react";
import type { TablerIcon } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import {
  getWidgetName,
  widgetDefaultSizes,
  widgetIntegrationSupport,
  widgetKinds,
  widgetKindsWithOptionalIntegrations,
} from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { widgetCatalogIcons } from "@homarr/ui/widget-icons";

import { getWidgetConnectionStatus, matchesIntegrationSearch } from "~/components/board/items/item-select-data";
import type { WidgetConnectionStatus } from "~/components/board/items/item-select-data";
import { useFilteredWorkshopCatalog } from "~/components/board/items/workshop-widget-section";
import type { AreaRect, PickTarget } from "./types";

interface CatalogEntryBase {
  key: string;
  name: string;
  fit: number;
  bestFit: boolean;
  connectionStatus: WidgetConnectionStatus;
  defaultSize: { width: number; height: number };
  supportedIntegrations: IntegrationKind[];
  target: PickTarget;
}

export type CatalogEntry =
  | (CatalogEntryBase & { type: "widget"; kind: WidgetKind; icon: TablerIcon; description: string })
  | (CatalogEntryBase & { type: "customWidget"; id: string; icon: TablerIcon; description: string })
  | (CatalogEntryBase & { type: "app"; appId: string; iconUrl: string | null; description: string | null })
  | (Omit<CatalogEntryBase, "target"> & {
      type: "workshop";
      submissionId: string;
      icon: TablerIcon;
      description: string;
    });

export interface AddInPlaceCatalog {
  entries: CatalogEntry[];
  total: number;
  workshop: { enabled: boolean; isPending: boolean; isError: boolean; integrationError: boolean };
}

const defaultSize = { width: 1, height: 1 };

const getFit = (area: Pick<AreaRect, "w" | "h">, size: { width: number; height: number }) =>
  Math.abs(area.w - size.width) + Math.abs(area.h - size.height);

const getCustomWidgetConnectionStatus = (
  requiredKinds: readonly IntegrationKind[],
  availableKinds: ReadonlySet<IntegrationKind> | undefined,
): WidgetConnectionStatus => {
  if (requiredKinds.length === 0) return "noConnectionRequired";
  if (requiredKinds.every((kind) => availableKinds?.has(kind))) return "ready";
  return "needsSetup";
};

export const useAddInPlaceCatalog = (search: string, area: Pick<AreaRect, "w" | "h">): AddInPlaceCatalog => {
  const t = useI18n();
  const { data: session } = useSession();
  const isAdmin = session?.user.permissions.includes("admin") ?? false;
  const board = useRequiredBoard();
  const integrationQuery = clientApi.integration.all.useQuery();
  const integrations = integrationQuery.data;
  const { data: apps } = clientApi.app.selectable.useQuery();
  const { data: customWidgets } = clientApi.customWidget.available.useQuery(
    { boardId: board.id },
    { enabled: isAdmin },
  );

  const availableKinds = useMemo(
    () => new Set((integrations ?? []).filter(({ permissions }) => permissions.hasUseAccess).map(({ kind }) => kind)),
    [integrations],
  );
  const workshopAvailableKinds = useMemo(() => {
    if (!integrations) return undefined;
    return new Set(integrations.filter(({ permissions }) => permissions.hasFullAccess).map(({ kind }) => kind));
  }, [integrations]);
  const query = search.toLowerCase().trim();
  const workshop = useFilteredWorkshopCatalog({
    enabled: isAdmin,
    searchQuery: query,
    integrationFilter: null,
    availableKinds: workshopAvailableKinds,
  });

  const widgetEntries = useMemo(
    () =>
      widgetKinds
        .filter((kind) => kind !== "customApi" && kind !== "app")
        .map((kind) => {
          const supportedIntegrations = (widgetIntegrationSupport[kind] ?? []).filter(
            (integration) => integration !== "mock",
          );
          const size = widgetDefaultSizes[kind] ?? defaultSize;
          return {
            type: "widget" as const,
            key: `widget:${kind}`,
            kind,
            name: getWidgetName(kind, t),
            icon: widgetCatalogIcons[kind],
            description: kind === "mediaMissing" ? "" : t(`widget.${kind}.description`),
            defaultSize: size,
            supportedIntegrations,
            connectionStatus: getWidgetConnectionStatus({
              supportedIntegrations,
              availableKinds,
              connectionOptional: widgetKindsWithOptionalIntegrations.has(kind),
            }),
            target: { type: "widget" as const, kind },
          };
        }),
    [availableKinds, t],
  );

  const customEntries = useMemo(
    () =>
      isAdmin
        ? (customWidgets ?? []).map((definition) => ({
            type: "customWidget" as const,
            key: `custom:${definition.id}`,
            id: definition.id,
            name: definition.name,
            icon: widgetCatalogIcons.customApi,
            description: definition.description ?? "",
            defaultSize: widgetDefaultSizes.customApi ?? defaultSize,
            supportedIntegrations: definition.integrationKinds,
            connectionStatus: getCustomWidgetConnectionStatus(definition.integrationKinds, workshopAvailableKinds),
            target: {
              type: "custom" as const,
              id: definition.id,
              name: definition.name,
              defaultOptions: definition.defaultOptions,
              configurationVersion: definition.updatedAt.getTime(),
            },
          }))
        : [],
    [customWidgets, isAdmin, workshopAvailableKinds],
  );

  const appEntries = useMemo(
    () =>
      (apps ?? []).map((app) => ({
        type: "app" as const,
        key: `app:${app.id}`,
        appId: app.id,
        name: app.name,
        iconUrl: app.iconUrl,
        description: app.description,
        defaultSize: widgetDefaultSizes.app ?? defaultSize,
        supportedIntegrations: [] as IntegrationKind[],
        connectionStatus: "noConnectionRequired" as const,
        target: { type: "app" as const, appId: app.id, name: app.name },
      })),
    [apps],
  );

  return useMemo(() => {
    const matchesQuery = (name: string, integrationKinds: IntegrationKind[]) =>
      !query ||
      name.toLowerCase().includes(query) ||
      integrationKinds.some((kind) => matchesIntegrationSearch(kind, query));

    const withFit = <T extends Omit<CatalogEntryBase, "fit" | "bestFit">>(entry: T) => ({
      ...entry,
      fit: getFit(area, entry.defaultSize),
      bestFit: false,
    });

    const widgetGroup = [...widgetEntries, ...customEntries]
      .filter((entry) => matchesQuery(entry.name, entry.supportedIntegrations))
      .map(withFit)
      .map((entry) => ({ ...entry, bestFit: entry.fit === 0 }))
      .toSorted(
        (entryA, entryB) =>
          Number(entryA.connectionStatus === "needsSetup") - Number(entryB.connectionStatus === "needsSetup") ||
          entryA.fit - entryB.fit ||
          entryA.name.localeCompare(entryB.name),
      );
    const workshopGroup: CatalogEntry[] = (isAdmin ? workshop.items : []).map((item) => ({
      type: "workshop",
      key: `workshop:${item.id}`,
      submissionId: item.id,
      name: item.title,
      description: item.description,
      icon: IconBuildingStore,
      defaultSize: defaultSize,
      fit: 0,
      bestFit: false,
      supportedIntegrations: item.supportedIntegrations,
      connectionStatus: item.isCompatible ? "ready" : "needsSetup",
    }));
    const appGroup = appEntries
      .filter((entry) => matchesQuery(entry.name, []))
      .map(withFit)
      .toSorted((entryA, entryB) => entryA.name.localeCompare(entryB.name)) as CatalogEntry[];

    return {
      entries: [...widgetGroup, ...workshopGroup, ...appGroup],
      total: widgetGroup.length + workshopGroup.length + appGroup.length,
      workshop: {
        enabled: isAdmin,
        isPending: isAdmin && (workshop.isPending || (!integrations && !integrationQuery.isError)),
        isError: workshop.isError,
        integrationError: integrationQuery.isError && !integrations,
      },
    };
  }, [
    appEntries,
    area,
    customEntries,
    query,
    widgetEntries,
    workshop,
    isAdmin,
    integrations,
    integrationQuery.isError,
  ]);
};
