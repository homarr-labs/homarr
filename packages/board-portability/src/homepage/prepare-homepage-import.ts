import { createId } from "@homarr/common";
import { encryptSecret } from "@homarr/common/server";
import type { InferInsertModel } from "@homarr/db";
import type {
  apps,
  boards,
  integrationItems,
  integrationSecrets,
  integrations,
  itemLayouts,
  items,
  layouts,
  sections,
} from "@homarr/db/schema";
import type { IntegrationSecretKind } from "@homarr/definitions";
import { emptySuperJSON, integrationDefs } from "@homarr/definitions";

import { stringifyForDb } from "../utils";
import type { HomepageService, HomepageWidget } from "./types";
import { homepageWidgetMap } from "./widget-type-map";

const DASHBOARD_ICON_CDN = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg";
const ENV_VAR_PATTERN = /^\$\{[^}]+\}$/;
const COLUMN_COUNT = 10;
const APP_ITEM_WIDTH = 1;
const APP_ITEM_HEIGHT = 1;

export type PreparedHomepageImport = {
  apps: InferInsertModel<typeof apps>[];
  integrations: InferInsertModel<typeof integrations>[];
  integrationSecrets: InferInsertModel<typeof integrationSecrets>[];
  board: InferInsertModel<typeof boards>;
  layouts: InferInsertModel<typeof layouts>[];
  sections: InferInsertModel<typeof sections>[];
  items: InferInsertModel<typeof items>[];
  itemLayouts: InferInsertModel<typeof itemLayouts>[];
  integrationItems: InferInsertModel<typeof integrationItems>[];
  warnings: string[];
  unmappedWidgetTypes: string[];
};

const isEnvVarReference = (value: string) => ENV_VAR_PATTERN.test(value.trim());

export const resolveHomepageIconUrl = (icon: string | undefined, serviceName: string): string => {
  if (!icon || icon.trim().length === 0) {
    const fallback = serviceName.toLowerCase().replaceAll(/[^a-z0-9]+/g, "");
    return `${DASHBOARD_ICON_CDN}/${fallback || "generic"}.svg`;
  }

  if (icon.startsWith("http://") || icon.startsWith("https://")) {
    return icon;
  }

  const baseName = icon.replace(/\.(png|webp|svg|jpg|jpeg)$/i, "");
  return `${DASHBOARD_ICON_CDN}/${baseName}.svg`;
};

