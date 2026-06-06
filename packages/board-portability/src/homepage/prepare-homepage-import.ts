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
import { emptySuperJSON, homepageWidgetMap, integrationDefs } from "@homarr/definitions";

import { stringifyForDb } from "../utils";
import type { HomepageService, HomepageWidget } from "./types";

const DASHBOARD_ICON_CDN = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg";
const ENV_VAR_PATTERN = /^\$\{[^}]+\}$/;
const COLUMN_COUNT = 10;
const WIDGET_WIDTH = 2;

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

type GridPosition = { x: number; y: number };

const advanceGrid = (grid: GridPosition, width: number): GridPosition => {
  const nextX = grid.x + width;
  if (nextX >= COLUMN_COUNT) {
    return { x: 0, y: grid.y + 1 };
  }
  return { x: nextX, y: grid.y };
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
  const value = widget.fields[homepageField] ?? (homepageField === "key" ? widget.key : undefined);
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const descriptionDisplayModes: Record<string, string> = {
  present: "tooltip",
  absent: "hidden",
};

type WidgetProcessingContext = {
  service: HomepageService;
  appId: string;
  sectionId: string;
  boardId: string;
  layoutId: string;
  gridState: Map<string, GridPosition>;
  integrationRows: InferInsertModel<typeof integrations>[];
  integrationSecretRows: InferInsertModel<typeof integrationSecrets>[];
  itemRows: InferInsertModel<typeof items>[];
  itemLayoutRows: InferInsertModel<typeof itemLayouts>[];
  integrationItemRows: InferInsertModel<typeof integrationItems>[];
  warnings: string[];
  unmappedWidgetTypesSet: Set<string>;
};

const processServiceWidgets = (ctx: WidgetProcessingContext) => {
  for (const widget of ctx.service.widgets) {
    const mapping = homepageWidgetMap[widget.type.toLowerCase()];
    if (!mapping) {
      ctx.unmappedWidgetTypesSet.add(widget.type);
      continue;
    }

    const integrationId = createId();
    const integrationUrl =
      (typeof widget.url === "string" && widget.url.length > 0 ? widget.url : ctx.service.href) ?? "";

    if (integrationUrl.length === 0) {
      ctx.warnings.push(`Skipped integration for "${ctx.service.name}" (${widget.type}): missing URL`);
      continue;
    }

    ctx.integrationRows.push({
      id: integrationId,
      kind: mapping.integrationKind,
      name: ctx.service.name,
      url: integrationUrl,
      appId: ctx.appId,
    });

    processSecrets(ctx, widget, mapping, integrationId);
    validateSecrets(ctx, mapping, integrationId);
    placeWidgetItem(ctx, mapping.widgetKind, integrationId);
  }
};

const processSecrets = (
  ctx: WidgetProcessingContext,
  widget: HomepageWidget,
  mapping: { secretFieldMap: Record<string, IntegrationSecretKind>; integrationKind: string },
  integrationId: string,
) => {
  for (const [homepageField, secretKind] of Object.entries(mapping.secretFieldMap)) {
    const rawValue = extractSecretValue(widget, homepageField);
    if (!rawValue) continue;

    if (isEnvVarReference(rawValue)) {
      ctx.warnings.push(
        `Unresolved secret for "${ctx.service.name}" (${widget.type}): ${homepageField} references an environment variable`,
      );
      continue;
    }

    ctx.integrationSecretRows.push({
      integrationId,
      kind: secretKind as IntegrationSecretKind,
      value: encryptSecret(rawValue),
    });
  }
};

const validateSecrets = (
  ctx: WidgetProcessingContext,
  mapping: { integrationKind: string },
  integrationId: string,
) => {
  const requiredSecretSets = integrationDefs[mapping.integrationKind as keyof typeof integrationDefs].secretKinds;
  const providedKinds = new Set(
    ctx.integrationSecretRows.filter((s) => s.integrationId === integrationId).map((s) => s.kind),
  );
  const hasRequiredSecrets = requiredSecretSets.some(
    (secretSet) => secretSet.length === 0 || secretSet.every((kind) => providedKinds.has(kind)),
  );

  if (!hasRequiredSecrets && requiredSecretSets.every((set) => set.length > 0)) {
    ctx.warnings.push(`Integration "${ctx.service.name}" (${mapping.integrationKind}) may be missing required credentials`);
  }
};

const placeWidgetItem = (ctx: WidgetProcessingContext, widgetKind: string, integrationId: string) => {
  const widgetItemId = createId();
  const grid = ctx.gridState.get(ctx.sectionId) ?? { x: 0, y: 0 };

  ctx.itemRows.push({
    id: widgetItemId,
    boardId: ctx.boardId,
    kind: widgetKind as never,
    options: emptySuperJSON,
    advancedOptions: emptySuperJSON,
  });

  ctx.itemLayoutRows.push({
    itemId: widgetItemId,
    sectionId: ctx.sectionId,
    layoutId: ctx.layoutId,
    width: WIDGET_WIDTH,
    height: 1,
    xOffset: grid.x,
    yOffset: grid.y,
  });

  ctx.gridState.set(ctx.sectionId, advanceGrid(grid, WIDGET_WIDTH));

  ctx.integrationItemRows.push({
    itemId: widgetItemId,
    integrationId,
  });
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
    { id: layoutId, boardId, name: "Base", columnCount: COLUMN_COUNT, breakpoint: 0 },
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
      name: groupName || "Services",
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
  const gridState = new Map<string, GridPosition>();

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
        descriptionDisplayMode: descriptionDisplayModes[service.description ? "present" : "absent"],
        pingEnabled: pingUrl !== null,
      }),
      advancedOptions: emptySuperJSON,
    });

    itemLayoutRows.push({
      itemId,
      sectionId,
      layoutId,
      width: 1,
      height: 1,
      xOffset: grid.x,
      yOffset: grid.y,
    });

    gridState.set(sectionId, advanceGrid(grid, 1));

    if (!createIntegrations) {
      for (const widget of service.widgets) {
        const mapping = homepageWidgetMap[widget.type.toLowerCase()];
        if (!mapping) {
          unmappedWidgetTypesSet.add(widget.type);
        }
      }
      continue;
    }

    processServiceWidgets({
      service,
      appId,
      sectionId,
      boardId,
      layoutId,
      gridState,
      integrationRows,
      integrationSecretRows,
      itemRows,
      itemLayoutRows,
      integrationItemRows,
      warnings,
      unmappedWidgetTypesSet,
    });
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
