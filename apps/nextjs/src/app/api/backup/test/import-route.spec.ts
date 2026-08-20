// @vitest-environment node

import fs from "fs";
import os from "os";
import path from "path";

import AdmZip from "adm-zip";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DB_CASING } from "@homarr/core/infrastructure/db/constants";

const routeMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  claimAllowed: vi.fn(),
  onboardingFindFirst: vi.fn(),
  dbEnv: {
    DRIVER: "better-sqlite3",
    URL: "",
  },
  commonEnv: {
    SECRET_ENCRYPTION_KEY: "1".repeat(64),
  },
}));

vi.mock("@homarr/auth/next", () => ({ auth: routeMocks.auth }));
vi.mock("@homarr/auth/server", () => ({ isProviderEnabled: () => false }));
vi.mock("@homarr/api/onboarding-claim", () => ({
  getOnboardingClaimTokenFromCookieHeader: () => "test-claim",
  isClaimOnlyOnboardingAccessAllowedAsync: routeMocks.claimAllowed,
}));
vi.mock("@homarr/common/env", () => ({ env: routeMocks.commonEnv }));
vi.mock("@homarr/core/infrastructure/db/env", () => ({ dbEnv: routeMocks.dbEnv }));
vi.mock("@homarr/db", () => ({
  db: {
    query: {
      onboarding: {
        findFirst: routeMocks.onboardingFindFirst,
      },
    },
  },
}));

import { POST } from "../import/route";

const MEBIBYTE = 1024 * 1024;
const MIGRATIONS_FOLDER = "./packages/db/migrations/sqlite";

const createMigratedDatabase = (databasePath: string, boardId: string, boardName: string) => {
  const sqlite = new Database(databasePath);
  migrate(drizzle(sqlite, { casing: DB_CASING }), { migrationsFolder: MIGRATIONS_FOLDER });
  sqlite.exec(`
    INSERT INTO "board" (
      "id", "name", "is_public", "primary_color", "secondary_color", "opacity", "item_radius",
      "background_image_attachment", "background_image_repeat", "background_image_size", "disable_status"
    ) VALUES (
      '${boardId}', '${boardName}', 0, '#fa5252', '#fd7e14', 100, 'lg', 'fixed', 'no-repeat', 'cover', 0
    )
  `);
  sqlite.close();
};

const createBackup = (directory: string, name: string, boardName: string) => {
  const sourcePath = path.join(directory, `${name}.sqlite`);
  createMigratedDatabase(sourcePath, `board-${name}`, boardName);

  const zip = new AdmZip();
  zip.addFile("db.sqlite", fs.readFileSync(sourcePath));
  zip.addFile(
    "metadata.json",
    Buffer.from(
      JSON.stringify({
        dbDialect: "sqlite",
        encryptionKey: routeMocks.commonEnv.SECRET_ENCRYPTION_KEY,
      }),
    ),
  );
  return zip.toBuffer();
};

const createImportRequest = (backup: Buffer) => {
  const formData = new FormData();
  formData.set("file", new File([Uint8Array.from(backup)], "homarr-backup.zip", { type: "application/zip" }));
  return new Request("http://homarr.test/api/backup/import", {
    method: "POST",
    body: formData,
  });
};

const readBoardNames = (databasePath: string) => {
  const sqlite = new Database(databasePath, { readonly: true });
  const rows = sqlite.prepare('SELECT "name" FROM "board" ORDER BY "name"').all() as { name: string }[];
  sqlite.close();
  return rows.map((row) => row.name);
};

