import { test, expect } from "bun:test";
import { copyFile, mkdir, mkdtemp, readFile, rm, rmdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Database } from "bun:sqlite";
import { parse, stringify } from "superjson";
import { createSqliteCopyEngine } from "./copied-sqlite";

import { createPersistenceRuntime } from "./runtime";
import { configureDatabaseReference, db, withConfiguredDatabaseAsync, handleTransactionsAsync } from "./index";
import { isPostgresql } from "./collection";
import { createPostgresDb, createSharedDbConfig } from "@homarr/core/infrastructure/db";
import * as postgresqlSchema from "./schema/postgresql";
import type { HomarrDatabase } from "./driver";
import { users } from "./schema/sqlite";
import { groups, groupMembers } from "./schema/sqlite";
import { eq, is, SQL, sql } from "drizzle-orm";

const migrationFolder = fileURLToPath(new URL("./migrations/sqlite", import.meta.url));

test("the configured facade reports the actual PostgreSQL driver without connecting", async () => {
  const owner = createPostgresDb(createSharedDbConfig(postgresqlSchema), {
    host: "127.0.0.1",
    port: 1,
    database: "disposable-metadata",
    user: "disposable",
    password: "disposable",
    ssl: false,
  });
  const release = configureDatabaseReference({
    async runAsync(operation) {
      return operation(owner as unknown as HomarrDatabase);
    },
  });
  try {
    await withConfiguredDatabaseAsync(async () => {
      await Promise.resolve();
      expect(isPostgresql(db)).toBe(true);
      let selected = "none";
      await handleTransactionsAsync(db, {
        async handleAsync(_database, schema) {
          selected = "postgresql";
          expect(schema.users).toBe(postgresqlSchema.users);
          const subquery = _database
            .select({ total: _database.$count(schema.users).as("total") })
            .from(schema.users)
            .as("sq");
          expect(_database.select().from(subquery).toSQL()).toEqual({
            sql: 'select "total" from (select (select count(*) from "user") as "total" from "user") "sq"',
            params: [],
          });
          const source = _database
            .select({ groupId: sql<string>`'composition-group'`.as("group_id"), userId: schema.users.id })
            .from(schema.users);
          expect(_database.insert(schema.groupMembers).select(source).toSQL()).toEqual({
            sql: 'insert into "groupMember" ("group_id", "user_id") select \'composition-group\' as "group_id", "id" from "user"',
            params: [],
          });
          expect(() => Reflect.get(_database, "_")).toThrow("private");
          expect(Object.getOwnPropertyDescriptor(_database, "_")).toBeUndefined();
        },
        handleSync() {
          selected = "sqlite";
        },
      });
      expect(selected).toBe("postgresql");
      expect(() => Reflect.get(db, "$client")).toThrow("private");
    });
  } finally {
    release();
    await owner.$client.end();
  }
});

test("the configured database facade cannot materialize a handle outside tracked admission", async () => {
  const runtime = createPersistenceRuntime({
    engine: "sqlite",
    path: ":memory:",
    mode: "fresh",
    migrationsFolder: migrationFolder,
  });
  await runtime.openAsync();
  await runtime.migrateAsync();
  const release = configureDatabaseReference(runtime);
  try {
    expect(() => {
      void db.select();
    }).toThrow("admission");
    const retained = await withConfiguredDatabaseAsync(async () => {
      await Promise.resolve();
      db.insert(users).values({ id: "facade-admitted" }).run();
      const subquery = db
        .select({ total: db.$count(users).as("total") })
        .from(users)
        .as("facade_sq");
      expect(db.select().from(subquery).all()).toEqual([{ total: 1 }]);
      expect(db.insert(users).select(db.select().from(users)).toSQL().sql).toContain('insert into "user"');
      expect(() => Reflect.get(db, "$client")).toThrow("private");
      expect(Object.getOwnPropertyDescriptor(db, "session")).toBeUndefined();
      return { insert: db.with().insert(users).values({ id: "facade-escaped" }) };
    });
    await runtime.maintenanceAsync(() => {
      expect(() => retained.insert.run()).toThrow("no longer active");
      expect(() => {
        void db.select();
      }).toThrow("admission");
    });
    expect((await runtime.runAsync((database) => database.query.users.findMany())).map(({ id }) => id)).toEqual([
      "facade-admitted",
    ]);
  } finally {
    release();
    await runtime.closeAsync();
  }
});

