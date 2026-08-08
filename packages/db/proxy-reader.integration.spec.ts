// @vitest-environment node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import mysql from "mysql2/promise";
import { Client } from "pg";
import { stringify } from "superjson";
import { describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dbEnv: {} as Record<string, unknown>,
}));

vi.mock("@homarr/core/infrastructure/db/env", () => ({ dbEnv: mocks.dbEnv }));

const configureDriver = (values: Record<string, unknown>) => {
  vi.resetModules();
  for (const key of Object.keys(mocks.dbEnv)) delete mocks.dbEnv[key];
  Object.assign(mocks.dbEnv, values);
};

const readSettingsAsync = async () => {
  const reader = await import("./proxy-reader");
  const result = {
    locale: await reader.getDefaultLocaleForProxyAsync(),
    onboardingStep: await reader.getOnboardingStepForProxyAsync(),
  };
  await reader.closeProxySettingsReaderAsync();
  return result;
};

describe("proxy settings reader database compatibility", () => {
  test("reads SQLite settings and falls back for malformed culture data", async () => {
    const databasePath = path.join(os.tmpdir(), `homarr-proxy-reader-${process.pid}-${Date.now()}.sqlite`);
    const database = new Database(databasePath);
    database.exec("CREATE TABLE onboarding (step TEXT NOT NULL)");
    database.exec('CREATE TABLE "serverSetting" (setting_key TEXT NOT NULL, value TEXT NOT NULL)');
    database.prepare("INSERT INTO onboarding (step) VALUES (?)").run("finish");
    database
      .prepare('INSERT INTO "serverSetting" (setting_key, value) VALUES (?, ?)')
      .run("culture", stringify({ defaultLocale: "de" }));
    database.close();

    try {
      configureDriver({ DRIVER: "better-sqlite3", URL: databasePath });
      await expect(readSettingsAsync()).resolves.toEqual({ locale: "de", onboardingStep: "finish" });

      const malformedDatabase = new Database(databasePath);
      malformedDatabase.prepare('UPDATE "serverSetting" SET value = ? WHERE setting_key = ?').run("{", "culture");
      malformedDatabase.close();
      vi.resetModules();
      await expect(readSettingsAsync()).resolves.toEqual({ locale: "en", onboardingStep: "finish" });
    } finally {
      await fs.rm(databasePath, { force: true });
    }
  });

  test("reads MySQL settings through the bounded host configuration", async () => {
    const container = await new MySqlContainer("mysql:latest").start();
    try {
      const connection = await mysql.createConnection({
        host: container.getHost(),
        port: container.getPort(),
        database: container.getDatabase(),
        user: container.getUsername(),
        password: container.getUserPassword(),
      });
      await connection.execute("CREATE TABLE onboarding (step VARCHAR(32) NOT NULL)");
      await connection.execute("CREATE TABLE serverSetting (setting_key VARCHAR(64) NOT NULL, value TEXT NOT NULL)");
      await connection.execute("INSERT INTO onboarding (step) VALUES (?)", ["finish"]);
      await connection.execute("INSERT INTO serverSetting (setting_key, value) VALUES (?, ?)", [
        "culture",
        stringify({ defaultLocale: "fr" }),
      ]);
      await connection.end();

      configureDriver({
        DRIVER: "mysql2",
        HOST: container.getHost(),
        PORT: container.getPort(),
        NAME: container.getDatabase(),
        USER: container.getUsername(),
        PASSWORD: container.getUserPassword(),
      });
      await expect(readSettingsAsync()).resolves.toEqual({ locale: "fr", onboardingStep: "finish" });
    } finally {
      await container.stop();
    }
  }, 120_000);

  test("reads PostgreSQL settings through the bounded host configuration", async () => {
    const container = await new PostgreSqlContainer("postgres:latest").start();
    try {
      const connection = new Client({
        host: container.getHost(),
        port: container.getPort(),
        database: container.getDatabase(),
        user: container.getUsername(),
        password: container.getPassword(),
      });
      await connection.connect();
      await connection.query("CREATE TABLE onboarding (step TEXT NOT NULL)");
      await connection.query('CREATE TABLE "serverSetting" (setting_key TEXT NOT NULL, value TEXT NOT NULL)');
      await connection.query("INSERT INTO onboarding (step) VALUES ($1)", ["finish"]);
      await connection.query('INSERT INTO "serverSetting" (setting_key, value) VALUES ($1, $2)', [
        "culture",
        stringify({ defaultLocale: "es" }),
      ]);
      await connection.end();

      configureDriver({
        DRIVER: "node-postgres",
        HOST: container.getHost(),
        PORT: container.getPort(),
        NAME: container.getDatabase(),
        USER: container.getUsername(),
        PASSWORD: container.getPassword(),
      });
      await expect(readSettingsAsync()).resolves.toEqual({ locale: "es", onboardingStep: "finish" });
    } finally {
      await container.stop();
    }
  }, 120_000);
});