const resolvePingUrl = (service: HomepageService): string | null => {
  const raw = service.ping ?? service.siteMonitor;
  if (!raw || raw.trim().length === 0) {
    return null;
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  return `http://${raw}`;
};

const extractSecretValue = (widget: HomepageWidget, homepageField: string): string | undefined => {
  const value = widget[homepageField];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

export const prepareHomepageImport = (
  services: HomepageService[],
  boardName: string,
  creatorId: string,
  createIntegrations: boolean,
): PreparedHomepageImport => {
  const warnings: string[] = [];
  const unmappedWidgetTypesSet = new Set<string>();

  const boardId = createId();
  const layoutId = createId();

  const board: InferInsertModel<typeof boards> = {
    id: boardId,
    name: boardName,
    creatorId,
    isPublic: false,
  };

  const layoutRows: InferInsertModel<typeof layouts>[] = [
    {
      id: layoutId,
      boardId,
      name: "Base",
      columnCount: COLUMN_COUNT,
      breakpoint: 0,
    },
  ];

  const groupNames = [...new Set(services.map((service) => service.group || "Services"))];
  const sectionByGroup = new Map<string, string>();
  const sectionRows: InferInsertModel<typeof sections>[] = groupNames.map((groupName, index) => {
    const sectionId = createId();
    sectionByGroup.set(groupName, sectionId);
    return {
      id: sectionId,
      boardId,
      kind: "category" as const,
      name: groupName.length > 0 ? groupName : "Services",
      xOffset: 0,
      yOffset: index,
    };
  });

  const appRows: InferInsertModel<typeof apps>[] = [];
  const integrationRows: InferInsertModel<typeof integrations>[] = [];
  const integrationSecretRows: InferInsertModel<typeof integrationSecrets>[] = [];
  const itemRows: InferInsertModel<typeof items>[] = [];
  const itemLayoutRows: InferInsertModel<typeof itemLayouts>[] = [];
  const integrationItemRows: InferInsertModel<typeof integrationItems>[] = [];

  const gridState = new Map<string, { x: number; y: number }>();

  for (const service of services) {
    const groupKey = service.group || "Services";
    const sectionId = sectionByGroup.get(groupKey);
    if (!sectionId) {
      warnings.push(`Skipped "${service.name}" because section "${groupKey}" was not found`);
      continue;
    }

    const appId = createId();
    const iconUrl = resolveHomepageIconUrl(service.icon, service.name);
    const pingUrl = resolvePingUrl(service);

    appRows.push({
      id: appId,
      name: service.name,
      href: service.href ?? null,
      iconUrl,
      description: service.description ?? null,
      pingUrl,
    });

    const grid = gridState.get(sectionId) ?? { x: 0, y: 0 };
    const itemId = createId();

    itemRows.push({
      id: itemId,
      boardId,
      kind: "app",
      options: stringifyForDb({
        appId,
        openInNewTab: true,
        showTitle: true,
        layout: "column",
        descriptionDisplayMode: service.description ? "tooltip" : "hidden",
        pingEnabled: pingUrl !== null,
      }),
      advancedOptions: emptySuperJSON,
    });

    itemLayoutRows.push({
      itemId,
      sectionId,
      layoutId,
      width: APP_ITEM_WIDTH,
      height: APP_ITEM_HEIGHT,
      xOffset: grid.x,
      yOffset: grid.y,
    });

    grid.x += APP_ITEM_WIDTH;
    if (grid.x >= COLUMN_COUNT) {
      grid.x = 0;
      grid.y += APP_ITEM_HEIGHT;
    }
    gridState.set(sectionId, grid);

    if (!createIntegrations) {
      for (const widget of service.widgets) {
        const mapping = homepageWidgetMap[widget.type.toLowerCase()];
        if (mapping === undefined || mapping === null) {
          unmappedWidgetTypesSet.add(widget.type);
        }
      }
      continue;
    }

    for (const widget of service.widgets) {
      const mapping = homepageWidgetMap[widget.type.toLowerCase()];
      if (mapping === undefined || mapping === null) {
        unmappedWidgetTypesSet.add(widget.type);
        continue;
      }

      const integrationId = createId();
      const integrationUrl =
        (typeof widget.url === "string" && widget.url.length > 0 ? widget.url : service.href) ?? "";

      if (integrationUrl.length === 0) {
        warnings.push(`Skipped integration for "${service.name}" (${widget.type}): missing URL`);
        continue;
      }

      integrationRows.push({
        id: integrationId,
        kind: mapping.integrationKind,
        name: service.name,
        url: integrationUrl,
        appId,
      });

      for (const [homepageField, secretKind] of Object.entries(mapping.secretFieldMap)) {
        const rawValue = extractSecretValue(widget, homepageField);
        if (!rawValue) {
          continue;
        }

        if (isEnvVarReference(rawValue)) {
          warnings.push(
            `Unresolved secret for "${service.name}" (${widget.type}): ${homepageField} references an environment variable`,
          );
          continue;
        }

        integrationSecretRows.push({
          integrationId,
          kind: secretKind as IntegrationSecretKind,
          value: encryptSecret(rawValue),
        });
      }

      const requiredSecretSets = integrationDefs[mapping.integrationKind].secretKinds;
      const providedKinds = new Set(
        integrationSecretRows.filter((secret) => secret.integrationId === integrationId).map((secret) => secret.kind),
      );
      const hasRequiredSecrets = requiredSecretSets.some(
        (secretSet) => secretSet.length === 0 || secretSet.every((kind) => providedKinds.has(kind)),
      );

      if (!hasRequiredSecrets && requiredSecretSets.every((secretSet) => secretSet.length > 0)) {
        warnings.push(`Integration "${service.name}" (${mapping.integrationKind}) may be missing required credentials`);
      }

      const widgetItemId = createId();
      const widgetGrid = gridState.get(sectionId) ?? { x: 0, y: 0 };

      itemRows.push({
        id: widgetItemId,
        boardId,
        kind: mapping.widgetKind,
        options: emptySuperJSON,
        advancedOptions: emptySuperJSON,
      });

      itemLayoutRows.push({
        itemId: widgetItemId,
        sectionId,
        layoutId,
        width: 2,
        height: 1,
        xOffset: widgetGrid.x,
        yOffset: widgetGrid.y,
      });

      widgetGrid.x += 2;
      if (widgetGrid.x >= COLUMN_COUNT) {
        widgetGrid.x = 0;
        widgetGrid.y += 1;
      }
      gridState.set(sectionId, widgetGrid);

      integrationItemRows.push({
        itemId: widgetItemId,
        integrationId,
      });
    }
  }

  return {
    apps: appRows,
    integrations: integrationRows,
    integrationSecrets: integrationSecretRows,
    board,
    layouts: layoutRows,
    sections: sectionRows,
    items: itemRows,
    itemLayouts: itemLayoutRows,
    integrationItems: integrationItemRows,
    warnings,
    unmappedWidgetTypes: [...unmappedWidgetTypesSet].sort(),
  };
};