const withCurrentSqliteImage = async (operation: (bytes: Uint8Array, directory: string) => Promise<void>) => {
  const directory = await mkdtemp(fileURLToPath(new URL("./test/persistence-boundary-", import.meta.url)));
  const path = `${directory}/source.sqlite`;
  const runtime = createPersistenceRuntime({
    engine: "sqlite",
    path: ":memory:",
    mode: "fresh",
    migrationsFolder: migrationFolder,
  });
  try {
    await runtime.openAsync();
    await runtime.migrateAsync();
    runtime.transactionSync((database) =>
      database.insert(users).values({ id: "boundary-user", name: "Original" }).run(),
    );
    await runtime.snapshotSqliteAsync(path);
    const bytes = await readFile(path);
    await operation(bytes, directory);
    expect(await readFile(path)).toEqual(bytes);
  } finally {
    await runtime.closeAsync();
    for (const suffix of ["", "-wal", "-shm", "-journal"]) await rm(`${path}${suffix}`, { force: true });
    await rmdir(directory);
  }
};

test("copied schema validation rejects a trigger whose name resembles SQLite internals without rewriting it", async () => {
  await withCurrentSqliteImage(async (bytes, directory) => {
    const engine = createSqliteCopyEngine({ temporaryDirectory: directory, migrationsFolder: migrationFolder });
    const copy = await engine.createCopyAsync(bytes);
    try {
      expect(copy.all("SELECT hash FROM __drizzle_migrations")).toHaveLength(49);
      copy.run(
        "CREATE TRIGGER sqliteXevil AFTER UPDATE ON user BEGIN UPDATE user SET name = 'changed-by-trigger' WHERE id = NEW.id; END",
      );
      await expect(
        engine.assertCompatibleAsync(
          { dbDialect: "sqlite", homarrVersion: "unknown", exportedAt: "2020-01-02T00:00:00Z" },
          copy,
        ),
      ).rejects.toThrow("schema object");
      expect(copy.all("SELECT name FROM sqlite_master WHERE type = 'trigger'")).toEqual([{ name: "sqliteXevil" }]);
      expect(copy.all("SELECT name FROM user WHERE id = 'boundary-user'")).toEqual([{ name: "Original" }]);
    } finally {
      await copy.disposeAsync();
    }
  });
});

test("copied compatibility bounds migration rows before materialization and rejects an oversized ledger", async () => {
  await withCurrentSqliteImage(async (bytes, directory) => {
    const engine = createSqliteCopyEngine({ temporaryDirectory: directory, migrationsFolder: migrationFolder });
    const copy = await engine.createCopyAsync(bytes);
    try {
      copy.run(
        "INSERT INTO __drizzle_migrations (hash, created_at) SELECT hash, created_at + 1000000000000 FROM __drizzle_migrations LIMIT 15",
      );
      let largestLedgerRead = 0;
      const read = copy.all.bind(copy);
      copy.all = (query, values) => {
        const rows = read(query, values);
        if (query.includes("FROM __drizzle_migrations")) largestLedgerRead = Math.max(largestLedgerRead, rows.length);
        return rows;
      };
      await expect(
        engine.assertCompatibleAsync(
          { dbDialect: "sqlite", homarrVersion: "unknown", exportedAt: "2020-01-02T00:00:00Z" },
          copy,
        ),
      ).rejects.toThrow("migration history");
      expect(largestLedgerRead).toBeLessThanOrEqual(50);
      expect(read("SELECT COUNT(*) AS count FROM __drizzle_migrations")).toEqual([{ count: 64 }]);
    } finally {
      await copy.disposeAsync();
    }
  });
});

