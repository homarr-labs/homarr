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
import { getServerSettingByKeyAsync, updateServerSettingByKeyAsync } from "../../queries/server-setting";
import { demoPrototypes } from ".";
import { demoPrototypeTheme } from "./theme";
import { demoShowcaseCustomWidget } from "./custom-widget";
import type { DemoPrototype } from "./types";

// The normal demo seed calls this for fresh users; scratch previews use a separate board name.
export const seedDemoShowcaseAsync = async (db: Database, boardName = "demo-prototype") => {
  const demo = await db.query.users.findFirst({ where: (row) => eq(row.name, "demo") });
  const integration = await db.query.integrations.findFirst({ where: (row) => eq(row.kind, "mock") });
  if (!demo || !integration) throw new Error("Prototype setup requires the normal demo seed first");
  const branding = await getServerSettingByKeyAsync(db, "branding");
  if (branding.themeId === "default" && branding.customTheme === null) {
    await updateServerSettingByKeyAsync(db, "branding", {
      ...branding,
      themeId: "custom",
      customTheme: demoPrototypeTheme,
    });
  }
  const apps = await db.query.apps.findMany();
  let customWidget = await db.query.customWidgetDefinitions.findFirst({
    where: (row, { and }) => and(eq(row.name, demoShowcaseCustomWidget.name), eq(row.creatorId, demo.id)),
  });
  if (!customWidget) {
    const definitionId = createId();
    await db.insert(customWidgetDefinitions).values({
      id: definitionId,
      name: demoShowcaseCustomWidget.name,
      description: demoShowcaseCustomWidget.description ?? null,
      sources: SuperJSON.stringify(demoShowcaseCustomWidget.sources),
      requests: SuperJSON.stringify(demoShowcaseCustomWidget.requests),
      options: SuperJSON.stringify(demoShowcaseCustomWidget.options),
      template: demoShowcaseCustomWidget.template,
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
      if (/__[A-Z_]+__/.test(result)) throw new Error(`Unresolved prototype placeholder: ${result}`);
      return result;
    }
    if (Array.isArray(value)) return value.map(replace);
    if (value && typeof value === "object")
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, replace(child)]));
    return value;
  };
  const proposals: DemoPrototype[] = demoPrototypes;
  for (const proposal of proposals) {
    headerPreferencesSchema.parse(proposal.headerPreferences);
    if (proposal.tabs.length !== 2) throw new Error(`Prototype ${proposal.key} needs exactly two tabs`);
    const name = boardName;
    const exists = await db.query.boards.findFirst({ where: (row) => eq(row.name, name) });
    if (exists) continue;
    for (const tab of proposal.tabs) {
      for (const widget of tab.widgets) {
        replace(widget.options ?? {});
        for (const id of widget.integrationIds ?? []) replace(id);
      }
    }
    const boardId = createId();
    await db.insert(boards).values({ id: boardId, name, creatorId: demo.id, ...proposal.board, opacity: 100 });
    const layoutId = createId();
    const responsiveLayouts: InferInsertModel<typeof layouts>[] = [];
    let baseBreakpoint = 768;
    if ((proposal.iteration ?? 0) >= 2) {
      baseBreakpoint = 1200;
      responsiveLayouts.push(
        { id: createId(), boardId, name: "Mobile", role: "mobile", breakpoint: 0, columnCount: 3 },
        { id: createId(), boardId, name: "Tablet", role: "custom", breakpoint: 600, columnCount: 6 },
      );
    }
    await db
      .insert(layouts)
      .values([
        { id: layoutId, boardId, name: "Base", role: "base", breakpoint: baseBreakpoint, columnCount: 12 },
        ...responsiveLayouts,
      ]);
    for (const [position, tab] of proposal.tabs.entries()) {
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
        const projected = generateResponsiveGridFor({
          items: positions.map((item) => ({ ...item, height: smallScreenHeights.get(item.id) ?? item.height })),
          previousWidth: 12,
          width: target.columnCount,
          sectionId,
        });
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
    console.log(`Created demo showcase: ${proposal.name}`);
  }
  const comparison = await db.query.boards.findFirst({
    where: (row) => eq(row.name, boardName),
  });
  if (comparison) {
    await db
      .update(users)
      .set({
        homeBoardId: comparison.id,
        mobileHomeBoardId: comparison.id,
        headerPreferences: JSON.stringify(demoPrototypes[0].headerPreferences),
      })
      .where(eq(users.id, demo.id));
  }
};
