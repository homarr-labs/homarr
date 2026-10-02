import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("database driver configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");
    vi.stubEnv("DB_DRIVER", "better-sqlite3");
    vi.stubEnv("DB_DIALECT", "sqlite");
    vi.stubEnv("DB_URL", ":memory:");
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each(["mysql", "mariadb"])("rejects retired dialect %s before SQLite fallback", async (dialect) => {
    vi.stubEnv("DB_DIALECT", dialect);
    await expect(import("./env")).rejects.toThrow("MySQL and MariaDB are no longer supported");
  });

  it.each(["mysql2", "mysql", "mariadb"])(
    "rejects retired driver %s even when validation is skipped",
    async (driver) => {
      vi.stubEnv("DB_DRIVER", driver);
      await expect(import("./env")).rejects.toThrow("MySQL and MariaDB are no longer supported");
    },
  );

  it.each(["mysql://localhost/homarr", "mariadb://localhost/homarr"])(
    "rejects retired database URL %s",
    async (url) => {
      vi.stubEnv("DB_URL", url);
      await expect(import("./env")).rejects.toThrow("Migrate your database to SQLite or PostgreSQL");
    },
  );

  it.each(["better-sqlite3", "node-postgres"])("preserves supported driver %s", async (driver) => {
    vi.stubEnv("DB_DRIVER", driver);
    const { dbEnv } = await import("./env");
    expect(dbEnv.DRIVER).toBe(driver);
  });
});