test("admitted database handles and every retained query factory are revoked before maintenance", async () => {
  const runtime = createPersistenceRuntime({
    engine: "sqlite",
    path: ":memory:",
    mode: "fresh",
    migrationsFolder: migrationFolder,
  });
  await runtime.openAsync();
  await runtime.migrateAsync();
  try {
    const retained = await runtime.withDatabaseAsync(async (resource) => {
      if (resource.engine !== "sqlite") throw new Error("Expected SQLite fixture");
      const database = resource.database;
      await Promise.resolve();
      expect(() => Reflect.get(database, "$client")).toThrow("private");
      expect(() => Reflect.get(database, "session")).toThrow("private");
      expect(Object.getOwnPropertyDescriptor(database, "session")).toBeUndefined();
      database.with().insert(users).values({ id: "admitted-user", name: "Admitted" }).run();
      const current = database.$with("current_users").as((builder) => builder.select({ id: users.id }).from(users));
      const cteSelect = database.with(current).select({ id: current.id }).from(current);
      expect(cteSelect.all()).toEqual([{ id: "admitted-user" }]);
      expect(is(cteSelect.getSQL(), SQL)).toBe(true);
      expect(await database.$count(users)).toBe(1);
      expect(
        database
          .select({ total: database.$count(users).as("total") })
          .from(users)
          .all(),
      ).toEqual([{ total: 1 }]);
      expect(database.get<[number]>(sql`SELECT COUNT(*) AS count FROM ${users}`)).toEqual([1]);
      return {
        database,
        factory: database.with(),
        insert: database.insert(users).values({ id: "escaped-insert" }),
        prepared: database.insert(users).values({ id: "escaped-prepared" }).prepare(),
        relational: database.query.users.findMany(),
        relationalFactory: database.query.users,
        cteFactory: database.$with("later"),
        cteSelect,
        count: database.$count(users),
        countAlias: database.$count(users).as("total"),
        insertMethod: database.insert,
        transactionMethod: database.transaction,
        rows: await database.query.users.findMany(),
      };
    });
    await runtime.maintenanceAsync((resource) => {
      expect(() => retained.factory.insert(users).values({ id: "escaped-factory" }).run()).toThrow("no longer active");
      expect(() => retained.database.insert(users).values({ id: "escaped-handle" }).run()).toThrow("no longer active");
      expect(() => retained.insert.run()).toThrow("no longer active");
      expect(() => retained.prepared.run()).toThrow("no longer active");
      expect(() => retained.relational.execute()).toThrow("no longer active");
      expect(() => retained.relationalFactory.findMany()).toThrow("no longer active");
      expect(() => retained.cteFactory.as((builder) => builder.select().from(users))).toThrow("no longer active");
      expect(() => retained.cteSelect.all()).toThrow("no longer active");
      expect(() => {
        void retained.count.then(() => undefined);
      }).toThrow("no longer active");
      expect(() => {
        void Reflect.get(retained.countAlias, "sql");
      }).toThrow("no longer active");
      expect(() => retained.insertMethod(users)).toThrow("no longer active");
      expect(() => retained.transactionMethod(() => undefined)).toThrow("no longer active");
      if (resource.engine !== "sqlite") throw new Error("Expected SQLite fixture");
      expect(resource.database.select({ id: users.id }).from(users).all()).toEqual([{ id: "admitted-user" }]);
    });
    expect(retained.rows.map(({ id }) => id)).toEqual(["admitted-user"]);
  } finally {
    await runtime.closeAsync();
  }
});

