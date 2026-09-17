import SuperJSON from "superjson";

import { customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";
import { emptySuperJSON, widgetIntegrationSupport, widgetKinds } from "@homarr/definitions";
import type { WidgetKind } from "@homarr/definitions";

import type { Database } from "../..";
import { eq, or } from "../..";
import {
  apps,
  boards,
  customWidgetDefinitions,
  integrationItems,
  integrations,
  itemLayouts,
  items,
  layouts,
  sections,
} from "../../schema";
import { WIDGET_UI_AUDIT_FAMILIES } from "./families";
import { WIDGET_UI_AUDIT_OPTIONS } from "./fixtures";
import { WIDGET_UI_AUDIT_SIZES } from "./types";
import type { WidgetUiAuditDataSource, WidgetUiAuditIsolatedBoardMetadata, WidgetUiAuditItemMetadata } from "./types";

export { WIDGET_UI_AUDIT_FAMILIES } from "./families";
export { WIDGET_UI_AUDIT_OPTIONS } from "./fixtures";
export { WIDGET_UI_AUDIT_SIZES } from "./types";
export type {
  WidgetUiAuditDataSource,
  WidgetUiAuditCaptureSet,
  WidgetUiAuditFamily,
  WidgetUiAuditIsolatedBoardMetadata,
  WidgetUiAuditItemMetadata,
  WidgetUiAuditSize,
} from "./types";

const AUDIT_BOARD_PREFIX = "widget-ui-audit-";
const AUDIT_MOCK_INTEGRATION_ID = "widget-ui-audit-mock";
const AUDIT_APP_ID = "widget-ui-audit-app";
const AUDIT_APP_NAME = "Widget UI audit reference";
const AUDIT_CUSTOM_WIDGET_DEFINITION_ID = "widget-ui-audit-custom-widget";
export const WIDGET_UI_AUDIT_ASSISTANT_ISOLATED_FAMILY_ID = "assistant-isolated";
export const WIDGET_UI_AUDIT_ASSISTANT_ISOLATED_FAMILY_NAME = "Assistant isolated size fixtures";
const AUDIT_PUBLIC_API_KINDS = new Set<WidgetKind>([
  "weather",
  "airQuality",
  "rssFeed",
  "stockPrice",
  "timetable",
  "video",
  "customApi",
]);

const slugify = (value: string) =>
  value
    .replaceAll(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const getBoardId = (familyId: string) => `${AUDIT_BOARD_PREFIX}${familyId}`;

const getAssistantIsolatedBoardId = (width: number, height: number) =>
  `${AUDIT_BOARD_PREFIX}assistant-${width}x${height}`;

const getAssistantIsolatedItemId = (width: number, height: number) =>
  `${getAssistantIsolatedBoardId(width, height)}-assistant`;

const getItemId = (familyId: string, kind: WidgetKind, width: number, height: number) =>
  `${getBoardId(familyId)}-${slugify(kind)}-${width}x${height}`;

const getDataSource = (kind: WidgetKind): WidgetUiAuditDataSource => {
  if (widgetIntegrationSupport[kind]?.includes("mock")) return "mock-integration-fixture";
  if (AUDIT_PUBLIC_API_KINDS.has(kind)) return "public-api";
  return "static-fixture";
};

const auditCustomWidgetDefinition = customWidgetDefinitionSchema.parse({
  $schema: "homarr-custom-widget-v2",
  name: "Widget UI audit fixture",
  description: "A deterministic local Custom Widget used by the widget UI audit.",
  sources: {
    default: {
      name: "Local audit fixture",
      baseUrl: "http://localhost:3000",
      networkScope: "loopback",
      auth: "none",
    },
  },
  requests: {},
  options: {},
  template: `<Stack gap="xs" p="sm" h="100%"><Text fw={700}>Custom Widget fixture</Text><Text size="xs" c="dimmed">Deterministic local audit content.</Text></Stack>`,
});

export const validateWidgetUiAuditFamilies = () => {
  const kinds = WIDGET_UI_AUDIT_FAMILIES.flatMap((family) => family.kinds);
  const duplicates = kinds.filter((kind, index) => kinds.indexOf(kind) !== index);
  const missing = widgetKinds.filter((kind) => !kinds.includes(kind));
  const invalidFamilySizes = WIDGET_UI_AUDIT_FAMILIES.filter(
    (family) => family.kinds.length < 2 || family.kinds.length > 5,
  ).map((family) => family.id);
  if (
    duplicates.length > 0 ||
    missing.length > 0 ||
    invalidFamilySizes.length > 0 ||
    kinds.length !== widgetKinds.length
  ) {
    throw new Error(
      `Invalid widget UI audit families: duplicates=${duplicates.join(",") || "none"}; missing=${missing.join(",") || "none"}; invalidFamilySizes=${invalidFamilySizes.join(",") || "none"}`,
    );
  }
};

const getPlacement = (skyline: number[], width: number, height: number) => {
  let bestX = 0;
  let bestY = Number.POSITIVE_INFINITY;

  for (let x = 0; x <= skyline.length - width; x++) {
    const y = Math.max(...skyline.slice(x, x + width));
    if (y < bestY) {
      bestX = x;
      bestY = y;
    }
  }

  for (let x = bestX; x < bestX + width; x++) skyline[x] = bestY + height;
  return { xOffset: bestX, yOffset: bestY };
};

const ensureMockIntegrationAsync = async (db: Database) => {
  const existing = await db.query.integrations.findFirst({ where: eq(integrations.kind, "mock") });
  if (existing) return existing.id;

  await db.insert(integrations).values({
    id: AUDIT_MOCK_INTEGRATION_ID,
    name: "Widget UI audit fixtures",
    url: "https://demo.homarr.dev",
    kind: "mock",
    appId: null,
  });
  return AUDIT_MOCK_INTEGRATION_ID;
};

const ensureAuditAppAsync = async (db: Database) => {
  const auditApps = await db.query.apps.findMany();
  const existingAuditApp = auditApps.find((app) => app.id === AUDIT_APP_ID);
  if (existingAuditApp) return existingAuditApp.id;

  const firstApp = auditApps.at(0);
  if (firstApp) return firstApp.id;

  await db.insert(apps).values({
    id: AUDIT_APP_ID,
    name: AUDIT_APP_NAME,
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/homarr.svg",
    href: "https://homarr.dev",
  });
  return AUDIT_APP_ID;
};

const ensureAuditCustomWidgetDefinitionAsync = async (db: Database) => {
  const existing = await db.query.customWidgetDefinitions.findFirst({
    where: eq(customWidgetDefinitions.id, AUDIT_CUSTOM_WIDGET_DEFINITION_ID),
  });

  const values = {
    name: auditCustomWidgetDefinition.name,
    description: auditCustomWidgetDefinition.description ?? null,
    iconUrl: auditCustomWidgetDefinition.iconUrl ?? null,
    sources: SuperJSON.stringify(auditCustomWidgetDefinition.sources),
    requests: SuperJSON.stringify(auditCustomWidgetDefinition.requests),
    options: SuperJSON.stringify(auditCustomWidgetDefinition.options),
    template: auditCustomWidgetDefinition.template,
    enabled: true,
    creatorId: null,
  };
  if (existing) {
    await db.update(customWidgetDefinitions).set(values).where(eq(customWidgetDefinitions.id, existing.id));
    return existing.id;
  }

  await db.insert(customWidgetDefinitions).values({ id: AUDIT_CUSTOM_WIDGET_DEFINITION_ID, ...values });
  return AUDIT_CUSTOM_WIDGET_DEFINITION_ID;
};

const getAuditOptions = (
  kind: WidgetKind,
  appId: string,
  customWidgetId: string,
  richDemoOptions: ReadonlyMap<WidgetKind, Record<string, unknown>>,
) => {
  const options = richDemoOptions.get(kind) ?? WIDGET_UI_AUDIT_OPTIONS[kind];
  const copiedOptions = options ? { ...options } : undefined;
  if (kind === "app")
    return { ...(copiedOptions ?? {}), appId, openInNewTab: true, showTitle: true, pingEnabled: false };
  if (kind === "iframe") return { ...(copiedOptions ?? {}), ...WIDGET_UI_AUDIT_OPTIONS.iframe };
  if (kind === "notebook" && typeof copiedOptions?.content === "string") {
    return {
      ...copiedOptions,
      content: copiedOptions.content.replace(
        "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/homarr-wordmark-light.svg",
        "/logo/logo.png",
      ),
    };
  }
  if (kind === "bookmarks") return { ...(copiedOptions ?? {}), items: [appId] };
  if (kind === "customApi") {
    return { ...(copiedOptions ?? {}), definitionId: customWidgetId, refreshInterval: 300 };
  }
  return copiedOptions;
};

export const getWidgetUiAuditMetadata = (): WidgetUiAuditItemMetadata[] =>
  WIDGET_UI_AUDIT_FAMILIES.flatMap((family) => {
    const boardId = getBoardId(family.id);
    const boardName = boardId;
    return family.kinds.flatMap((kind) =>
      WIDGET_UI_AUDIT_SIZES.map(({ width, height }) => ({
        boardId,
        boardName,
        familyId: family.id,
        familyName: family.name,
        captureSet: "inventory",
        itemId: getItemId(family.id, kind, width, height),
        kind,
        width,
        height,
        dataSource: getDataSource(kind),
      })),
    );
  });

export const getWidgetUiAuditIsolatedAssistantMetadata = (): WidgetUiAuditIsolatedBoardMetadata[] =>
  WIDGET_UI_AUDIT_SIZES.map(({ width, height }) => ({
    boardId: getAssistantIsolatedBoardId(width, height),
    boardName: getAssistantIsolatedBoardId(width, height),
    familyId: WIDGET_UI_AUDIT_ASSISTANT_ISOLATED_FAMILY_ID,
    familyName: WIDGET_UI_AUDIT_ASSISTANT_ISOLATED_FAMILY_NAME,
    captureSet: "assistant-isolated",
    itemId: getAssistantIsolatedItemId(width, height),
    kind: "assistant",
    width,
    height,
    dataSource: "static-fixture",
  }));

export const seedWidgetUiAuditAsync = async (db: Database) => {
  validateWidgetUiAuditFamilies();
  const mockKinds = WIDGET_UI_AUDIT_FAMILIES.flatMap((family) => family.kinds).filter((kind) =>
    widgetIntegrationSupport[kind]?.includes("mock"),
  );
  const mockIntegrationId = mockKinds.length > 0 ? await ensureMockIntegrationAsync(db) : undefined;
  const appId = await ensureAuditAppAsync(db);
  const customWidgetId = await ensureAuditCustomWidgetDefinitionAsync(db);
  const { buildDemoWidgets } = await import("../seed");
  const richDemoOptions = new Map<WidgetKind, Record<string, unknown>>(
    buildDemoWidgets([appId], customWidgetId)
      .filter((widget) => widget.kind !== "app" && widget.options)
      .map((widget) => [widget.kind, widget.options ?? {}]),
  );
  let createdBoards = 0;
  let createdItems = 0;

  for (const family of WIDGET_UI_AUDIT_FAMILIES) {
    const boardId = getBoardId(family.id);
    const boardName = boardId;
    const existingBoard = await db.query.boards.findFirst({
      where: or(eq(boards.id, boardId), eq(boards.name, boardName)),
      with: { sections: true, layouts: true, items: { with: { layouts: true, integrations: true } } },
    });
    if (existingBoard && existingBoard.id !== boardId) {
      console.warn(`Skipping widget UI audit family '${family.id}' because its name is already in use`);
      continue;
    }

    if (!existingBoard) {
      await db.insert(boards).values({
        id: boardId,
        name: boardName,
        // Audit boards are opt-in fixtures and need to be directly viewable by
        // isolated capture sessions without coupling them to a specific demo user.
        isPublic: true,
        pageTitle: `Widget UI audit / ${family.name}`,
        primaryColor: "#748FFC",
        secondaryColor: "#3BC9DB",
        opacity: 100,
        itemRadius: "lg",
      });
      createdBoards++;
    }

    const sectionId = `${boardId}-main`;
    const layoutId = `${boardId}-base`;
    const existingSection = existingBoard?.sections.find((section) => section.id === sectionId);
    if (!existingSection) {
      await db.insert(sections).values({ id: sectionId, boardId, kind: "empty", xOffset: 0, yOffset: 0 });
    }
    const existingLayout = existingBoard?.layouts.find((layout) => layout.id === layoutId);
    if (!existingLayout) {
      await db.insert(layouts).values({
        id: layoutId,
        name: "Base",
        boardId,
        columnCount: 12,
        breakpoint: 768,
        role: "base",
      });
    }

    const skyline = Array.from({ length: 12 }, () => 0);
    const existingItems = new Map((existingBoard?.items ?? []).map((item) => [item.id, item]));
    for (const existingItem of existingItems.values()) {
      const position = existingItem.layouts.find((candidate) => candidate.layoutId === layoutId);
      if (!position) continue;
      for (let x = position.xOffset; x < Math.min(12, position.xOffset + position.width); x++) {
        skyline[x] = Math.max(skyline[x] ?? 0, position.yOffset + position.height);
      }
    }

    for (const kind of family.kinds) {
      for (const { width, height } of WIDGET_UI_AUDIT_SIZES) {
        const itemId = getItemId(family.id, kind, width, height);
        const existingItem = existingItems.get(itemId);
        const existingPosition = existingItem?.layouts.find((candidate) => candidate.layoutId === layoutId);
        const placement = existingPosition
          ? { xOffset: existingPosition.xOffset, yOffset: existingPosition.yOffset }
          : getPlacement(skyline, width, height);
        if (existingPosition) {
          for (
            let x = existingPosition.xOffset;
            x < Math.min(12, existingPosition.xOffset + existingPosition.width);
            x++
          ) {
            skyline[x] = Math.max(skyline[x] ?? 0, existingPosition.yOffset + existingPosition.height);
          }
        }
        let options: Record<string, unknown> | undefined;
        if (kind === "customApi" || kind === "notebook" || !existingItem || !existingPosition) {
          options = getAuditOptions(kind, appId, customWidgetId, richDemoOptions);
        }
        if (!existingItem || !existingPosition) {
          if (!existingItem) {
            await db.insert(items).values({
              id: itemId,
              boardId,
              kind,
              options: options ? SuperJSON.stringify(options) : emptySuperJSON,
              advancedOptions: emptySuperJSON,
            });
          }
          if (!existingPosition) {
            await db.insert(itemLayouts).values({
              itemId,
              sectionId,
              layoutId,
              xOffset: placement.xOffset,
              yOffset: placement.yOffset,
              width: Math.min(width, 12),
              height,
            });
          }
        }
        if (existingItem && (kind === "customApi" || kind === "notebook") && options) {
          await db
            .update(items)
            .set({ options: SuperJSON.stringify(options) })
            .where(eq(items.id, itemId));
        }

        if (mockIntegrationId && widgetIntegrationSupport[kind]?.includes("mock")) {
          const existingIntegration = existingItem?.integrations?.some(
            (integration) => integration.integrationId === mockIntegrationId,
          );
          if (!existingIntegration) {
            await db.insert(integrationItems).values({ itemId, integrationId: mockIntegrationId });
          }
        }
        if (!existingItem) createdItems++;
      }
    }
  }

  for (const fixture of getWidgetUiAuditIsolatedAssistantMetadata()) {
    const existingBoard = await db.query.boards.findFirst({
      where: or(eq(boards.id, fixture.boardId), eq(boards.name, fixture.boardName)),
      with: { sections: true, layouts: true, items: { with: { layouts: true } } },
    });
    if (existingBoard && existingBoard.id !== fixture.boardId) {
      console.warn(`Skipping isolated Assistant audit board '${fixture.boardName}' because its name is already in use`);
      continue;
    }

    if (!existingBoard) {
      await db.insert(boards).values({
        id: fixture.boardId,
        name: fixture.boardName,
        isPublic: true,
        pageTitle: `Widget UI audit / ${WIDGET_UI_AUDIT_ASSISTANT_ISOLATED_FAMILY_NAME} / ${fixture.width}x${fixture.height}`,
        primaryColor: "#748FFC",
        secondaryColor: "#3BC9DB",
        opacity: 100,
        itemRadius: "lg",
      });
      createdBoards++;
    }

    const sectionId = `${fixture.boardId}-main`;
    const layoutId = `${fixture.boardId}-base`;
    if (!existingBoard?.sections.some((section) => section.id === sectionId)) {
      await db
        .insert(sections)
        .values({ id: sectionId, boardId: fixture.boardId, kind: "empty", xOffset: 0, yOffset: 0 });
    }
    if (!existingBoard?.layouts.some((layout) => layout.id === layoutId)) {
      await db.insert(layouts).values({
        id: layoutId,
        name: "Base",
        boardId: fixture.boardId,
        columnCount: 12,
        breakpoint: 768,
        role: "base",
      });
    }

    const existingItem = existingBoard?.items.find((item) => item.id === fixture.itemId);
    if (!existingItem) {
      await db.insert(items).values({
        id: fixture.itemId,
        boardId: fixture.boardId,
        kind: fixture.kind,
        options: emptySuperJSON,
        advancedOptions: emptySuperJSON,
      });
      createdItems++;
    }
    if (!existingItem?.layouts.some((layout) => layout.layoutId === layoutId)) {
      await db.insert(itemLayouts).values({
        itemId: fixture.itemId,
        sectionId,
        layoutId,
        xOffset: 0,
        yOffset: 0,
        width: fixture.width,
        height: fixture.height,
      });
    }
  }

  if (createdBoards > 0) {
    console.log(
      `Created ${createdBoards} widget UI audit boards with ${createdItems} size permutations through seeding process`,
    );
  } else if (createdItems > 0) {
    console.log(`Completed ${createdItems} missing widget UI audit size permutations through seeding process`);
  } else {
    console.log("Skipping widget UI audit boards as they already exist");
  }
};
