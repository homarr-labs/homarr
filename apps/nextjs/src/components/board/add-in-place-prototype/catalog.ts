import { useMemo } from "react";
import type { TablerIcon } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import {
  getIntegrationName,
  getWidgetName,
  widgetDefaultSizes,
  widgetIntegrationSupport,
  widgetKinds,
} from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { widgetCatalogIcons } from "@homarr/ui/widget-icons";

import { getWidgetConnectionStatus } from "~/components/board/items/item-select-data";
import type { WidgetConnectionStatus } from "~/components/board/items/item-select-data";
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
  | (CatalogEntryBase & { type: "app"; appId: string; iconUrl: string | null; description: string | null });

export interface AddInPlaceCatalog {
  entries: CatalogEntry[];
  total: number;
}

const maxRows = 10;
const minAppRows = 3;
const defaultSize = { width: 1, height: 1 };

const getFit = (area: Pick<AreaRect, "w" | "h">, size: { width: number; height: number }) =>
  Math.abs(area.w - size.width) + Math.abs(area.h - size.height);

const markBestFit = <T extends CatalogEntryBase>(entries: T[]) => {
  const best = Math.min(...entries.map((entry) => entry.fit));
  if (!Number.isFinite(best)) return entries;
  return entries.map((entry) => ({ ...entry, bestFit: entry.fit === best }));
};

export const useAddInPlaceCatalog = (search: string, area: Pick<AreaRect, "w" | "h">): AddInPlaceCatalog => {
  const t = useI18n();
  const { data: session } = useSession();
  const isAdmin = session?.user.permissions.includes("admin") ?? false;
  const board = useRequiredBoard();
  const { data: integrations } = clientApi.integration.all.useQuery();
  const { data: apps } = clientApi.app.selectable.useQuery();
  const { data: customWidgets } = clientApi.customWidget.available.useQuery(
    { boardId: board.id },
    { enabled: isAdmin },
  );

  const availableKinds = useMemo(
    () => new Set((integrations ?? []).filter(({ permissions }) => permissions.hasUseAccess).map(({ kind }) => kind)),
    [integrations],
  );

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
              connectionOptional: false,
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
            description: "",
            defaultSize: widgetDefaultSizes.customApi ?? defaultSize,
            supportedIntegrations: [] as IntegrationKind[],
            connectionStatus: "noConnectionRequired" as const,
            target: {
              type: "custom" as const,
              id: definition.id,
              name: definition.name,
              defaultOptions: definition.defaultOptions,
              configurationVersion: definition.updatedAt.getTime(),
            },
          }))
        : [],
    [customWidgets, isAdmin],
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
    const query = search.toLowerCase().trim();
    const matchesQuery = (name: string, integrationKinds: IntegrationKind[]) =>
      !query ||
      name.toLowerCase().includes(query) ||
      integrationKinds.some((kind) => getIntegrationName(kind).toLowerCase().includes(query));

    const withFit = <T extends Omit<CatalogEntryBase, "fit" | "bestFit">>(entry: T) => ({
      ...entry,
      fit: getFit(area, entry.defaultSize),
      bestFit: false,
    });

    const widgetGroup = markBestFit(
      [...widgetEntries, ...customEntries]
        .filter((entry) => matchesQuery(entry.name, entry.supportedIntegrations))
        .map(withFit)
        .toSorted((entryA, entryB) => entryA.fit - entryB.fit || entryA.name.localeCompare(entryB.name)),
    ) as CatalogEntry[];
    const appGroup = appEntries
      .filter((entry) => matchesQuery(entry.name, []))
      .map(withFit)
      .toSorted((entryA, entryB) => entryA.name.localeCompare(entryB.name)) as CatalogEntry[];

    const total = widgetGroup.length + appGroup.length;
    let widgetRows = Math.min(widgetGroup.length, maxRows);
    let appRows = Math.min(appGroup.length, maxRows - widgetRows);
    if (appGroup.length > 0 && widgetGroup.length > 0) {
      const reserved = Math.min(appGroup.length, minAppRows);
      if (appRows < reserved) {
        appRows = reserved;
        widgetRows = maxRows - appRows;
      }
    }
    return {
      entries: [...widgetGroup.slice(0, widgetRows), ...appGroup.slice(0, appRows)],
      total,
    };
  }, [appEntries, area, customEntries, search, widgetEntries]);
};