test("active admitted SQLite queries compose count subqueries and insert-from-select without exposing internals", async () => {
  const runtime = createPersistenceRuntime({
    engine: "sqlite",
    path: ":memory:",
    mode: "fresh",
    migrationsFolder: migrationFolder,
  });
  await runtime.openAsync();
  await runtime.migrateAsync();
  try {
    runtime.transactionSync((database) => {
      database.insert(users).values({ id: "composition-user" }).run();
      database.insert(groups).values({ id: "composition-group", name: "Composition", position: 0 }).run();
    });
    const results = await Promise.allSettled([
      runtime.withDatabaseAsync((resource) => {
        if (resource.engine !== "sqlite") throw new Error("Expected SQLite fixture");
        const database = resource.database;
        const count = database.$count(users).as("total");
        const subquery = database.select({ total: count }).from(users).as("sq");
        const select = database.select().from(subquery);
        expect(() => Reflect.get(database, "_")).toThrow("private");
        expect(Object.getOwnPropertyDescriptor(database, "_")).toBeUndefined();
        expect(() => Reflect.get(subquery, "_")).toThrow("private");
        expect(Object.getOwnPropertyDescriptor(subquery, "_")).toBeUndefined();
        expect(() => Reflect.get(Reflect.get(count, "sql"), "session")).toThrow("private");
        return { rows: select.all(), select, subquery, count };
      }),
      runtime.withDatabaseAsync((resource) => {
        if (resource.engine !== "sqlite") throw new Error("Expected SQLite fixture");
        const database = resource.database;
        const source = database
          .select({ groupId: sql<string>`'composition-group'`.as("group_id"), userId: users.id })
          .from(users);
        const insert = database.insert(groupMembers).select(source);
        expect(() => Reflect.get(source, "_")).toThrow("private");
        expect(Object.getOwnPropertyDescriptor(source, "_")).toBeUndefined();
        expect(insert.run().changes).toBe(1);
        expect(
          database
            .insert(groupMembers)
            .select((builder) =>
              builder
                .select({ groupId: sql<string>`'composition-group'`.as("group_id"), userId: users.id })
                .from(users)
                .where(sql`false`),
            )
            .run().changes,
        ).toBe(0);
        return { rows: database.select().from(groupMembers).all(), insert, source };
      }),
    ]);
    expect(
      results.map((result) => (result.status === "fulfilled" ? result.value.rows : String(result.reason))),
    ).toEqual([[{ total: 1 }], [{ groupId: "composition-group", userId: "composition-user" }]]);
    const [selection, insertion] = results;
    if (selection.status !== "fulfilled" || insertion.status !== "fulfilled") throw new Error("Composition failed");
    await runtime.maintenanceAsync((resource) => {
      expect(() => selection.value.select.all()).toThrow("no longer active");
      expect(() => Reflect.get(selection.value.subquery, "_")).toThrow("no longer active");
      expect(() => Reflect.get(selection.value.count, "sql")).toThrow("no longer active");
      expect(() => insertion.value.insert.run()).toThrow("no longer active");
      expect(() => insertion.value.source.all()).toThrow("no longer active");
      if (resource.engine !== "sqlite") throw new Error("Expected SQLite fixture");
      expect(() => resource.database.select().from(selection.value.subquery)).toThrow("no longer active");
      expect(() => resource.database.insert(groupMembers).select(insertion.value.source)).toThrow("no longer active");
    });
  } finally {
    await runtime.closeAsync();
  }
});

