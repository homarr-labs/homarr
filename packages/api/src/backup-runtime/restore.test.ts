import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { createCipheriv, createDecipheriv, createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

import AdmZip from "adm-zip";
import { compareSync, hashSync } from "bcrypt";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { stringify } from "superjson";

import {
  backupLimits,
  createSqliteBackupDependencies,
  inspectLegacyBackupAsync,
  parseLegacyArchive,
  prepareLegacyBackupAsync,
  readBackupUploadAsync,
  sourceModels,
} from "./index";
import type { BackupEngine, SqlValue } from "./contracts";

const fixtureRoot = "/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode";
const migrations = resolve("packages/db/migrations/sqlite");
const sourceKey = "11".repeat(32);
const targetKey = "22".repeat(32);
const ownedDirectories: string[] = [];

afterEach(() => {
  for (const directory of ownedDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function freshDirectory() {
  const directory = mkdtempSync(join(fixtureRoot, "homarr-restore-regression-"));
  ownedDirectories.push(directory);
  return directory;
}

function migrateFixture(db: Database) {
  migrate(drizzle(db), { migrationsFolder: migrations });
}

function ciphertext(text: string) {
  const iv = Buffer.alloc(16, 7);
  const cipher = createCipheriv("aes-256-cbc", Buffer.from(sourceKey, "hex"), iv);
  return `${Buffer.concat([cipher.update(text), cipher.final()]).toString("hex")}.${iv.toString("hex")}`;
}

function exportFixture(db: Database, directory: string, encryptionKey?: string) {
  const snapshot = join(directory, "export.sqlite");
  db.query("VACUUM INTO ?").run(snapshot);
  const zip = new AdmZip();
  zip.addFile("db.sqlite", readFileSync(snapshot));
  zip.addFile(
    "metadata.json",
    Buffer.from(
      JSON.stringify({
        homarrVersion: "2.4.1",
        exportedAt: "2026-10-10T00:00:00.000Z",
        dbDialect: "sqlite",
        encryptionKey,
      }),
    ),
  );
  return zip.toBuffer();
}

function engineFixture(temporaryDirectory = freshDirectory()): BackupEngine {
  return createSqliteBackupDependencies({
    temporaryDirectory,
    migrationsFolder: migrations,
    targetKey,
    authorizeAsync: async () => {},
  }).engine;
}

test("Assistant-only current-schema SQLite export cannot prepare without its source encryption key", async () => {
  const directory = freshDirectory();
  const db = new Database(join(directory, "source.sqlite"));
  migrateFixture(db);
  db.query('INSERT INTO "assistant_configuration" (id, encrypted_headers) VALUES (?, ?)').run(
    "default",
    ciphertext('{"Authorization":"synthetic"}'),
  );
  const archive = exportFixture(db, directory);
  db.close();
  await expect(
    prepareLegacyBackupAsync(archive, {
      engine: engineFixture(),
      targetKey,
      authorizeAsync: async () => {},
    }),
  ).rejects.toMatchObject({ code: "source-key-required" });
});

test("preparation aborted while sealing rejects the snapshot handoff and disposes the copied database", async () => {
  const directory = freshDirectory();
  const db = new Database(join(directory, "source.sqlite"));
  migrateFixture(db);
  populateAllFamilies(db);
  const archive = exportFixture(db, directory, sourceKey);
  db.close();
  const sealStarted = Promise.withResolvers<void>();
  const releaseSeal = Promise.withResolvers<void>();
  const copyDirectory = freshDirectory();
  const engine = engineFixture(copyDirectory);
  const createCopy = engine.createCopyAsync;
  let disposed = false;
  engine.createCopyAsync = async (bytes, signal) => {
    const copy = await createCopy(bytes, signal);
    const seal = copy.sealAsync.bind(copy);
    const dispose = copy.disposeAsync.bind(copy);
    copy.sealAsync = async () => {
      sealStarted.resolve();
      await releaseSeal.promise;
      return seal();
    };
    copy.disposeAsync = async () => {
      await dispose();
      disposed = true;
    };
    return copy;
  };
  const controller = new AbortController();
  const preparation = prepareLegacyBackupAsync(
    archive,
    { engine, targetKey, authorizeAsync: async () => {} },
    { signal: controller.signal },
  );
  await sealStarted.promise;
  controller.abort();
  releaseSeal.resolve();
  await expect(preparation).rejects.toMatchObject({ code: "cancelled" });
  expect(disposed).toBe(true);
  expect(readdirSync(copyDirectory)).toEqual([]);
});

function populateAllFamilies(db: Database) {
  const serialized = stringify({ date: new Date("2026-10-10T00:00:00.000Z"), value: 9007199254740993n });
  const password = hashSync("disposable-password", 4);
  const rows: Record<string, Record<string, SqlValue>> = {
    user: {
      id: "user-1",
      name: "Disposable",
      password,
      provider: "credentials",
      home_board_id: "board-1",
      mobile_home_board_id: "board-1",
      default_search_engine_id: "search-1",
    },
    account: {
      user_id: "user-1",
      type: "oidc",
      provider: "oidc",
      provider_account_id: "linked-identity",
      access_token: "disposable-provider-token",
    },
    session: { session_token: "obsolete-session", user_id: "user-1", expires: 1791676800000 },
    verificationToken: { identifier: "disposable", token: "obsolete-token", expires: 1791676800000 },
    apiKey: { id: "key-1", api_key: "disposable-api-key", user_id: "user-1" },
    group: {
      id: "group-1",
      name: "everyone",
      owner_id: "user-1",
      home_board_id: "board-1",
      mobile_home_board_id: "board-1",
      position: 0,
    },
    groupMember: { group_id: "group-1", user_id: "user-1" },
    groupPermission: { group_id: "group-1", permission: "admin" },
    invite: { id: "invite-1", token: "disposable-invite", expiration_date: 1791676800, creator_id: "user-1" },
    boardUserPermission: { board_id: "board-1", user_id: "user-1", permission: "full" },
    boardGroupPermission: { board_id: "board-1", group_id: "group-1", permission: "view" },
    integrationUserPermission: { integration_id: "integration-1", user_id: "user-1", permission: "full" },
    integrationGroupPermissions: { integration_id: "integration-1", group_id: "group-1", permission: "use" },
    board: { id: "board-1", name: "Preserved board", creator_id: "user-1" },
    section: {
      id: "section-1",
      board_id: "board-1",
      kind: "container",
      name: "Container",
      options: stringify({}),
    },
    item: {
      id: "item-1",
      board_id: "board-1",
      kind: "customApi",
      options: stringify({
        definitionId: "definition-1",
        configuration: {},
        configurationVersion: 1,
        refreshInterval: 30,
      }),
      advanced_options: serialized,
    },
    layout: { id: "layout-1", name: "Desktop", board_id: "board-1", column_count: 12 },
    item_layout: {
      item_id: "item-1",
      section_id: "section-1",
      layout_id: "layout-1",
      x_offset: 1,
      y_offset: 2,
      width: 3,
      height: 4,
    },
    section_layout: { section_id: "section-1", layout_id: "layout-1", x_offset: 0, y_offset: 0, width: 12, height: 10 },
    section_collapse_state: { user_id: "user-1", section_id: "section-1", collapsed: 1 },
    app: { id: "app-1", name: "Preserved app", icon_url: "/media/media-1", href: "https://example.invalid" },
    search_engine: {
      id: "search-1",
      icon_url: "/media/media-1",
      name: "Search",
      short: "search",
      integration_id: "integration-1",
    },
    icon: {
      id: "icon-1",
      name: "Preserved icon",
      url: "https://example.invalid/icon",
      checksum: "checksum",
      icon_repository_id: "repository-1",
    },
    iconRepository: { id: "repository-1", slug: "disposable" },
    integration: {
      id: "integration-1",
      name: "Integration",
      url: "https://example.invalid",
      kind: "adGuardHome",
      app_id: "app-1",
    },
    integrationSecret: {
      integration_id: "integration-1",
      kind: "apiKey",
      value: ciphertext("integration-value"),
      updated_at: 1791590400,
    },
    integration_item: { integration_id: "integration-1", item_id: "item-1" },
    custom_widget_v2_definition: {
      id: "definition-1",
      name: "V2",
      sources: stringify({
        default: { type: "integration", integrationKind: "adGuardHome", integrationId: "integration-1" },
        "source-1": { baseUrl: "https://example.invalid", networkScope: "public", auth: "bearer" },
      }),
      requests: stringify({}),
      options: stringify({}),
      template: "<Text>Preserved</Text>",
      creator_id: "user-1",
    },
    custom_widget_v2_secret: {
      definition_id: "definition-1",
      source_id: "source-1",
      kind: "apiKey",
      encrypted_value: ciphertext("v2-value"),
      updated_at: 1791590400,
    },
    custom_widget_definition: { id: "legacy-1", name: "Legacy", url: "https://example.invalid", creator_id: "user-1" },
    custom_widget_secret: {
      definition_id: "legacy-1",
      kind: "apiKey",
      value: ciphertext("legacy-value"),
      updated_at: 1791590400,
    },
    widget_secret: { item_id: "item-1", kind: "token", value: ciphertext("widget-value"), updated_at: 1791590400 },
    assistant_configuration: {
      id: "default",
      encrypted_api_key: ciphertext("assistant-api-key"),
      encrypted_headers: ciphertext('{"Authorization":"assistant-header"}'),
    },
    assistant_thread: { id: "thread-1", user_id: "user-1", title: "Preserved thread" },
    assistant_message: {
      id: "message-1",
      thread_id: "thread-1",
      format: "ai-sdk/v6",
      content: JSON.stringify({ role: "user", parts: [{ type: "text", text: "Preserved message" }] }),
    },
    media: {
      id: "media-1",
      name: "binary",
      content: new Uint8Array([0, 255, 17, 128, 0]),
      content_type: "application/octet-stream",
      size: 5,
      creator_id: "user-1",
    },
    serverSetting: { setting_key: "custom-preserved-setting", value: serialized },
    onboarding: { id: "onboarding-1", step: "finish", previous_step: "setup" },
    trusted_certificate_hostname: {
      hostname: "example.invalid",
      thumbprint: "synthetic-thumbprint",
      certificate: "synthetic-certificate",
    },
    cron_job_configuration: { name: "iconUpdater", cron_expression: "0 0 * * 0", is_enabled: 0 },
  };
  db.exec("PRAGMA foreign_keys = ON");
  db.transaction(() => {
    db.exec("PRAGMA defer_foreign_keys = ON");
    for (const [table, row] of Object.entries(rows)) {
      db.query(
        `INSERT INTO "${table}" (${Object.keys(row)
          .map((key) => `"${key}"`)
          .join(", ")}) VALUES (${Object.keys(row)
          .map(() => "?")
          .join(", ")})`,
      ).run(...Object.values(row));
    }
    db.query('INSERT INTO "serverSetting" (setting_key, value) VALUES (?, ?)').run(
      "__onboarding_claim",
      "obsolete-claim",
    );
    db.query('INSERT INTO "assistant_message" (id, thread_id, parent_id, content) VALUES (?, ?, ?, ?)').run(
      "message-2",
      "thread-1",
      "message-1",
      "preserved-child",
    );
  })();
  return password;
}

function readPreparedSnapshot(bytes: Uint8Array) {
  const directory = freshDirectory();
  const path = join(directory, "prepared.sqlite");
  writeFileSync(path, bytes);
  return new Database(path, { readonly: true });
}

function decryptTarget(value: string) {
  const [data, iv] = value.split(".");
  if (!data || !iv) throw new Error("missing fixture ciphertext");
  const decipher = createDecipheriv("aes-256-cbc", Buffer.from(targetKey, "hex"), Buffer.from(iv, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(data, "hex")), decipher.final()]).toString();
}

test("a genuine full-schema old-format export preserves all 40 families and raw values while converting six ciphertext columns and logging out", async () => {
  const directory = freshDirectory();
  const seed = new Database(":memory:");
  migrateFixture(seed);
  const password = populateAllFamilies(seed);
  const rows = Object.fromEntries(
    Object.values(sourceModels).map((table) => [table, seed.query(`SELECT * FROM "${table}" ORDER BY rowid`).all()]),
  );
  seed.close();
  const rowsPath = join(directory, "synthetic-rows.json");
  const sourcePath = join(directory, "source.sqlite");
  const archivePath = join(directory, "legacy-backup.zip");
  writeFileSync(rowsPath, stringify(rows), { flag: "wx", mode: 0o600 });
  const fixture = spawnSync(
    "node",
    [
      resolve("packages/api/src/backup-runtime/create-legacy-fixture.mjs"),
      sourcePath,
      migrations,
      archivePath,
      rowsPath,
    ],
    { env: { PATH: process.env.PATH ?? "/usr/bin:/bin" }, encoding: "utf8" },
  );
  if (fixture.status !== 0) {
    const diagnostic: unknown = JSON.parse(fixture.stderr);
    if (
      typeof diagnostic === "object" &&
      diagnostic !== null &&
      "name" in diagnostic &&
      typeof diagnostic.name === "string"
    )
      throw new Error(
        `Disposable legacy driver fixture failed: ${diagnostic.name}, ${"code" in diagnostic && typeof diagnostic.code === "string" ? diagnostic.code : "unknown-code"}, ${"phase" in diagnostic && typeof diagnostic.phase === "string" ? diagnostic.phase : "unknown-phase"}`,
      );
    throw new Error("Disposable legacy driver fixture failed");
  }
  const db = new Database(sourcePath, { readonly: true });
  const before = Object.fromEntries(
    Object.values(sourceModels).map((table) => [table, db.query(`SELECT * FROM "${table}" ORDER BY rowid`).all()]),
  );
  const originalLedger = db.query('SELECT * FROM "__drizzle_migrations" ORDER BY created_at').all();
  db.close();
  const archive = readFileSync(archivePath);
  const originalDatabase = createHash("sha256").update(readFileSync(sourcePath)).digest("hex");
  const originalArchive = createHash("sha256").update(archive).digest("hex");
  const copyDirectory = freshDirectory();
  const dependencies = createSqliteBackupDependencies({
    temporaryDirectory: copyDirectory,
    migrationsFolder: migrations,
    targetKey,
    authorizeAsync: async () => {},
  });
  const inspection = await inspectLegacyBackupAsync(archive, dependencies);
  expect(Object.keys(inspection.counts)).toHaveLength(40);
  expect(Object.values(inspection.counts).every((count) => count > 0)).toBe(true);
  expect(inspection.homeBoard).toEqual({ id: "board-1", name: "Preserved board" });
  expect(JSON.stringify(inspection)).not.toContain(sourceKey);
  expect(JSON.stringify(parseLegacyArchive(archive))).not.toContain(sourceKey);
  const prepared = await prepareLegacyBackupAsync(archive, dependencies, { selectedBoardId: "board-1" });
  expect(JSON.stringify(prepared)).not.toContain(sourceKey);
  prepared.withServerSnapshot(({ bytes }) => {
    const restored = readPreparedSnapshot(bytes);
    try {
      for (const table of Object.values(sourceModels)) {
        if (
          [
            "session",
            "verificationToken",
            "integrationSecret",
            "widget_secret",
            "custom_widget_v2_secret",
            "custom_widget_secret",
            "assistant_configuration",
            "serverSetting",
          ].includes(table)
        )
          continue;
        expect(restored.query(`SELECT * FROM "${table}" ORDER BY rowid`).all()).toEqual(before[table] ?? []);
      }
      expect(restored.query('SELECT * FROM "session"').all()).toEqual([]);
      expect(restored.query('SELECT * FROM "verificationToken"').all()).toEqual([]);
      expect(
        restored.query('SELECT * FROM "serverSetting" WHERE setting_key = ?').get("__onboarding_claim"),
      ).toBeNull();
      expect(
        restored.query('SELECT * FROM "serverSetting" WHERE setting_key != ? ORDER BY rowid').all("__onboarding_claim"),
      ).toEqual(
        (before.serverSetting as Record<string, SqlValue>[]).filter((row) => row.setting_key !== "__onboarding_claim"),
      );
      const user = restored.query<{ password: string }, []>('SELECT password FROM "user"').get();
      expect(user?.password).toBe(password);
      expect(compareSync("disposable-password", user?.password ?? "")).toBe(true);
      const values: [string, string, string][] = [
        ["integrationSecret", "value", "integration-value"],
        ["widget_secret", "value", "widget-value"],
        ["custom_widget_v2_secret", "encrypted_value", "v2-value"],
        ["custom_widget_secret", "value", "legacy-value"],
        ["assistant_configuration", "encrypted_api_key", "assistant-api-key"],
        ["assistant_configuration", "encrypted_headers", '{"Authorization":"assistant-header"}'],
      ];
      for (const [table, column, expected] of values) {
        const row = restored.query<Record<string, string>, []>(`SELECT "${column}" FROM "${table}"`).get();
        expect(decryptTarget(row?.[column ?? ""] ?? "")).toBe(expected);
        const originalRows = before[table] ?? [];
        const restoredRows = restored
          .query<Record<string, SqlValue>, []>(`SELECT * FROM "${table}" ORDER BY rowid`)
          .all();
        const ciphertextColumns =
          table === "assistant_configuration" ? ["encrypted_api_key", "encrypted_headers"] : [column];
        const removeCiphertext = (record: unknown) =>
          Object.fromEntries(
            Object.entries(record as Record<string, unknown>).filter(([key]) => !ciphertextColumns.includes(key)),
          );
        expect(restoredRows.map(removeCiphertext)).toEqual(originalRows.map(removeCiphertext));
      }
      expect(restored.query("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(restored.query('SELECT * FROM "__drizzle_migrations"').all()).toHaveLength(49);
      expect(restored.query('SELECT * FROM "__drizzle_migrations" ORDER BY created_at').all()).toEqual(originalLedger);
    } finally {
      restored.close();
    }
  });
  expect(createHash("sha256").update(archive).digest("hex")).toBe(originalArchive);
  expect(createHash("sha256").update(readFileSync(sourcePath)).digest("hex")).toBe(originalDatabase);
  expect(readdirSync(copyDirectory)).toEqual([]);
  console.info(
    JSON.stringify({
      evidence: "disposable-current-backup-join",
      populatedFamilies: Object.keys(inspection.counts).length,
      sourceRows: Object.values(inspection.counts).reduce((total, count) => total + count, 0),
      ciphertextColumns: Object.keys(inspection.encryptedFields).length,
      ledgerEntries: originalLedger.length,
      sourceArchiveSha256: originalArchive,
      sourceDatabaseSha256: originalDatabase,
      originalDigestsUnchanged: true,
      copyDirectoryEmpty: true,
    }),
  );
});

test("current ZIP and legacy key-entry archives reject traversal, bombs, wrong dialect, corrupt same-key secrets, invalid board choice and denied access", async () => {
  const directory = freshDirectory();
  const db = new Database(join(directory, "source.sqlite"));
  migrateFixture(db);
  populateAllFamilies(db);
  const archive = exportFixture(db, directory, sourceKey);
  db.close();
  const keyEntryZip = new AdmZip(archive);
  keyEntryZip.addFile(
    "metadata.json",
    Buffer.from(JSON.stringify({ homarrVersion: "2.4.1", exportedAt: "2026-10-10T00:00:00Z", dbDialect: "sqlite" })),
  );
  keyEntryZip.addFile("encryption-key.txt", Buffer.from(`${sourceKey}\n`));
  const dependencies = { engine: engineFixture(), targetKey, authorizeAsync: async () => {} };
  expect(parseLegacyArchive(keyEntryZip.toBuffer()).carriesEncryptionKey).toBe(true);
  await prepareLegacyBackupAsync(keyEntryZip.toBuffer(), dependencies);
  await expect(
    prepareLegacyBackupAsync(archive, dependencies, { trustedSourceKey: "33".repeat(32) }),
  ).rejects.toMatchObject({ code: "key-conflict" });
  await expect(
    prepareLegacyBackupAsync(archive, dependencies, { selectedBoardId: "missing-board" }),
  ).rejects.toMatchObject({ code: "invalid-board" });
  await expect(
    prepareLegacyBackupAsync(archive, {
      ...dependencies,
      authorizeAsync: async () => {
        throw new Error("secret-detail-not-public");
      },
    }),
  ).rejects.toMatchObject({ code: "denied", message: "Backup denied" });
  const wrongDialect = new AdmZip(archive);
  wrongDialect.addFile(
    "metadata.json",
    Buffer.from(
      JSON.stringify({ homarrVersion: "2.4.1", exportedAt: "2026-10-10T00:00:00Z", dbDialect: "postgresql" }),
    ),
  );
  expect(() => parseLegacyArchive(wrongDialect.toBuffer())).toThrow("Backup unsupported-dialect");
  const bomb = new AdmZip(archive);
  bomb.addFile("metadata.json", Buffer.alloc(backupLimits.metadata + 1));
  expect(() => parseLegacyArchive(bomb.toBuffer())).toThrow("Backup too-large");
  const lyingSize = new AdmZip(archive);
  lyingSize.addFile("metadata.json", Buffer.alloc(backupLimits.metadata, 65));
  const lyingBytes = lyingSize.toBuffer();
  let zipOffset = 0;
  while (zipOffset + 4 <= lyingBytes.length) {
    const signature = lyingBytes.readUInt32LE(zipOffset);
    if (
      signature === 0x04034b50 &&
      lyingBytes.subarray(zipOffset + 30, zipOffset + 30 + lyingBytes.readUInt16LE(zipOffset + 26)).toString() ===
        "metadata.json"
    )
      lyingBytes.writeUInt32LE(1, zipOffset + 22);
    if (
      signature === 0x02014b50 &&
      lyingBytes.subarray(zipOffset + 46, zipOffset + 46 + lyingBytes.readUInt16LE(zipOffset + 28)).toString() ===
        "metadata.json"
    )
      lyingBytes.writeUInt32LE(1, zipOffset + 24);
    zipOffset++;
  }
  expect(() => parseLegacyArchive(lyingBytes)).toThrow("Backup invalid-archive");
  const traversal = new AdmZip(archive);
  traversal.addFile("additional.txt", Buffer.from("disposable"));
  const traversalBytes = traversal.toBuffer();
  const originalName = Buffer.from("additional.txt");
  let offset = traversalBytes.indexOf(originalName);
  while (offset >= 0) {
    Buffer.from("../escape_.txt").copy(traversalBytes, offset);
    offset = traversalBytes.indexOf(originalName, offset + originalName.length);
  }
  expect(() => parseLegacyArchive(traversalBytes)).toThrow("Backup invalid-archive");
  const sameKey = await prepareLegacyBackupAsync(archive, { ...dependencies, targetKey: sourceKey });
  sameKey.withServerSnapshot(({ bytes }) => {
    const restored = readPreparedSnapshot(bytes);
    const original = new AdmZip(archive).getEntry("db.sqlite")?.getData();
    if (!original) throw new Error("missing disposable snapshot");
    const source = readPreparedSnapshot(original);
    expect(restored.query('SELECT * FROM "integrationSecret"').all()).toEqual(
      source.query('SELECT * FROM "integrationSecret"').all(),
    );
    restored.close();
    source.close();
  });
  const corruptionEngine = engineFixture();
  const createCopy = corruptionEngine.createCopyAsync;
  corruptionEngine.createCopyAsync = async (bytes, signal) => {
    const copied = await createCopy(bytes, signal);
    copied.run('UPDATE "assistant_configuration" SET "encrypted_headers" = ?', ["bad.secret"]);
    return copied;
  };
  await expect(
    prepareLegacyBackupAsync(archive, { ...dependencies, engine: corruptionEngine, targetKey: sourceKey }),
  ).rejects.toMatchObject({ code: "invalid-ciphertext" });
  await expect(
    readBackupUploadAsync(
      new Request("http://fixture.invalid", {
        method: "POST",
        headers: { "content-length": String(backupLimits.multipart + 1) },
        body: "fixture",
      }),
    ),
  ).rejects.toMatchObject({ code: "too-large" });
  const sourceImage = new AdmZip(archive).getEntry("db.sqlite")?.getData();
  if (!sourceImage) throw new Error("Missing disposable source image");
  const incompatibleSources = [
    'CREATE TRIGGER "sqliteXrestore_probe" AFTER UPDATE ON "assistant_configuration" BEGIN UPDATE "board" SET "name" = "name"; END',
    'CREATE VIEW "restore_probe_view" AS SELECT "id" FROM "user"',
    "INSERT INTO \"__drizzle_migrations\" (hash, created_at) VALUES ('future-identity', 1790988595596)",
    'UPDATE "__drizzle_migrations" SET hash = \'modified-identity\' WHERE created_at = (SELECT MIN(created_at) FROM "__drizzle_migrations")',
  ];
  for (const mutation of incompatibleSources) {
    const sourceDirectory = freshDirectory();
    const sourcePath = join(sourceDirectory, "rejected-source.sqlite");
    writeFileSync(sourcePath, sourceImage, { flag: "wx", mode: 0o600 });
    const source = new Database(sourcePath);
    source.exec(mutation);
    const rejectedArchive = exportFixture(source, sourceDirectory, sourceKey);
    source.close();
    const archiveDigest = createHash("sha256").update(rejectedArchive).digest("hex");
    const sourceDigest = createHash("sha256").update(readFileSync(sourcePath)).digest("hex");
    const copyDirectory = freshDirectory();
    await expect(
      prepareLegacyBackupAsync(rejectedArchive, { ...dependencies, engine: engineFixture(copyDirectory) }),
    ).rejects.toMatchObject({ code: "unsupported-version" });
    expect(createHash("sha256").update(rejectedArchive).digest("hex")).toBe(archiveDigest);
    expect(createHash("sha256").update(readFileSync(sourcePath)).digest("hex")).toBe(sourceDigest);
    expect(readdirSync(copyDirectory)).toEqual([]);
  }
});

test("Custom JSX-only exports reject missing or wrong keys without changing source bytes", async () => {
  const directory = freshDirectory();
  const db = new Database(join(directory, "source.sqlite"));
  migrateFixture(db);
  db.query(
    'INSERT INTO "custom_widget_v2_definition" (id, name, sources, requests, options, template) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(
    "custom-1",
    "Custom",
    stringify({ default: { baseUrl: "https://example.invalid", networkScope: "public", auth: "bearer" } }),
    stringify({}),
    stringify({}),
    "<Text>Static</Text>",
  );
  db.query(
    'INSERT INTO "custom_widget_v2_secret" (definition_id, source_id, kind, encrypted_value, updated_at) VALUES (?, ?, ?, ?, ?)',
  ).run("custom-1", "default", "apiKey", ciphertext("custom-only"), 1791590400);
  const archive = exportFixture(db, directory);
  const digest = createHash("sha256").update(archive).digest("hex");
  const dependencies = { engine: engineFixture(), targetKey, authorizeAsync: async () => {} };
  await expect(prepareLegacyBackupAsync(archive, dependencies)).rejects.toMatchObject({ code: "source-key-required" });
  await expect(
    prepareLegacyBackupAsync(archive, dependencies, { trustedSourceKey: "33".repeat(32) }),
  ).rejects.toMatchObject({ code: "invalid-ciphertext" });
  const prepared = await prepareLegacyBackupAsync(archive, dependencies, { trustedSourceKey: sourceKey });
  prepared.withServerSnapshot(({ bytes }) => {
    const restored = readPreparedSnapshot(bytes);
    const row = restored
      .query<{ encrypted_value: string }, []>('SELECT encrypted_value FROM "custom_widget_v2_secret"')
      .get();
    expect(decryptTarget(row?.encrypted_value ?? "")).toBe("custom-only");
    restored.close();
  });
  expect(createHash("sha256").update(archive).digest("hex")).toBe(digest);
  db.close();
});

test("content migration cannot seal a copy containing undecryptable target-key secrets", async () => {
  const directory = freshDirectory();
  const db = new Database(join(directory, "source.sqlite"));
  migrateFixture(db);
  populateAllFamilies(db);
  const archive = exportFixture(db, directory, sourceKey);
  db.close();
  const copyDirectory = freshDirectory();
  const engine = engineFixture(copyDirectory);
  const migrateContent = engine.migrateContentAsync;
  engine.migrateContentAsync = async (copy, signal) => {
    await migrateContent(copy, signal);
    copy.run('UPDATE "assistant_configuration" SET "encrypted_api_key" = ?', ["invalid-after-migration"]);
  };
  await expect(
    prepareLegacyBackupAsync(archive, { engine, targetKey, authorizeAsync: async () => {} }),
  ).rejects.toMatchObject({ code: "invalid-ciphertext" });
  expect(readdirSync(copyDirectory)).toEqual([]);
  const migrationDirectory = freshDirectory();
  const migrationFailure = engineFixture(migrationDirectory);
  const migrateBeforeFailure = migrationFailure.migrateContentAsync;
  migrationFailure.migrateContentAsync = async (copy, signal) => {
    await migrateBeforeFailure(copy, signal);
    throw new Error("Synthetic migration interruption");
  };
  await expect(
    prepareLegacyBackupAsync(archive, { engine: migrationFailure, targetKey, authorizeAsync: async () => {} }),
  ).rejects.toMatchObject({ code: "migration-failed" });
  expect(readdirSync(migrationDirectory)).toEqual([]);
  const sealingDirectory = freshDirectory();
  const sealFailure = engineFixture(sealingDirectory);
  const createCopy = sealFailure.createCopyAsync;
  sealFailure.createCopyAsync = async (bytes, signal) => {
    const copy = await createCopy(bytes, signal);
    const seal = copy.sealAsync.bind(copy);
    copy.sealAsync = async () => {
      await seal();
      throw new Error("Synthetic sealed-snapshot interruption");
    };
    return copy;
  };
  await expect(
    prepareLegacyBackupAsync(archive, { engine: sealFailure, targetKey, authorizeAsync: async () => {} }),
  ).rejects.toMatchObject({ code: "invalid-database" });
  expect(readdirSync(sealingDirectory)).toEqual([]);
});

test("a source-scoped Custom JSX secret cannot be prepared with a missing serialized source reference", async () => {
  const directory = freshDirectory();
  const db = new Database(join(directory, "source.sqlite"));
  migrateFixture(db);
  populateAllFamilies(db);
  db.query('UPDATE "custom_widget_v2_secret" SET source_id = ?').run("missing-source");
  const archive = exportFixture(db, directory, sourceKey);
  db.close();
  await expect(
    prepareLegacyBackupAsync(archive, { engine: engineFixture(), targetKey, authorizeAsync: async () => {} }),
  ).rejects.toMatchObject({ code: "invalid-reference" });
});
