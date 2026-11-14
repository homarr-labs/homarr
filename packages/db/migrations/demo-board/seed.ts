import SuperJSON from "superjson";

import { createId, generateResponsiveGridFor } from "@homarr/common";
import { headerPreferencesSchema } from "@homarr/validation/user";

import type { Database, InferInsertModel } from "../..";
import { eq } from "../..";
import {
  boards,
  customWidgetDefinitions,
  integrationItems,
  itemLayouts,
  items,
  layouts,
  sections,
  users,
} from "../../schema";
import { demoBoard } from "./board";
import { demoCustomWidget } from "./custom-widget";

// Called only when the demo user is first created. Existing dashboards remain unchanged.
export const seedDemoBoardAsync = async (db: Database) => {
  const existing = await db.query.boards.findFirst({ where: (row) => eq(row.name, "default") });
  if (existing) return;
  const demo = await db.query.users.findFirst({ where: (row) => eq(row.name, "demo") });
  const integration = await db.query.integrations.findFirst({ where: (row) => eq(row.kind, "mock") });
  if (!demo || !integration) throw new Error("Demo board setup requires the demo user and integration first");
  const apps = await db.query.apps.findMany();
  let customWidget = await db.query.customWidgetDefinitions.findFirst({
    where: (row, { and }) => and(eq(row.name, demoCustomWidget.name), eq(row.creatorId, demo.id)),
  });
  if (!customWidget) {
    const definitionId = createId();
    await db.insert(customWidgetDefinitions).values({
      id: definitionId,
      name: demoCustomWidget.name,
      description: demoCustomWidget.description ?? null,
      sources: SuperJSON.stringify(demoCustomWidget.sources),
      requests: SuperJSON.stringify(demoCustomWidget.requests),
      options: SuperJSON.stringify(demoCustomWidget.options),
      template: demoCustomWidget.template,
      creatorId: demo.id,
      enabled: true,
    });
    customWidget = await db.query.customWidgetDefinitions.findFirst({ where: (row) => eq(row.id, definitionId) });
  }
  if (!customWidget) throw new Error("Demo Custom JSX definition was not created");
  const replacements: Record<string, string> = { __MOCK__: integration.id, __CUSTOM_WIDGET__: customWidget.id };
  const statsIntegrations = await db.query.integrations.findMany({
    where: (row) => eq(row.url, "https://demo.homarr.dev"),
  });
  for (const source of statsIntegrations) {
    if (source.kind === "mock") continue;
    replacements[`__STATS_${source.kind.toUpperCase().replace(/[^A-Z0-9]/g, "")}__`] = source.id;
  }
  for (const app of apps) replacements[`__APP_${app.name.toUpperCase().replace(/[^A-Z0-9]/g, "")}__`] = app.id;
  const replace = (value: unknown): unknown => {
    if (typeof value === "string") {
      let result = value;
      for (const [placeholder, actual] of Object.entries(replacements)) result = result.replaceAll(placeholder, actual);
      if (/__[A-Z_]+__/.test(result)) throw new Error(`Unresolved demo placeholder: ${result}`);
      return result;
    }
    if (Array.isArray(value)) return value.map(replace);
    if (value && typeof value === "object")
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, replace(child)]));
    return value;
  };
  const definition = demoBoard;
  headerPreferencesSchema.parse(definition.headerPreferences);
  for (const tab of definition.tabs) {
    for (const widget of tab.widgets) {
      replace(widget.options ?? {});
      for (const id of widget.integrationIds ?? []) replace(id);
    }
  }
  const boardId = createId();
  await db
    .insert(boards)
    .values({ id: boardId, name: "default", creatorId: demo.id, ...definition.board, opacity: 100 });
  const layoutId = createId();
  const responsiveLayouts: InferInsertModel<typeof layouts>[] = [
    { id: createId(), boardId, name: "Mobile", role: "mobile", breakpoint: 0, columnCount: 4 },
    { id: createId(), boardId, name: "Tablet", role: "custom", breakpoint: 600, columnCount: 6 },
  ];
  await db
    .insert(layouts)
    .values([
      { id: layoutId, boardId, name: "Base", role: "base", breakpoint: 1200, columnCount: 12 },
      ...responsiveLayouts,
    ]);
  for (const [position, tab] of definition.tabs.entries()) {
    const sectionId = createId();
    await db
      .insert(sections)
      .values({ id: sectionId, boardId, kind: "empty", name: tab.name, xOffset: 0, yOffset: position });
    const positions: Parameters<typeof generateResponsiveGridFor>[0]["items"] = [];
    const smallScreenHeights = new Map<string, number>();
    for (const widget of tab.widgets) {
      const itemId = createId();
      if (widget.smallScreenHeight !== undefined) smallScreenHeights.set(itemId, widget.smallScreenHeight);
      await db.insert(items).values({
        id: itemId,
        boardId,
        kind: widget.kind,
        options: SuperJSON.stringify(replace(widget.options ?? {})),
      });
      await db.insert(itemLayouts).values({
        itemId,
        sectionId,
        layoutId,
        xOffset: widget.xOffset,
        yOffset: widget.yOffset,
        width: widget.width,
        height: widget.height,
      });
      const integrationIds = widget.integrationIds?.map((id) => replace(id) as string) ?? [];
      if (widget.needsIntegration) integrationIds.push(integration.id);
      if (integrationIds.length > 0)
        await db.insert(integrationItems).values(integrationIds.map((integrationId) => ({ itemId, integrationId })));
      positions.push({
        id: itemId,
        type: "item",
        sectionId,
        xOffset: widget.xOffset,
        yOffset: widget.yOffset,
        width: widget.width,
        height: widget.height,
      });
    }
    for (const target of responsiveLayouts) {
      let projected = generateResponsiveGridFor({
        items: positions.map((item) => ({ ...item, height: smallScreenHeights.get(item.id) ?? item.height })),
        previousWidth: 12,
        width: target.columnCount,
        sectionId,
      });
      if (target.role === "mobile") {
        // Full-width data cards and two-up utilities avoid the old skinny mobile columns.
        const compactKinds = new Set([
          "app",
          "weather",
          "clock",
          "timer",
          "airQuality",
          "countdown",
          "timetable",
          "stockPrice",
        ]);
        let x = 0;
        let y = 0;
        let rowHeight = 0;
        const widgetsById = new Map(positions.map((item, index) => [item.id, tab.widgets[index]]));
        const mobileOrder = [
          "calendar",
          "weather",
          "clock",
          "timer",
          "airQuality",
          "bookmarks",
          "smartHome-controls",
          "assistant",
        ];
        const rank = (item: (typeof positions)[number]) => {
          if (tab.name !== "Home") return item.yOffset * 12 + item.xOffset;
          const kind = widgetsById.get(item.id)!.kind;
          const index = mobileOrder.indexOf(kind);
          if (index !== -1) return index;
          return 100 + item.yOffset * 12 + item.xOffset;
        };
        const mobileItems = [...positions]
          .sort((a, b) => rank(a) - rank(b))
          .map((item) => {
            const widget = widgetsById.get(item.id)!;
            let width = 4;
            if (compactKinds.has(widget.kind)) width = 2;
            let height = smallScreenHeights.get(item.id) ?? item.height;
            if (widget.kind === "clock") height = 2;
            if (widget.kind === "timer" || widget.kind === "airQuality") height = 1;
            if (widget.kind === "calendar") height = 3;
            if (x + width > 4) {
              y += rowHeight;
              x = 0;
              rowHeight = 0;
            }
            const placed = { ...item, xOffset: x, yOffset: y, width, height };
            x += width;
            rowHeight = Math.max(rowHeight, height);
            return placed;
          });
        projected = { ...projected, items: mobileItems };
      }
      if (projected.items.length === 0) continue;
      await db.insert(itemLayouts).values(
        projected.items.map((item) => ({
          itemId: item.id,
          layoutId: target.id,
          sectionId: item.sectionId,
          xOffset: item.xOffset,
          yOffset: item.yOffset,
          width: item.width,
          height: item.height,
        })),
      );
    }
  }
  await db
    .update(users)
    .set({
      homeBoardId: boardId,
      mobileHomeBoardId: boardId,
      headerPreferences: JSON.stringify(definition.headerPreferences),
    })
    .where(eq(users.id, demo.id));
  console.log("Created demo board with Home, Media and Systems tabs");
};