describe("POST /api/backup/import", () => {
  let temporaryDirectory: string;
  let activeDatabasePath: string;

  beforeEach(() => {
    vi.useFakeTimers();
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "homarr-import-route-test-"));
    activeDatabasePath = path.join(temporaryDirectory, "db.sqlite");
    routeMocks.dbEnv.DRIVER = "better-sqlite3";
    routeMocks.dbEnv.URL = activeDatabasePath;
    routeMocks.auth.mockResolvedValue({ user: { permissions: ["admin"] } });
    routeMocks.claimAllowed.mockResolvedValue(false);
    routeMocks.onboardingFindFirst.mockResolvedValue({ step: "start" });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it("accepts the legacy import step through normalized onboarding claim access", async () => {
    createMigratedDatabase(activeDatabasePath, "board-current", "Current board");
    const backup = createBackup(temporaryDirectory, "legacy", "Restored board");
    routeMocks.auth.mockResolvedValue(null);
    routeMocks.claimAllowed.mockResolvedValue(true);
    routeMocks.onboardingFindFirst.mockResolvedValue({ step: "import" });

    const response = await POST(createImportRequest(backup));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      restartAfterMs: 500,
      homeBoardName: "Restored board",
    });
    expect(readBoardNames(activeDatabasePath)).toEqual(["Restored board"]);
  });

  it("rejects an oversized declared upload before reading its body", async () => {
    const originalDatabase = Buffer.from("active database remains untouched");
    fs.writeFileSync(activeDatabasePath, originalDatabase);
    const request = new Request("http://homarr.test/api/backup/import", {
      method: "POST",
      headers: {
        "content-length": String(258 * MEBIBYTE),
        "content-type": "multipart/form-data; boundary=oversized",
      },
      body: "--oversized--\r\n",
    });

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(fs.readFileSync(activeDatabasePath)).toEqual(originalDatabase);
  });

  it("rejects an oversized uncompressed SQLite entry without replacing the active database", async () => {
    const originalDatabase = Buffer.from("active database remains untouched");
    fs.writeFileSync(activeDatabasePath, originalDatabase);
    const zip = new AdmZip();
    zip.addFile("db.sqlite", Buffer.from("small compressed payload"));
    zip.addFile("metadata.json", Buffer.from('{"dbDialect":"sqlite"}'));
    const databaseEntry = zip.getEntry("db.sqlite");
    if (!databaseEntry) throw new Error("Expected database entry");
    databaseEntry.header.size = 513 * MEBIBYTE;

    const response = await POST(createImportRequest(zip.toBuffer()));

    expect(response.status).toBe(413);
    expect(fs.readFileSync(activeDatabasePath)).toEqual(originalDatabase);
  });

  it("rejects an oversized uncompressed archive before extracting any entry", async () => {
    const originalDatabase = Buffer.from("active database remains untouched");
    fs.writeFileSync(activeDatabasePath, originalDatabase);
    const zip = new AdmZip();
    zip.addFile("db.sqlite", Buffer.from("small compressed payload"));
    zip.addFile("metadata.json", Buffer.from('{"dbDialect":"sqlite"}'));
    zip.addFile("unexpected.bin", Buffer.from("small compressed payload"));
    const unexpectedEntry = zip.getEntry("unexpected.bin");
    if (!unexpectedEntry) throw new Error("Expected oversized test entry");
    unexpectedEntry.header.size = 515 * MEBIBYTE;

    const response = await POST(createImportRequest(zip.toBuffer()));

    expect(response.status).toBe(413);
    expect(fs.readFileSync(activeDatabasePath)).toEqual(originalDatabase);
  });

  it("uses and cleans a unique temporary directory for every restore", async () => {
    createMigratedDatabase(activeDatabasePath, "board-current", "Current board");
    const createdDirectories: string[] = [];
    const makeTemporaryDirectory = fs.mkdtempSync.bind(fs);
    vi.spyOn(fs, "mkdtempSync").mockImplementation((prefix, options) => {
      const directory = makeTemporaryDirectory(prefix, options);
      createdDirectories.push(directory);
      return directory;
    });

    const firstResponse = await POST(createImportRequest(createBackup(temporaryDirectory, "first", "First restore")));
    const secondResponse = await POST(
      createImportRequest(createBackup(temporaryDirectory, "second", "Second restore")),
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(new Set(createdDirectories).size).toBe(2);
    expect(createdDirectories.every((directory) => !fs.existsSync(directory))).toBe(true);
    expect(readBoardNames(activeDatabasePath)).toEqual(["Second restore"]);
  });

  it("keeps a successful restore response when temporary directory cleanup fails", async () => {
    createMigratedDatabase(activeDatabasePath, "board-current", "Current board");
    const backup = createBackup(temporaryDirectory, "cleanup-failure", "Restored despite cleanup failure");
    const removeDirectory = fs.rmSync.bind(fs);
    const cleanupError = new Error("simulated cleanup failure");
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(fs, "rmSync").mockImplementation((target, options) => {
      if (String(target).includes(".homarr-restore-")) throw cleanupError;
      return removeDirectory(target, options);
    });

    const response = await POST(createImportRequest(backup));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
    expect(readBoardNames(activeDatabasePath)).toEqual(["Restored despite cleanup failure"]);
    expect(errorLog).toHaveBeenCalledWith(
      "[backup/import] Failed to remove temporary restore directory:",
      cleanupError,
    );
  });

  it("rejects a concurrent restore while the first request owns the restore lock", async () => {
    createMigratedDatabase(activeDatabasePath, "board-current", "Current board");
    const backup = createBackup(temporaryDirectory, "concurrent", "Concurrent restore");
    let signalStarted!: () => void;
    let releaseFirstRequest!: () => void;
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseFirstRequest = resolve;
    });
    const originalRequest = createImportRequest(backup);
    const requestBody = await originalRequest.arrayBuffer();
    const delayedBody = new ReadableStream<Uint8Array>({
      async pull(controller) {
        signalStarted();
        await release;
        controller.enqueue(new Uint8Array(requestBody));
        controller.close();
      },
    });
    const delayedRequestInit: RequestInit & { duplex: "half" } = {
      method: "POST",
      headers: originalRequest.headers,
      body: delayedBody,
      duplex: "half",
    };
    const delayedRequest = new Request(originalRequest.url, delayedRequestInit);

    const firstRestore = POST(delayedRequest);
    await started;
    const concurrentResponse = await POST(createImportRequest(backup));
    releaseFirstRequest();
    const firstResponse = await firstRestore;

    expect(concurrentResponse.status).toBe(409);
    expect(firstResponse.status).toBe(200);
    expect(readBoardNames(activeDatabasePath)).toEqual(["Concurrent restore"]);
  });
});
