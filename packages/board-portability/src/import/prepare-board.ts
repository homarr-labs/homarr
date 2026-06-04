import { createId } from "@homarr/common";
import type { InferInsertModel, InferSelectModel } from "@homarr/db";
import type {
  apps,
  boards,
  integrationItems,
  integrations,
  itemLayouts,
  items,
  layouts,
  sectionLayouts,
  sections,
} from "@homarr/db/schema";
import { backgroundImageAttachments, backgroundImageRepeats, backgroundImageSizes } from "@homarr/definitions";

import type { HomarrBundle, HomarrBundleBoard } from "../schema";
import { replaceAppRefsInValue, stringifyForDb } from "../utils";
import { doAppsMatch } from "./match-apps";

const mustGet = <T>(map: Map<string, T>, key: string): T => {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error(`Missing map entry for key "${key}"`);
  }
  return value;
};

export type PreparedBundleImport = {
  apps: InferInsertModel<typeof apps>[];
  board: InferInsertModel<typeof boards>;
  layouts: InferInsertModel<typeof layouts>[];
  sections: InferInsertModel<typeof sections>[];
  sectionLayouts: InferInsertModel<typeof sectionLayouts>[];
  items: InferInsertModel<typeof items>[];
  itemLayouts: InferInsertModel<typeof itemLayouts>[];
  integrationItems: InferInsertModel<typeof integrationItems>[];
  warnings: string[];
  createdAppsCount: number;
  createdItemsCount: number;
};

const integrationMatches = (
  bundleIntegration: HomarrBundle["integrations"][number],
  existing: InferSelectModel<typeof integrations>,
) => {
  return (
    bundleIntegration.kind === existing.kind &&
    bundleIntegration.name === existing.name &&
    bundleIntegration.url === existing.url
  );
};

