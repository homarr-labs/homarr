import { describe, expect, test } from "vitest";

import { createId } from "@homarr/common";
import type { IntegrationKind } from "@homarr/definitions";

import type { Database } from "..";
import { eq } from "..";
import { seedDefaultIntegrationsAsync, seededDefaultIntegrationKindsKey } from "../migrations/seed";
import type { Integration } from "../schema";
import { boards, integrations, serverSettings } from "../schema";
import { createDb } from "./db-mock";

const candidate = (kind: IntegrationKind, name: string): Integration => ({
  id: "new",
  name,
  url: `https://${kind}.example`,
  kind,
  appId: null,
});

const scrutiny = candidate("scrutiny", "Scrutiny Default");
const traefik = candidate("traefik", "Traefik Default");

const kindsOf = async (database: ReturnType<typeof createDb>) =>
  (await database.query.integrations.findMany()).map((integration) => integration.kind).toSorted();

describe("default integration seed", () => {
  test("creates a default integration once and leaves it deleted after the next seed", async () => {
    const database = createDb();
    try {
      await seedDefaultIntegrationsAsync(database as unknown as Database, [scrutiny]);
      expect(await kindsOf(database)).toEqual(["scrutiny"]);

      await database.delete(integrations);
      await seedDefaultIntegrationsAsync(database as unknown as Database, [scrutiny]);

      expect(await kindsOf(database)).toEqual([]);
    } finally {
      database.$client.close();
    }
  });

  test("does not duplicate a kind that already exists, and does not restore it after deletion", async () => {
    const database = createDb();
    try {
      await database.insert(integrations).values({
        id: createId(),
        name: "Scrutiny",
        url: "http://scrutiny.local",
        kind: "scrutiny",
      });

      await seedDefaultIntegrationsAsync(database as unknown as Database, [scrutiny]);
      const saved = await database.query.integrations.findMany();
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({ name: "Scrutiny", url: "http://scrutiny.local" });

      await database.delete(integrations);
      await seedDefaultIntegrationsAsync(database as unknown as Database, [scrutiny]);
      expect(await kindsOf(database)).toEqual([]);
    } finally {
      database.$client.close();
    }
  });

  test("keeps removed defaults gone on an existing install and still seeds a kind added later", async () => {
    const database = createDb();
    try {
      await database.insert(boards).values({ id: createId(), name: "dashboard" });

      await seedDefaultIntegrationsAsync(database as unknown as Database, [scrutiny]);
      expect(await kindsOf(database)).toEqual([]);

      await seedDefaultIntegrationsAsync(database as unknown as Database, [scrutiny, traefik]);
      expect(await kindsOf(database)).toEqual(["traefik"]);

      await database.delete(integrations);
      await seedDefaultIntegrationsAsync(database as unknown as Database, [scrutiny, traefik]);
      expect(await kindsOf(database)).toEqual([]);
    } finally {
      database.$client.close();
    }
  });

  test("records the real startup candidates so a later migration does not recreate them", async () => {
    const database = createDb();
    try {
      await seedDefaultIntegrationsAsync(database as unknown as Database);
      const created = await kindsOf(database);

      await database.delete(integrations);
      await seedDefaultIntegrationsAsync(database as unknown as Database);

      expect(await kindsOf(database)).toEqual([]);
      const marker = await database.query.serverSettings.findFirst({
        where: eq(serverSettings.settingKey, seededDefaultIntegrationKindsKey),
      });
      expect(marker).toBeDefined();
      expect(JSON.parse(marker?.value ?? "")).toEqual(created);
    } finally {
      database.$client.close();
    }
  });
});
