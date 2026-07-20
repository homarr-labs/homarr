import { parse } from "superjson";
import { expect } from "vitest";

import { BUNDLED_CUSTOM_WIDGETS, customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";

import type { Database } from "..";
import { eq } from "..";
import { seedDataAsync } from "../migrations/seed";
import { customWidgetDefinitions, customWidgetSecrets } from "../schema";

const expectedSeedIds = BUNDLED_CUSTOM_WIDGETS.map(({ id }) => id).toSorted();

const reconstructWidget = (definition: typeof customWidgetDefinitions.$inferSelect) =>
  customWidgetDefinitionSchema.parse({
    $schema: "homarr-custom-widget-v2",
    name: definition.name,
    ...(definition.description === null ? {} : { description: definition.description }),
    ...(definition.iconUrl === null ? {} : { iconUrl: definition.iconUrl }),
    sources: parse(definition.sources),
    requests: parse(definition.requests),
    optionsSchema: parse(definition.optionsSchema),
    defaultOptions: parse(definition.defaultOptions),
    template: definition.template,
  });

export const expectBundledCustomWidgetsSeeded = async (db: Database) => {
  const definitions = await db.query.customWidgetDefinitions.findMany({
    where: (table, { like }) => like(table.id, "seed-%"),
  });

  expect(definitions.map(({ id }) => id).toSorted()).toEqual(expectedSeedIds);
  expect(definitions.every(({ enabled }) => !enabled)).toBe(true);
  expect(definitions.every(({ creatorId }) => creatorId === null)).toBe(true);
  expect(await db.$count(customWidgetSecrets)).toBe(0);

  for (const definition of definitions) {
    const expected = BUNDLED_CUSTOM_WIDGETS.find(({ id }) => id === definition.id);
    expect(expected).toBeDefined();
    expect(reconstructWidget(definition)).toEqual(expected?.widget);
  }

  await db
    .update(customWidgetDefinitions)
    .set({ name: "User-edited dog facts", enabled: true })
    .where(eq(customWidgetDefinitions.id, "seed-dog-facts"));
  await db.delete(customWidgetDefinitions).where(eq(customWidgetDefinitions.id, "seed-currency-exchange"));

  await seedDataAsync(db);

  const reseededDefinitions = await db.query.customWidgetDefinitions.findMany({
    where: (table, { like }) => like(table.id, "seed-%"),
  });
  const editedDefinition = reseededDefinitions.find(({ id }) => id === "seed-dog-facts");
  const reseededCurrency = reseededDefinitions.find(({ id }) => id === "seed-currency-exchange");

  expect(reseededDefinitions.map(({ id }) => id).toSorted()).toEqual(expectedSeedIds);
  expect(editedDefinition).toMatchObject({ name: "User-edited dog facts", enabled: true, creatorId: null });
  expect(reseededDefinitions.filter(({ id }) => id !== "seed-dog-facts").every(({ enabled }) => !enabled)).toBe(true);
  if (!reseededCurrency) throw new Error("Currency Exchange seed was not restored");
  expect(reconstructWidget(reseededCurrency)).toEqual(
    BUNDLED_CUSTOM_WIDGETS.find(({ id }) => id === "seed-currency-exchange")?.widget,
  );
  expect(await db.$count(customWidgetSecrets)).toBe(0);
};