test("a copied historical ledger upgrades through the real five content transformations and rejects a changed identity", async () => {
  const directory = await mkdtemp(fileURLToPath(new URL("./test/persistence-historical-", import.meta.url)));
  const original = `${directory}/original.sqlite`;
  const historicalMigrations = `${directory}/migrations`;
  const journal: { version: string; dialect: string; entries: { tag: string }[] } = JSON.parse(
    await readFile(`${migrationFolder}/meta/_journal.json`, "utf8"),
  );
  const entries = journal.entries.slice(0, 46);
  try {
    await mkdir(`${historicalMigrations}/meta`, { recursive: true });
    await writeFile(`${historicalMigrations}/meta/_journal.json`, JSON.stringify({ ...journal, entries }));
    for (const { tag } of entries)
      await copyFile(`${migrationFolder}/${tag}.sql`, `${historicalMigrations}/${tag}.sql`);
    const fixture = Bun.spawnSync(
      [
        "node",
        fileURLToPath(new URL("./test/create-legacy-copy-fixture.mjs", import.meta.url)),
        original,
        historicalMigrations,
        "historical",
      ],
      { env: { PATH: process.env.PATH, HOME: process.env.HOME }, stdout: "pipe", stderr: "pipe" },
    );
    expect(fixture.exitCode, fixture.stderr.toString()).toBe(0);
    const bytes = await readFile(original);
    const engine = createSqliteCopyEngine({ temporaryDirectory: directory, migrationsFolder: migrationFolder });
    const copy = await engine.createCopyAsync(bytes);
    const metadata = { dbDialect: "sqlite" as const, homarrVersion: "unknown", exportedAt: "2020-01-02T00:00:00Z" };
    try {
      await engine.assertCompatibleAsync(metadata, copy);
      await engine.migrateSchemaAsync(copy);
      expect(copy.all("SELECT hash FROM __drizzle_migrations")).toHaveLength(49);
      expect(() =>
        copy.transaction(() => {
          copy.run("UPDATE user SET name = ? WHERE id = ?", ["rolled-back", "copied-user"]);
          throw new Error("rollback-copy");
        }),
      ).toThrow("rollback-copy");
      expect(copy.all("SELECT name FROM user WHERE id = 'copied-user'")).toEqual([{ name: "Saved identity" }]);
      expect(
        copy.all("SELECT kind, value FROM integrationSecret WHERE integration_id = 'old-opnsense' ORDER BY kind"),
      ).toEqual([
        { kind: "password", value: "fixture.old-password" },
        { kind: "username", value: "fixture.old-user" },
      ]);
      await engine.migrateContentAsync(copy);
      expect(
        copy.all("SELECT kind, value FROM integrationSecret WHERE integration_id = 'old-opnsense' ORDER BY kind"),
      ).toEqual([
        { kind: "opnsenseApiKey", value: "fixture.old-user" },
        { kind: "opnsenseApiSecret", value: "fixture.old-password" },
      ]);
      expect(copy.all("SELECT id FROM integration WHERE id = 'old-github'")).toEqual([]);
      const options = copy.all("SELECT options FROM item WHERE id = 'old-release'")[0]?.options;
      expect(typeof options).toBe("string");
      const release = parse<{ repositories: { provider: string; providerUrl: string; repository: string }[] }>(
        String(options),
      );
      expect(
        release.repositories.map(({ provider, providerUrl, repository }) => ({ provider, providerUrl, repository })),
      ).toEqual([{ provider: "github", providerUrl: "http://127.0.0.1/disposable", repository: "fixture/repo" }]);
      const app = parse<Record<string, unknown>>(
        String(copy.all("SELECT options FROM item WHERE id = 'old-app'")[0]?.options),
      );
      expect(app).toEqual({ appId: "saved-reference", descriptionDisplayMode: "tooltip" });
      expect(copy.all("SELECT id, kind FROM section WHERE id = 'old-container'")).toEqual([
        { id: "old-container", kind: "container" },
      ]);
      expect(copy.all("PRAGMA foreign_key_check")).toEqual([]);
      const sealed = await copy.sealAsync();
      expect(sealed.dialect).toBe("sqlite");
      const reopened = await engine.createCopyAsync(sealed.bytes);
      try {
        await engine.assertCompatibleAsync(metadata, reopened);
      } finally {
        await reopened.disposeAsync();
      }
      expect(await readFile(original)).toEqual(bytes);
    } finally {
      await copy.disposeAsync();
    }
    const invalid = await engine.createCopyAsync(bytes);
    try {
      invalid.run(
        "UPDATE __drizzle_migrations SET hash = ? WHERE created_at = (SELECT MAX(created_at) FROM __drizzle_migrations)",
        ["unknown-future-identity"],
      );
      await expect(engine.assertCompatibleAsync(metadata, invalid)).rejects.toThrow("migration identity");
      await expect(engine.migrateSchemaAsync(invalid)).rejects.toThrow("compatibility");
    } finally {
      await invalid.disposeAsync();
    }
  } finally {
    for (const { tag } of entries) await rm(`${historicalMigrations}/${tag}.sql`, { force: true });
    await rm(`${historicalMigrations}/meta/_journal.json`, { force: true });
    await rmdir(`${historicalMigrations}/meta`);
    await rmdir(historicalMigrations);
    for (const suffix of ["", "-wal", "-shm", "-journal"]) await rm(`${original}${suffix}`, { force: true });
    await rmdir(directory);
  }
});

test("Bun persistence preserves legacy foreign-key rejection and membership deletion cascades", async () => {
  const runtime = createPersistenceRuntime({
    engine: "sqlite",
    path: ":memory:",
    mode: "fresh",
    migrationsFolder: migrationFolder,
  });
  await runtime.openAsync();
  await runtime.migrateAsync();
  try {
    expect((await runtime.checkReadinessAsync()).ready).toBe(true);
    expect(() =>
      runtime.transactionSync((database) =>
        database.insert(groupMembers).values({ groupId: "missing", userId: "missing" }).run(),
      ),
    ).toThrow();
    runtime.transactionSync((database) => {
      expect(database.insert(users).values({ id: "cascade-user" }).run().changes).toBe(1);
      expect(() =>
        database.transaction((nested) => {
          nested.insert(users).values({ id: "inner-user" }).run();
          nested.rollback();
        }),
      ).toThrow();
      database.insert(groups).values({ id: "cascade-group", name: "Cascade", position: 0 }).run();
      database.insert(groupMembers).values({ groupId: "cascade-group", userId: "cascade-user" }).run();
      database.delete(users).where(eq(users.id, "cascade-user")).run();
    });
    expect(await runtime.runAsync((database) => database.query.groupMembers.findMany())).toEqual([]);
    expect(await runtime.runAsync((database) => database.query.users.findMany())).toEqual([]);
  } finally {
    await runtime.closeAsync();
  }
});

