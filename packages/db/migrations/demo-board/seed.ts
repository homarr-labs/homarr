import { stringify } from "superjson";

import { createId, generateResponsiveGridFor } from "@homarr/common";
import { headerPreferencesSchema } from "@homarr/validation/user";

import type { Database, InferInsertModel, SQL } from "../..";
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

// The caller commits this plan together with the new demo user and fixtures.
export const createDemoBoardWritePlanAsync = async (
  db: Database,
  seed: {
    userId: string;
    mockIntegrationId: string;
    apps: { id: string; name: string }[];
    statsIntegrations: { id: string; kind: string }[];
  },
): Promise<SQL[]> => {
  const { userId, mockIntegrationId, apps, statsIntegrations } = seed;
  const boardNames = new Set((await db.query.boards.findMany({ columns: { name: true } })).map(({ name }) => name));
  let name = "default";
  if (boardNames.has(name)) {
    name = "demo";
    let suffix = 2;
    while (boardNames.has(name)) {
      name = `demo-${suffix}`;
      suffix += 1;
    }
  }
  const customWidgetId = createId();
  const plan: SQL[] = [];
  plan.push(
    db
      .insert(customWidgetDefinitions)
      .values({
        id: customWidgetId,
        name: demoCustomWidget.name,
        description: demoCustomWidget.description ?? null,
        sources: stringify(demoCustomWidget.sources),
        requests: stringify(demoCustomWidget.requests),
        options: stringify(demoCustomWidget.options),
        template: demoCustomWidget.template,
        creatorId: userId,
        enabled: true,
      })
      .getSQL(),
  );
  const replacements: Record<string, string> = { __MOCK__: mockIntegrationId, __CUSTOM_WIDGET__: customWidgetId };
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
  plan.push(
    db
      .insert(boards)
      .values({ id: boardId, name, creatorId: userId, ...definition.board, opacity: 100 })
      .getSQL(),
  );
  const layoutId = createId();
  const responsiveLayouts: InferInsertModel<typeof layouts>[] = [
    { id: createId(), boardId, name: "Mobile", role: "mobile", breakpoint: 0, columnCount: 4 },
    { id: createId(), boardId, name: "Tablet", role: "custom", breakpoint: 600, columnCount: 6 },
  ];
  plan.push(
    db
      .insert(layouts)
      .values([
        { id: layoutId, boardId, name: "Base", role: "base", breakpoint: 1200, columnCount: 12 },
        ...responsiveLayouts,
      ])
      .getSQL(),
  );
  for (const [position, tab] of definition.tabs.entries()) {
    const sectionId = createId();
    plan.push(
      db
        .insert(sections)
        .values({ id: sectionId, boardId, kind: "empty", name: tab.name, xOffset: 0, yOffset: position })
        .getSQL(),
    );
    const positions: Parameters<typeof generateResponsiveGridFor>[0]["items"] = [];
    const smallScreenHeights = new Map<string, number>();
    for (const widget of tab.widgets) {
      const itemId = createId();
      if (widget.smallScreenHeight !== undefined) smallScreenHeights.set(itemId, widget.smallScreenHeight);
      plan.push(
        db
          .insert(items)
          .values({
            id: itemId,
            boardId,
            kind: widget.kind,
            options: stringify(replace(widget.options ?? {})),
          })
          .getSQL(),
      );
      plan.push(
        db
          .insert(itemLayouts)
          .values({
            itemId,
            sectionId,
            layoutId,
            xOffset: widget.xOffset,
            yOffset: widget.yOffset,
            width: widget.width,
            height: widget.height,
          })
          .getSQL(),
      );
      const integrationIds = widget.integrationIds?.map((id) => replace(id) as string) ?? [];
      if (widget.needsIntegration) integrationIds.push(mockIntegrationId);
      if (integrationIds.length > 0)
        plan.push(
          db
            .insert(integrationItems)
            .values(integrationIds.map((integrationId) => ({ itemId, integrationId })))
            .getSQL(),
        );
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
        const getWidgetForItem = (id: string) => {
          const widget = widgetsById.get(id);
          if (!widget) throw new Error(`Demo widget missing for item ${id}`);
          return widget;
        };
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
          const kind = getWidgetForItem(item.id).kind;
          const index = mobileOrder.indexOf(kind);
          if (index !== -1) return index;
          return 100 + item.yOffset * 12 + item.xOffset;
        };
        const mobileItems = positions
          .toSorted((a, b) => rank(a) - rank(b))
          .map((item) => {
            const widget = getWidgetForItem(item.id);
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
      plan.push(
        db
          .insert(itemLayouts)
          .values(
            projected.items.map((item) => ({
              itemId: item.id,
              layoutId: target.id,
              sectionId: item.sectionId,
              xOffset: item.xOffset,
              yOffset: item.yOffset,
              width: item.width,
              height: item.height,
            })),
          )
          .getSQL(),
      );
    }
  }
  plan.push(
    db
      .update(users)
      .set({
        homeBoardId: boardId,
        mobileHomeBoardId: boardId,
        headerPreferences: JSON.stringify(definition.headerPreferences),
      })
      .where(eq(users.id, userId))
      .getSQL(),
  );
  return plan;
};
