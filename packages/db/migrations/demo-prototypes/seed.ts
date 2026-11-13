import SuperJSON from "superjson";

import { createId, generateResponsiveGridFor } from "@homarr/common";
import { headerPreferencesSchema } from "@homarr/validation/user";

import type { Database, InferInsertModel } from "../..";
import { eq } from "../..";
import { boards, integrationItems, itemLayouts, items, layouts, sections, users } from "../../schema";
import { getServerSettingByKeyAsync, updateServerSettingByKeyAsync } from "../../queries/server-setting";
import { demoPrototypeBoardName, demoPrototypes } from ".";
import { demoPrototypeTheme } from "./theme";

// Opt-in scratch data only: never replace an existing user's demo boards.
export const seedDemoPrototypesAsync = async (db: Database) => {
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
  const replacements: Record<string, string> = { __MOCK__: integration.id };
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
  for (const proposal of demoPrototypes) {
    headerPreferencesSchema.parse(proposal.headerPreferences);
    if (proposal.tabs.length !== 2) throw new Error(`Prototype ${proposal.key} needs exactly two tabs`);
    const name = demoPrototypeBoardName(proposal.key);
    const exists = await db.query.boards.findFirst({ where: (row) => eq(row.name, name) });
    if (exists) continue;
    const boardId = createId();
    await db.insert(boards).values({ id: boardId, name, creatorId: demo.id, ...proposal.board, opacity: 100 });
    const layoutId = createId();
    const responsiveLayouts: InferInsertModel<typeof layouts>[] = [];
    let baseBreakpoint = 768;
    if ("iteration" in proposal && proposal.iteration === 2) {
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
      for (const widget of tab.widgets) {
        const itemId = createId();
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
        if (widget.needsIntegration)
          await db.insert(integrationItems).values({ itemId, integrationId: integration.id });
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
          items: positions,
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
    console.log(`Created throwaway demo prototype ${proposal.key}: ${proposal.name}`);
  }
  const comparison = await db.query.boards.findFirst({
    where: (row) => eq(row.name, demoPrototypeBoardName("A")),
  });
  if (comparison) {
    await db
      .update(users)
      .set({ homeBoardId: comparison.id, mobileHomeBoardId: comparison.id })
      .where(eq(users.id, demo.id));
  }
};