test("snapshot maintenance drains admitted work and closes without accepting new writes", async () => {
  const directory = await mkdtemp(fileURLToPath(new URL("./test/persistence-snapshot-", import.meta.url)));
  const path = `${directory}/snapshot.sqlite`;
  const runtime = createPersistenceRuntime({
    engine: "sqlite",
    path: ":memory:",
    mode: "fresh",
    migrationsFolder: migrationFolder,
  });
  await runtime.openAsync();
  await runtime.migrateAsync();
  try {
    runtime.transactionSync((transaction) => transaction.insert(users).values({ id: "snapshot-user" }).run());
    const { promise, resolve } = Promise.withResolvers<void>();
    const admitted = runtime.runAsync(async (database) => {
      await promise;
      return database.query.users.findMany();
    });
    const snapshot = runtime.snapshotSqliteAsync(path);
    await expect(runtime.runAsync((database) => database.query.users.findMany())).rejects.toThrow("not ready");
    const closing = runtime.closeAsync();
    resolve();
    expect((await admitted).map(({ id }) => id)).toEqual(["snapshot-user"]);
    await snapshot;
    await closing;
    expect((await runtime.checkReadinessAsync()).ready).toBe(false);
    await expect(runtime.runAsync((database) => database.query.users.findMany())).rejects.toThrow("not ready");
    const restored = createPersistenceRuntime({
      engine: "sqlite",
      path,
      mode: "existing",
      migrationsFolder: migrationFolder,
    });
    try {
      await restored.openAsync();
      await restored.migrateAsync();
      expect((await restored.runAsync((database) => database.query.users.findMany())).map(({ id }) => id)).toEqual([
        "snapshot-user",
      ]);
    } finally {
      await restored.closeAsync();
    }
  } finally {
    await runtime.closeAsync();
    for (const suffix of ["", "-wal", "-shm", "-journal"]) await rm(`${path}${suffix}`, { force: true });
    await rmdir(directory);
  }
}, 1500);

test("a rejected asynchronous SQLite transaction cannot persist before or after its callback resumes", async () => {
  const runtime = createPersistenceRuntime({
    engine: "sqlite",
    path: ":memory:",
    mode: "fresh",
    migrationsFolder: migrationFolder,
  });
  await runtime.openAsync();
  await runtime.migrateAsync();
  try {
    const { promise: pending, resolve: resume } = Promise.withResolvers<void>();
    let continuation: Promise<void> = Promise.resolve();
    expect(() =>
      runtime.transactionSync((transaction) => {
        transaction.insert(users).values({ id: "before-await" }).run();
        const deferredInsert = transaction.with().insert(users).values({ id: "after-await" });
        const subquery = transaction
          .select({ total: transaction.$count(users).as("total") })
          .from(users)
          .as("rollback_sq");
        const deferredSelect = transaction.select().from(subquery);
        continuation = pending.then(() => {
          expect(() => deferredSelect.all()).toThrow("no longer active");
          deferredInsert.run();
        });
        return continuation;
      }),
    ).toThrow("cannot return a promise");
    resume();
    await expect(continuation).rejects.toThrow("no longer active");
    expect(await runtime.runAsync((database) => database.query.users.findMany())).toEqual([]);
  } finally {
    await runtime.closeAsync();
  }
});

