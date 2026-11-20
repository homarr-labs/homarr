// @vitest-environment node

import { afterEach, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { integrations, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { SmartHomeCatalog } from "@homarr/integrations/types";
import { smartHomeCatalogRequestHandler } from "@homarr/request-handler/smart-home";

import { smartHomeRouter } from "../widgets/smart-home";

const catalog: SmartHomeCatalog = {
  areas: [
    { id: "bedroom", name: "Bedroom", floorId: null, icon: null, temperatureEntityId: null, humidityEntityId: null },
    { id: "office", name: "Office", floorId: null, icon: null, temperatureEntityId: null, humidityEntityId: null },
  ],
  floors: [],
  entities: [
    { id: "switch.fan", name: "Fan", domain: "switch", areaId: null, icon: null, deviceClass: null, hidden: false },
    {
      id: "light.desk",
      name: "Desk lamp",
      domain: "light",
      areaId: "office",
      icon: null,
      deviceClass: null,
      hidden: false,
    },
    {
      id: "light.bedside",
      name: "Bedside lamp",
      domain: "light",
      areaId: "bedroom",
      icon: null,
      deviceClass: null,
      hidden: false,
    },
    {
      id: "sensor.temperature",
      name: "Temperature",
      domain: "sensor",
      areaId: "bedroom",
      icon: null,
      deviceClass: "temperature",
      hidden: false,
    },
  ],
};

const createFixtureAsync = async () => {
  const db = createDb();
  await db.insert(users).values({ id: "user" });
  await db
    .insert(integrations)
    .values({ id: "ha", name: "Home Assistant", kind: "homeAssistant", url: "http://fixture.invalid" });
  const session: Session = {
    user: { id: "user", permissions: ["integration-use-all"], colorScheme: "light" },
    expires: new Date().toISOString(),
  };
  // Replace only the upstream request; exercise the real router and integration permission middleware.
  vi.spyOn(smartHomeCatalogRequestHandler, "handler").mockReturnValue({
    getDataAsync: async () => ({ data: catalog }),
  } as ReturnType<typeof smartHomeCatalogRequestHandler.handler>);
  return { db, caller: smartHomeRouter.createCaller({ db, session, deviceType: undefined }) };
};

afterEach(() => vi.restoreAllMocks());

test("pages sorted entity IDs while preserving the complete UI catalog", async () => {
  const { caller } = await createFixtureAsync();
  const first = await caller.searchCatalog({ integrationId: "ha", limit: 2 });
  expect(first.entities.map(({ id }) => id)).toEqual(["light.bedside", "light.desk"]);
  expect(first.total).toBe(4);
  expect(first.nextOffset).toBe(2);
  const second = await caller.searchCatalog({ integrationId: "ha", offset: first.nextOffset ?? undefined, limit: 2 });
  expect(second.entities.map(({ id }) => id)).toEqual(["sensor.temperature", "switch.fan"]);
  expect(second.nextOffset).toBeNull();
  expect((await caller.searchCatalog({ integrationId: "ha", offset: 10 })).entities).toEqual([]);
  expect(await caller.catalog({ integrationId: "ha" })).toEqual(catalog);
});

test("combines case-insensitive search with area and domain filters", async () => {
  const { caller } = await createFixtureAsync();
  const result = await caller.searchCatalog({
    integrationId: "ha",
    query: " LAMP ",
    domains: ["light"],
    areaIds: ["office"],
  });
  expect(result.entities.map(({ id }) => id)).toEqual(["light.desk"]);
  expect(result).toMatchObject({ total: 1, nextOffset: null, areas: catalog.areas, floors: catalog.floors });
  const empty = await caller.searchCatalog({ integrationId: "ha", domains: ["switch"], areaIds: ["office"] });
  expect(empty).toMatchObject({ entities: [], total: 0, nextOffset: null });
});

test("rejects out-of-bounds pages and inaccessible integrations", async () => {
  const { db, caller } = await createFixtureAsync();
  await expect(caller.searchCatalog({ integrationId: "ha", limit: 101 })).rejects.toMatchObject({
    code: "BAD_REQUEST",
  });
  await expect(caller.searchCatalog({ integrationId: "ha", offset: -1 })).rejects.toMatchObject({
    code: "BAD_REQUEST",
  });
  const anonymous = smartHomeRouter.createCaller({ db, session: null, deviceType: undefined });
  await expect(anonymous.searchCatalog({ integrationId: "ha" })).rejects.toMatchObject({ code: "FORBIDDEN" });
});
