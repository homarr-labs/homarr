import path from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";

import { DB_CASING } from "@homarr/core/infrastructure/db/constants";

import * as schema from "../schema/sqlite";

test("worker integration aliases keep distinct origins and prevent deleting an attached connection", async () => {
  const connection = new BetterSqlite3(":memory:");
  connection.pragma("foreign_keys = ON");
  const database = drizzle(connection, { schema, casing: DB_CASING });

  try {
    migrate(drizzle(connection), { migrationsFolder: path.join(__dirname, "..", "migrations", "sqlite") });
    const insertConnection = connection.prepare(`
      INSERT INTO federation_connection (id, worker_id, name, public_key, encrypted_configuration)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertConnection.run("first", "worker-first", "First worker", '{"kty":"EC"}', "encrypted.first");
    insertConnection.run("second", "worker-second", "Second worker", '{"kty":"EC"}', "encrypted.second");
    expect(() => insertConnection.run("duplicate", "worker-first", "Duplicate", "{}", "encrypted.duplicate")).toThrow(
      /UNIQUE constraint failed/u,
    );

    const insertIntegration = connection.prepare("INSERT INTO integration (id, name, url, kind) VALUES (?, ?, ?, ?)");
    insertIntegration.run("first-alias", "Jellyfin", "https://first.example.test", "jellyfin");
    insertIntegration.run("second-alias", "Jellyfin", "https://second.example.test", "jellyfin");
    insertIntegration.run("duplicate-alias", "Duplicate", "https://first.example.test", "jellyfin");

    const insertOrigin = connection.prepare(`
      INSERT INTO integration_origin (integration_id, connection_id, remote_integration_id)
      VALUES (?, ?, ?)
    `);
    insertOrigin.run("first-alias", "first", "same-remote-id");
    insertOrigin.run("second-alias", "second", "same-remote-id");
    const aliases = await database.query.integrations.findMany({
      with: { origin: { with: { connection: true } } },
      orderBy: (table, { asc }) => asc(table.id),
    });
    expect(
      aliases
        .filter((alias) => alias.origin)
        .map((alias) => ({
          id: alias.id,
          remoteId: alias.origin?.remoteIntegrationId,
          workerId: alias.origin?.connection.workerId,
        })),
    ).toEqual([
      { id: "first-alias", remoteId: "same-remote-id", workerId: "worker-first" },
      { id: "second-alias", remoteId: "same-remote-id", workerId: "worker-second" },
    ]);
    expect(() => insertOrigin.run("duplicate-alias", "first", "same-remote-id")).toThrow(/UNIQUE constraint failed/u);
    expect(() => connection.prepare("DELETE FROM federation_connection WHERE id = 'first'").run()).toThrow(
      /FOREIGN KEY constraint failed/u,
    );

    connection.prepare("DELETE FROM integration WHERE id = 'first-alias'").run();
    expect(connection.prepare("SELECT integration_id FROM integration_origin").all()).toEqual([
      { integration_id: "second-alias" },
    ]);
    connection.prepare("DELETE FROM federation_connection WHERE id = 'first'").run();
    expect(connection.prepare("SELECT enabled, encrypted_configuration FROM federation_connection").get()).toEqual({
      enabled: 1,
      encrypted_configuration: "encrypted.second",
    });
  } finally {
    connection.close();
  }
});