test("copied current-source SQLite data survives Bun migration and reopen without seeding", async () => {
  const directory = await mkdtemp(fileURLToPath(new URL("./test/persistence-fixture-", import.meta.url)));
  const original = `${directory}/original.sqlite`;
  const copied = `${directory}/copied.sqlite`;
  try {
    const fixture = Bun.spawnSync(
      [
        "node",
        fileURLToPath(new URL("./test/create-legacy-copy-fixture.mjs", import.meta.url)),
        original,
        migrationFolder,
      ],
      { env: { PATH: process.env.PATH, HOME: process.env.HOME }, stdout: "pipe", stderr: "pipe" },
    );
    expect(fixture.exitCode, fixture.stderr.toString()).toBe(0);
    const legacy = new Database(original, { readonly: true });
    const ledger = legacy.query("SELECT hash, created_at FROM __drizzle_migrations ORDER BY id").all();
    legacy.close(true);
    await copyFile(original, copied);
    let runtime = createPersistenceRuntime({
      engine: "sqlite",
      path: copied,
      mode: "existing",
      migrationsFolder: migrationFolder,
    });
    try {
      await runtime.openAsync();
      await runtime.migrateAsync();
      expect(() =>
        runtime.transactionSync((database) =>
          database.insert(groupMembers).values({ groupId: "missing", userId: "missing" }).run(),
        ),
      ).toThrow();
      const inspect = () =>
        runtime.runAsync(async (database, tables) => ({
          users: await database.query.users.findMany(),
          groups: await database.query.groups.findMany(),
          members: await database.query.groupMembers.findMany(),
          boards: await database.query.boards.findMany(),
          media: await database.select().from(tables.medias),
          settings: await database.query.serverSettings.findMany(),
          integrationSecrets: await database.query.integrationSecrets.findMany(),
          widgetSecrets: await database.query.widgetSecrets.findMany(),
          legacySecrets: await database.query.legacyCustomWidgetSecrets.findMany(),
          customSecrets: await database.query.customWidgetSecrets.findMany(),
          assistant: await database.query.assistantConfigurations.findMany(),
        }));
      let saved = await inspect();
      expect(saved.users.map(({ id, password, openSearchInNewTab }) => ({ id, password, openSearchInNewTab }))).toEqual(
        [
          {
            id: "copied-user",
            password: "$2b$10$odRXt5e95kSQV5Axmk/FeO6GVOxuRQQ8NnRcBA78Wg4V3kZxPY68u",
            openSearchInNewTab: false,
          },
        ],
      );
      expect(saved.groups.map(({ id, name, position }) => ({ id, name, position }))).toEqual([
        { id: "copied-group", name: "Saved group", position: 7 },
      ]);
      expect(saved.members).toEqual([{ groupId: "copied-group", userId: "copied-user" }]);
      expect(saved.boards.map(({ id, creatorId }) => ({ id, creatorId }))).toEqual([
        { id: "copied-board", creatorId: "copied-user" },
      ]);
      expect(saved.media[0]?.content).toEqual(Buffer.from([0, 255, 17]));
      expect(saved.settings.find((setting) => setting.settingKey === "culture")?.value).toBe(
        stringify({ defaultLocale: "de", savedAt: new Date("2020-01-02T00:00:00Z") }),
      );
      expect(saved.integrationSecrets.map(({ value }) => value)).toEqual(["fixture.integration"]);
      expect(saved.widgetSecrets.map(({ value }) => value)).toEqual(["fixture.widget"]);
      expect(saved.legacySecrets.map(({ encryptedValue }) => encryptedValue)).toEqual(["fixture.legacy"]);
      expect(saved.customSecrets.map(({ sourceId, encryptedValue }) => ({ sourceId, encryptedValue }))).toEqual([
        { sourceId: "copied-source", encryptedValue: "fixture.custom" },
      ]);
      expect(
        saved.assistant.map(({ encryptedApiKey, encryptedHeaders }) => ({ encryptedApiKey, encryptedHeaders })),
      ).toEqual([{ encryptedApiKey: "fixture.assistant-key", encryptedHeaders: "fixture.assistant-headers" }]);
      await expect(runtime.snapshotSqliteAsync(original)).rejects.toThrow();
      await runtime.closeAsync();
      runtime = createPersistenceRuntime({
        engine: "sqlite",
        path: copied,
        mode: "existing",
        migrationsFolder: migrationFolder,
      });
      await runtime.openAsync();
      await runtime.migrateAsync();
      saved = await inspect();
      expect(saved.media[0]?.content).toEqual(Buffer.from([0, 255, 17]));
      const unchanged = new Database(original, { readonly: true });
      const persisted = new Database(copied, { readonly: true });
      try {
        expect(unchanged.query("SELECT hash, created_at FROM __drizzle_migrations ORDER BY id").all()).toEqual(ledger);
        expect(persisted.query("SELECT hash, created_at FROM __drizzle_migrations ORDER BY id").all()).toEqual(ledger);
        expect(persisted.query("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all()).toEqual(
          unchanged.query("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all(),
        );
      } finally {
        persisted.close(true);
        unchanged.close(true);
      }
    } finally {
      await runtime.closeAsync();
    }
  } finally {
    for (const filename of ["original.sqlite", "copied.sqlite"]) {
      for (const suffix of ["", "-wal", "-shm", "-journal"])
        await rm(`${directory}/${filename}${suffix}`, { force: true });
    }
    await rmdir(directory);
  }
});
