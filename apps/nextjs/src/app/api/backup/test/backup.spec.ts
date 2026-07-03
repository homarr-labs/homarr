import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

import AdmZip from "adm-zip";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DB_CASING } from "@homarr/core/infrastructure/db/constants";

const ALGORITHM = "aes-256-cbc";
const MIGRATIONS_FOLDER = "./packages/db/migrations/sqlite";

const generateHexKey = () => crypto.randomBytes(32).toString("hex");

const encryptWithKey = (text: string, keyHex: string): `${string}.${string}` => {
  const key = Buffer.from(keyHex, "hex");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${encrypted.toString("hex")}.${iv.toString("hex")}`;
};

const decryptWithKey = (value: `${string}.${string}`, keyHex: string): string => {
  const key = Buffer.from(keyHex, "hex");
  const [data, dataIv] = value.split(".") as [string, string];
  const iv = Buffer.from(dataIv, "hex");
  const encrypted = Buffer.from(data, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

const createTestDb = (dbPath: string) => {
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite, { casing: DB_CASING });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { db, sqlite };
};

describe("SQLite backup", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "homarr-backup-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("export ZIP structure", () => {
    it("should create a ZIP containing all required entries", () => {
      const dbPath = path.join(tmpDir, "db.sqlite");
      const { sqlite } = createTestDb(dbPath);

      const backupPath = path.join(tmpDir, "db.backup.sqlite");
      sqlite.pragma("wal_checkpoint(TRUNCATE)");
      sqlite.exec(`VACUUM INTO '${backupPath}'`);
      sqlite.close();

      const dbBuffer = fs.readFileSync(backupPath);
      const metadata = {
        homarrVersion: "test",
        exportedAt: new Date().toISOString(),
        dbDialect: "sqlite",
        encryptionKey: generateHexKey(),
      };

      const zip = new AdmZip();
      zip.addFile("db.sqlite", dbBuffer);
      zip.addFile("metadata.json", Buffer.from(JSON.stringify(metadata)));

      const zipPath = path.join(tmpDir, "backup.zip");
      zip.writeZip(zipPath);

      const readBack = new AdmZip(zipPath);
      const entryNames = readBack
        .getEntries()
        .map((e) => e.entryName)
        .toSorted();
      expect(entryNames).toEqual(["db.sqlite", "metadata.json"]);

      const dbEntry = readBack.getEntry("db.sqlite");
      expect(dbEntry).toBeDefined();
      expect(dbEntry?.header.size).toBeGreaterThan(0);
    });

    it("should produce a valid SQLite database in the ZIP", () => {
      const dbPath = path.join(tmpDir, "db.sqlite");
      const { sqlite } = createTestDb(dbPath);

      const backupPath = path.join(tmpDir, "db.backup.sqlite");
      sqlite.exec(`VACUUM INTO '${backupPath}'`);
      sqlite.close();

      const backupDb = new Database(backupPath, { readonly: true });
      const tables = backupDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as {
        name: string;
      }[];

      expect(tables.map((t) => t.name)).toContain("board");
      expect(tables.map((t) => t.name)).toContain("user");
      expect(tables.map((t) => t.name)).toContain("integrationSecret");

      backupDb.close();
    });
  });

  describe("import ZIP validation", () => {
    it("should detect missing required entries", () => {
      const zip = new AdmZip();
      zip.addFile("db.sqlite", Buffer.from("dummy"));

      const entries = zip.getEntries().map((e) => e.entryName);
      const required = ["db.sqlite", "metadata.json"];
      const missing = required.filter((name) => !entries.includes(name));

      expect(missing).toEqual(["metadata.json"]);
    });

    it("should accept valid backup ZIP with all entries", () => {
      const zip = new AdmZip();
      zip.addFile("db.sqlite", Buffer.from("dummy"));
      zip.addFile(
        "metadata.json",
        Buffer.from(JSON.stringify({ dbDialect: "sqlite", encryptionKey: generateHexKey() })),
      );

      const entries = zip.getEntries().map((e) => e.entryName);
      const required = ["db.sqlite", "metadata.json"];
      const missing = required.filter((name) => !entries.includes(name));

      expect(missing).toHaveLength(0);
    });

    it("should accept legacy backup ZIP with encryption-key.txt", () => {
      const zip = new AdmZip();
      zip.addFile("db.sqlite", Buffer.from("dummy"));
      zip.addFile("encryption-key.txt", Buffer.from(generateHexKey()));
      zip.addFile("metadata.json", Buffer.from(JSON.stringify({ dbDialect: "sqlite" })));

      const entries = zip.getEntries().map((e) => e.entryName);
      const required = ["db.sqlite", "metadata.json"];
      const missing = required.filter((name) => !entries.includes(name));

      expect(missing).toHaveLength(0);
    });
  });

  describe("secret re-encryption", () => {
    it("should re-encrypt secrets from old key to new key", () => {
      const dbPath = path.join(tmpDir, "db.sqlite");
      const { sqlite } = createTestDb(dbPath);

      const oldKey = generateHexKey();
      const newKey = generateHexKey();
      const plaintext = "my-secret-password";

      const encryptedValue = encryptWithKey(plaintext, oldKey);

      sqlite.exec(`
        INSERT INTO "integration" ("id", "name", "url", "kind")
        VALUES ('int-1', 'Test', 'http://test', 'adGuardHome')
      `);
      sqlite.exec(`
        INSERT INTO "integrationSecret" ("integration_id", "kind", "value", "updated_at")
        VALUES ('int-1', 'apiKey', '${encryptedValue}', ${Math.floor(Date.now() / 1000)})
      `);

      const decryptedBefore = decryptWithKey(encryptedValue, oldKey);
      expect(decryptedBefore).toBe(plaintext);

      const oldKeyBuf = Buffer.from(oldKey, "hex");
      const newKeyBuf = Buffer.from(newKey, "hex");

      const rows = sqlite.prepare('SELECT "integration_id", "kind", "value" FROM "integrationSecret"').all() as {
        integration_id: string;
        kind: string;
        value: string;
      }[];

      const updateStmt = sqlite.prepare(
        'UPDATE "integrationSecret" SET "value" = ? WHERE "integration_id" = ? AND "kind" = ?',
      );

      for (const row of rows) {
        const [data, dataIv] = row.value.split(".") as [string, string];
        const iv = Buffer.from(dataIv, "hex");
        const encrypted = Buffer.from(data, "hex");
        const decipher = crypto.createDecipheriv(ALGORITHM, oldKeyBuf, iv);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString();

        const newIv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, newKeyBuf, newIv);
        const newEncrypted = Buffer.concat([cipher.update(decrypted), cipher.final()]);
        const newValue = `${newEncrypted.toString("hex")}.${newIv.toString("hex")}`;

        updateStmt.run(newValue, row.integration_id, row.kind);
      }

      const updatedRow = sqlite
        .prepare('SELECT "value" FROM "integrationSecret" WHERE "integration_id" = ?')
        .get("int-1") as { value: string };

      const decryptedAfter = decryptWithKey(updatedRow.value as `${string}.${string}`, newKey);
      expect(decryptedAfter).toBe(plaintext);

      // The old key must no longer recover the plaintext. With AES-256-CBC this
      // usually fails PKCS7 padding validation (throws), but ~1/256 of the time the
      // wrong key yields valid padding and returns garbage instead of throwing, so
      // assert on the actual property (plaintext is unrecoverable) rather than throwing.
      let decryptedWithOldKey: string | null = null;
      try {
        decryptedWithOldKey = decryptWithKey(updatedRow.value as `${string}.${string}`, oldKey);
      } catch {
        // Expected for most wrong keys: padding validation fails.
      }
      expect(decryptedWithOldKey).not.toBe(plaintext);

      sqlite.close();
    });

    it("should skip re-encryption when keys match", () => {
      const dbPath = path.join(tmpDir, "db.sqlite");
      const { sqlite } = createTestDb(dbPath);

      const sameKey = generateHexKey();
      const plaintext = "my-secret";
      const encryptedValue = encryptWithKey(plaintext, sameKey);

      sqlite.exec(`
        INSERT INTO "integration" ("id", "name", "url", "kind")
        VALUES ('int-1', 'Test', 'http://test', 'adGuardHome')
      `);
      sqlite.exec(`
        INSERT INTO "integrationSecret" ("integration_id", "kind", "value", "updated_at")
        VALUES ('int-1', 'apiKey', '${encryptedValue}', ${Math.floor(Date.now() / 1000)})
      `);

      const rowBefore = sqlite
        .prepare('SELECT "value" FROM "integrationSecret" WHERE "integration_id" = ?')
        .get("int-1") as { value: string };

      expect(rowBefore.value).toBe(encryptedValue);

      const decrypted = decryptWithKey(rowBefore.value as `${string}.${string}`, sameKey);
      expect(decrypted).toBe(plaintext);

      sqlite.close();
    });
  });

  describe("VACUUM INTO consistency", () => {
    it("should produce a consistent copy via VACUUM INTO", () => {
      const dbPath = path.join(tmpDir, "db.sqlite");
      const { sqlite } = createTestDb(dbPath);

      sqlite.exec(`
        INSERT INTO "app" ("id", "name", "icon_url")
        VALUES ('app-1', 'TestApp', 'https://example.com/icon.png')
      `);

      const backupPath = path.join(tmpDir, "db.vacuum.sqlite");
      sqlite.pragma("wal_checkpoint(TRUNCATE)");
      sqlite.exec(`VACUUM INTO '${backupPath}'`);

      const backupDb = new Database(backupPath, { readonly: true });
      const app = backupDb.prepare('SELECT "name" FROM "app" WHERE "id" = ?').get("app-1") as
        | { name: string }
        | undefined;

      expect(app).toBeDefined();
      expect(app?.name).toBe("TestApp");

      backupDb.close();
      sqlite.close();
    });
  });

  describe("migration on imported DB", () => {
    it("should successfully migrate an imported database", () => {
      const sourcePath = path.join(tmpDir, "source.sqlite");
      const { sqlite: sourceDb } = createTestDb(sourcePath);

      sourceDb.exec(`
        INSERT INTO "board" ("id", "name", "is_public", "primary_color", "secondary_color", "opacity", "item_radius", "background_image_attachment", "background_image_repeat", "background_image_size", "disable_status")
        VALUES ('board-1', 'TestBoard', 0, '#fa5252', '#fd7e14', 100, 'lg', 'fixed', 'no-repeat', 'cover', 0)
      `);
      sourceDb.close();

      const importPath = path.join(tmpDir, "import.sqlite");
      fs.copyFileSync(sourcePath, importPath);

      const importDb = new Database(importPath);
      const drizzleDb = drizzle(importDb, { casing: DB_CASING });
      migrate(drizzleDb, { migrationsFolder: MIGRATIONS_FOLDER });

      const board = importDb.prepare('SELECT "name" FROM "board" WHERE "id" = ?').get("board-1") as
        | { name: string }
        | undefined;
      expect(board).toBeDefined();
      expect(board?.name).toBe("TestBoard");

      importDb.close();
    });
  });

  describe("encryption key validation", () => {
    it("should reject invalid hex keys", () => {
      const invalidKeys = ["short", "not-hex-at-all-this-is-invalid-key-that-is-sixty-four-char!", ""];
      const hexKeyRegex = /^[0-9a-fA-F]{64}$/;

      for (const key of invalidKeys) {
        expect(hexKeyRegex.test(key)).toBe(false);
      }
    });

    it("should accept valid 64-char hex keys", () => {
      const validKey = generateHexKey();
      const hexKeyRegex = /^[0-9a-fA-F]{64}$/;
      expect(hexKeyRegex.test(validKey)).toBe(true);
    });
  });
});
