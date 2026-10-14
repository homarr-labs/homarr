import { lstat } from "node:fs/promises";
import { createRequire } from "node:module";
import { isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.HOMARR_NITRO_ACTIVATION !== "accepted") {
  throw new Error("Nitro candidate migration activation is held");
}
if ((process.env.DB_MIGRATIONS_DISABLED ?? "false") !== "false") {
  throw new Error("Nitro candidate migrations cannot be skipped");
}
if (!process.versions.bun) {
  throw new Error("Nitro persistence migrations require the Bun runtime");
}

const require = createRequire(import.meta.url);
const databaseUrl = process.env.DB_URL;
if (!databaseUrl) {
  throw new Error("Nitro migrations require an explicit DB_URL");
}

if (process.env.DB_DIALECT === "sqlite") {
  if (process.env.DB_DRIVER !== "better-sqlite3" || !isAbsolute(databaseUrl)) {
    throw new Error("SQLite migrations require the supported driver and an absolute database file path");
  }

  let exists = false;
  try {
    const file = await lstat(databaseUrl);
    if (!file.isFile()) {
      throw new Error("SQLite migrations require a regular database file");
    }
    exists = true;
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  const bundle = require(fileURLToPath(new URL("../db/migration-runners/sqlite.cjs", import.meta.url)));
  if (!bundle || typeof bundle !== "object" || typeof bundle.migrateSqliteAsync !== "function") {
    throw new Error("Packaged SQLite migration export is unavailable");
  }

  await bundle.migrateSqliteAsync(
    {
      engine: "sqlite",
      path: databaseUrl,
      mode: exists ? "existing" : "fresh",
      migrationsFolder: fileURLToPath(new URL("../db/migrations/sqlite/", import.meta.url)),
    },
    exists ? undefined : { allowMockIntegration: false, demoMode: false },
  );
} else if (process.env.DB_DIALECT === "postgresql") {
  if (process.env.DB_DRIVER !== "node-postgres" || !/^postgres(?:ql)?:\/\//.test(databaseUrl)) {
    throw new Error("PostgreSQL migrations require the supported driver and an explicit PostgreSQL DB_URL");
  }

  const bundle = require(fileURLToPath(new URL("../db/migration-runners/postgresql.cjs", import.meta.url)));
  if (!bundle || typeof bundle !== "object" || typeof bundle.migratePostgresqlAsync !== "function") {
    throw new Error("Packaged PostgreSQL migration export is unavailable");
  }

  await bundle.migratePostgresqlAsync({
    engine: "postgresql",
    connection: { connectionString: databaseUrl },
    migrationsFolder: fileURLToPath(new URL("../db/migrations/postgresql/", import.meta.url)),
  });
} else {
  throw new Error("Nitro migrations support only sqlite or postgresql");
}
