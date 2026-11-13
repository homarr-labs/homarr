import SuperJSON from "superjson";

import { createId } from "@homarr/common";
import { headerPreferencesSchema } from "@homarr/validation/user";

import type { Database } from "../..";
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
    await db
      .insert(layouts)
      .values({ id: layoutId, boardId, name: "Base", role: "base", breakpoint: 768, columnCount: 12 });
    for (const [position, tab] of proposal.tabs.entries()) {
      const sectionId = createId();
      await db
        .insert(sections)
        .values({ id: sectionId, boardId, kind: "empty", name: tab.name, xOffset: 0, yOffset: position });
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