export const prepareBoardImport = (
  bundle: HomarrBundle,
  boardName: string,
  creatorId: string,
  existingApps: InferSelectModel<typeof apps>[],
  existingIntegrations: InferSelectModel<typeof integrations>[],
  integrationIdsWithAccess: string[],
  hasAccessForAll: boolean,
): PreparedBundleImport => {
  const warnings: string[] = [];

  if (bundle.boards.length > 1) {
    warnings.push(`Bundle contains ${bundle.boards.length} boards; only the first board was imported`);
  }

  const sourceBoard = bundle.boards[0] as HomarrBundleBoard | undefined;

  if (!sourceBoard) {
    throw new Error("Bundle does not contain a board");
  }

  const boardId = createId();
  const layoutRefToId = new Map(sourceBoard.layouts.map((layout) => [layout.ref, createId()]));
  const sectionRefToId = new Map(sourceBoard.sections.map((section) => [section.ref, createId()]));
  const itemRefToId = new Map(sourceBoard.items.map((item) => [item.ref, createId()]));

  const appRefToId = new Map<string, string>();
  const appsToInsert: InferInsertModel<typeof apps>[] = [];
  let createdAppsCount = 0;

  for (const bundleApp of bundle.apps) {
    const existingApp = existingApps.find((existing) =>
      doAppsMatch(existing, {
        name: bundleApp.name,
        iconUrl: bundleApp.iconUrl,
        description: bundleApp.description ?? null,
        href: bundleApp.href,
        pingUrl: bundleApp.pingUrl ?? null,
      }),
    );

    if (existingApp) {
      appRefToId.set(bundleApp.ref, existingApp.id);
      continue;
    }

    const newAppId = createId();
    appRefToId.set(bundleApp.ref, newAppId);
    appsToInsert.push({
      id: newAppId,
      name: bundleApp.name,
      iconUrl: bundleApp.iconUrl,
      href: bundleApp.href,
      description: bundleApp.description ?? null,
      pingUrl: bundleApp.pingUrl ?? null,
    });
    createdAppsCount += 1;
  }

  const integrationRefToId = new Map<string, string>();
  for (const bundleIntegration of bundle.integrations) {
    const existingIntegration = existingIntegrations.find((existing) =>
      integrationMatches(bundleIntegration, existing),
    );

    if (!existingIntegration) {
      warnings.push(
        `Integration "${bundleIntegration.name}" (${bundleIntegration.kind}) was not found and linked widgets were skipped`,
      );
      continue;
    }

    const hasAccess = hasAccessForAll || integrationIdsWithAccess.includes(existingIntegration.id);
    if (!hasAccess) {
      warnings.push(`Integration "${bundleIntegration.name}" is not accessible and was skipped`);
      continue;
    }

    integrationRefToId.set(bundleIntegration.ref, existingIntegration.id);
  }

  const board: PreparedBundleImport["board"] = {
    id: boardId,
    name: boardName,
    creatorId,
    isPublic: sourceBoard.settings.isPublic ?? false,
    pageTitle: sourceBoard.settings.pageTitle ?? null,
    metaTitle: sourceBoard.settings.metaTitle ?? null,
    logoImageUrl: sourceBoard.settings.logoImageUrl ?? null,
    faviconImageUrl: sourceBoard.settings.faviconImageUrl ?? null,
    backgroundImageUrl: sourceBoard.settings.backgroundImageUrl ?? null,
    backgroundImageAttachment:
      sourceBoard.settings.backgroundImageAttachment ?? backgroundImageAttachments.defaultValue,
    backgroundImageRepeat: sourceBoard.settings.backgroundImageRepeat ?? backgroundImageRepeats.defaultValue,
    backgroundImageSize: sourceBoard.settings.backgroundImageSize ?? backgroundImageSizes.defaultValue,
    primaryColor: sourceBoard.settings.primaryColor,
    secondaryColor: sourceBoard.settings.secondaryColor,
    opacity: sourceBoard.settings.opacity,
    customCss: sourceBoard.settings.customCss ?? null,
    iconColor: sourceBoard.settings.iconColor ?? null,
    itemRadius: sourceBoard.settings.itemRadius,
    disableStatus: sourceBoard.settings.disableStatus ?? false,
  };

  const layouts = sourceBoard.layouts.map((layout) => ({
    id: mustGet(layoutRefToId, layout.ref),
    boardId,
    name: layout.name,
    columnCount: layout.columnCount,
    breakpoint: layout.breakpoint,
  }));

  const sections = sourceBoard.sections.map((section) => ({
    id: mustGet(sectionRefToId, section.ref),
    boardId,
    kind: section.kind,
    name: section.name ?? null,
    xOffset: section.xOffset ?? null,
    yOffset: section.yOffset ?? null,
    options: section.options ? stringifyForDb(section.options) : undefined,
  }));

  const sectionLayouts = sourceBoard.sections.flatMap((section) =>
    (section.layouts ?? []).map((layout) => ({
      sectionId: mustGet(sectionRefToId, section.ref),
      layoutId: mustGet(layoutRefToId, layout.layoutRef),
      parentSectionId: mustGet(sectionRefToId, layout.parentSectionRef),
      xOffset: layout.xOffset,
      yOffset: layout.yOffset,
      width: layout.width,
      height: layout.height,
    })),
  );

  const items = sourceBoard.items.map((item) => {
    const optionsWithRefs = replaceAppRefsInValue(item.options, appRefToId) as Record<string, unknown>;
    return {
      id: mustGet(itemRefToId, item.ref),
      boardId,
      kind: item.kind,
      options: stringifyForDb(optionsWithRefs),
      advancedOptions: stringifyForDb(item.advancedOptions),
    };
  });

  const itemLayouts = sourceBoard.items.flatMap((item) =>
    item.layouts.map((layout) => ({
      itemId: mustGet(itemRefToId, item.ref),
      sectionId: mustGet(sectionRefToId, layout.sectionRef),
      layoutId: mustGet(layoutRefToId, layout.layoutRef),
      xOffset: layout.x,
      yOffset: layout.y,
      width: layout.w,
      height: layout.h,
    })),
  );

  const integrationItems = sourceBoard.items.flatMap((item) =>
    item.integrationRefs
      .map((integrationRef) => integrationRefToId.get(integrationRef))
      .filter((integrationId): integrationId is string => integrationId !== undefined)
      .map((integrationId) => ({
        itemId: mustGet(itemRefToId, item.ref),
        integrationId,
      })),
  );

  return {
    apps: appsToInsert,
    board,
    layouts,
    sections,
    sectionLayouts,
    items,
    itemLayouts,
    integrationItems,
    warnings,
    createdAppsCount,
    createdItemsCount: items.length,
  };
};
