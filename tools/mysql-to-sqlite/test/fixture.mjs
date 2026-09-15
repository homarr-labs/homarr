import { execFile } from "node:child_process";
import { createCipheriv, randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { setTimeout } from "node:timers/promises";
import mysql from "mysql2/promise";

import { quote, schema } from "../src/legacy.mjs";

const exec = promisify(execFile);
// Published v1.77.1 multi-platform image. Its bundled migrator, not our frozen
// SQL helper, must produce the source schema and journal used by these tests.
const sourceImage =
  "ghcr.io/homarr-labs/homarr:v1.77.1@sha256:1f5b892aeef4ad0a4907f075777bbd0ce7120f4cdc53b9f3f028519250421aed";
export const fixtureUser = "migration-user";
export const fixturePassword = "migration-password";
export const fixtureBoard = "migration-board";
export const fixtureSecret = "migration-secret";
export const fixtureMedia = Buffer.from([0, 1, 2, 127, 128, 255]);
export const fixtureDate = "2025-03-14 15:09:26";
export const fixturePasswordHash = "$2b$10$RPaXzPcun3JX2n8.A138S.m.AVTueysEPV77vJf/pKGI5DdCzVW0y";

const iv = Buffer.alloc(16, 1);
const cipher = createCipheriv("aes-256-cbc", Buffer.alloc(32), iv);
export const fixtureCiphertext = `${Buffer.concat([cipher.update(fixtureSecret), cipher.final()]).toString("hex")}.${iv.toString("hex")}`;

const ids = {
  user: fixtureUser,
  board: fixtureBoard,
  group: "migration-group",
  app: "migration-app",
  custom_widget_definition: "migration-custom",
  iconRepository: "migration-repository",
  icon: "migration-icon",
  integration: "migration-integration",
  item: "migration-item",
  layout: "migration-layout",
  media: "migration-media",
  section: "migration-section",
  search_engine: "migration-search",
  apiKey: "migration-api-key",
  invite: "migration-invite",
};
const references = {
  user_id: ids.user,
  creator_id: ids.user,
  owner_id: ids.user,
  board_id: ids.board,
  home_board_id: ids.board,
  group_id: ids.group,
  app_id: ids.app,
  definition_id: ids.custom_widget_definition,
  icon_repository_id: ids.iconRepository,
  integration_id: ids.integration,
  item_id: ids.item,
  layout_id: ids.layout,
  section_id: ids.section,
};
const overrides = {
  user: {
    name: fixtureUser,
    email: "migration@example.test",
    email_verified: fixtureDate,
    password: fixturePasswordHash,
    provider: "credentials",
    home_board_id: ids.board,
    color_scheme: "dark",
    first_day_of_week: 1,
    completed_manage_tour: 1,
    completed_board_tour: 1,
  },
  group: { name: "credentials-admin", position: 0 },
  groupPermission: { permission: "admin" },
  boardGroupPermission: { permission: "full" },
  boardUserPermission: { permission: "full" },
  integrationGroupPermissions: { permission: "full" },
  integrationUserPermission: { permission: "full" },
  board: {
    name: "converted-board",
    page_title: "Converted board",
    primary_color: "blue",
    secondary_color: "violet",
    background_image_attachment: "fixed",
    background_image_repeat: "no-repeat",
    background_image_size: "cover",
    item_radius: "md",
    opacity: 100,
    is_public: 0,
    custom_css: "/* Unicode: café 🏡 */\n" + "x".repeat(60_000),
  },
  onboarding: { id: "onboarding", step: "finish", previous_step: "setup" },
  integration: { name: "Converted Pi-hole", kind: "piHole", url: "http://127.0.0.1:9" },
  integrationSecret: { kind: "apiKey", value: fixtureCiphertext },
  custom_widget_definition: {
    name: "Legacy weather",
    url: "https://example.test/weather",
    enabled: 0,
    auth_type: "bearer",
    method: "GET",
    display_type: "singleValue",
    display_config: '{"type":"singleValue","jsonPath":"$.temperature"}',
  },
  custom_widget_secret: { kind: "apiKey", value: fixtureCiphertext },
  widget_secret: { kind: "apiKey", value: fixtureCiphertext },
  app: { name: "Converted app", icon_url: "/favicon.ico", href: "https://example.test" },
  iconRepository: { slug: "migration/repository" },
  icon: { name: "fixture", url: "https://example.test/icon.png", checksum: "fixture" },
  item: { kind: "clock", options: '{"json":{}}', advanced_options: '{"json":{}}' },
  layout: { name: "Base", column_count: 12, breakpoint: 768 },
  section: { kind: "empty", x_offset: 0, y_offset: 0, options: '{"json":{}}' },
  section_layout: { parent_section_id: null, x_offset: 0, y_offset: 0, width: 12, height: 3 },
  item_layout: { x_offset: 0, y_offset: 0, width: 3, height: 2 },
  media: {
    name: "Binary fixture",
    content: fixtureMedia,
    content_type: "application/octet-stream",
    size: fixtureMedia.length,
  },
  search_engine: {
    name: "Fixture search",
    short: "fx",
    type: "generic",
    icon_url: "/favicon.ico",
    url_template: "https://example.test/?q={query}",
  },
  cron_job_configuration: { name: "ping", cron_expression: "* * * * *", is_enabled: 0 },
  serverSetting: { setting_key: "migration-fixture", value: '{"json":{"unicode":"café 🏡"}}' },
  account: { type: "oauth", provider: "oidc", provider_account_id: "migration-external-user" },
  apiKey: { api_key: fixturePasswordHash },
  trusted_certificate_hostname: { hostname: "example.test", thumbprint: "fixture", certificate: "fixture certificate" },
};

export async function createFixture() {
  const password = randomBytes(16).toString("hex");
  const { stdout } = await exec("docker", [
    "run",
    "-d",
    "--rm",
    "-p",
    "127.0.0.1::3306",
    "-e",
    `MYSQL_ROOT_PASSWORD=${password}`,
    "-e",
    "MYSQL_DATABASE=homarr",
    "mysql:8.4.6",
  ]);
  const container = stdout.trim();
  let connection;
  const cleanup = async () => {
    try {
      await connection?.end();
    } finally {
      await exec("docker", ["rm", "-f", container]);
    }
  };
  try {
    const { stdout: published } = await exec("docker", ["port", container, "3306/tcp"]);
    const port = Number(published.trim().split(":").at(-1));
    const connectionOptions = {
      host: "127.0.0.1",
      port,
      user: "root",
      password,
      database: "homarr",
      timezone: "Z",
      dateStrings: true,
    };
    const deadline = Date.now() + 120_000;
    while (!connection) {
      try {
        connection = await mysql.createConnection(connectionOptions);
      } catch (error) {
        if (Date.now() >= deadline) throw error;
        await setTimeout(250);
      }
    }
    await connection.query("SET SESSION time_zone = '+00:00'");
    const environmentDirectory = await mkdtemp(join(tmpdir(), "homarr-release-source-"));
    try {
      const environmentFile = join(environmentDirectory, "source.env");
      await writeFile(
        environmentFile,
        [
          "DB_DRIVER=mysql2",
          "DB_DIALECT=mysql",
          "DB_HOST=127.0.0.1",
          `DB_PORT=${port}`,
          "DB_USER=root",
          `DB_PASSWORD=${password}`,
          "DB_NAME=homarr",
          "SKIP_ENV_VALIDATION=true",
          "NO_EXTERNAL_CONNECTION=true",
          `SECRET_ENCRYPTION_KEY=${"0".repeat(64)}`,
        ].join("\n") + "\n",
        { mode: 0o600 },
      );
      await exec(
        "docker",
        [
          "run",
          "--rm",
          "--network",
          "host",
          "--env-file",
          environmentFile,
          "--entrypoint",
          "node",
          sourceImage,
          "/app/db/migrations/mysql/migrate.cjs",
          "/app/db/migrations/mysql",
        ],
        { timeout: 120_000, maxBuffer: 8 * 1024 * 1024 },
      );
    } finally {
      await rm(environmentDirectory, { recursive: true, force: true });
    }
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    // Replace release seed rows with deterministic user data, leaving the real
    // release's schema and migration bookkeeping intact.
    const [tables] = await connection.query("SHOW TABLES");
    for (const table of tables) {
      const name = Object.values(table)[0];
      if (name !== "__drizzle_migrations") await connection.query(`DELETE FROM ${quote(name)}`);
    }
    for (const table of schema.tables) {
      const values = Object.fromEntries(
        table.columns.map((column) => {
          let value = !column.notNull
            ? null
            : column.encoding === "boolean"
              ? 0
              : column.encoding === "integer"
                ? 1
                : ["seconds", "milliseconds"].includes(column.encoding)
                  ? fixtureDate
                  : "fixture";
          if (column.name === "id") value = ids[table.name] ?? `migration-${table.name}`;
          if (references[column.name] && column.notNull) value = references[column.name];
          return [column.name, value];
        }),
      );
      Object.assign(values, overrides[table.name]);
      await connection.query(
        `INSERT INTO ${quote(table.name)} (${Object.keys(values).map(quote).join(", ")}) VALUES (${Object.keys(values)
          .map(() => "?")
          .join(", ")})`,
        Object.values(values),
      );
    }
    // More than one copy batch, including duplicate non-key values and Unicode.
    for (let i = 0; i < 251; i++)
      await connection.query("INSERT INTO serverSetting (setting_key, value) VALUES (?, ?)", [
        `migration-${i}`,
        "café 🏡",
      ]);
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    await connection.query("CREATE USER 'migration_reader'@'%' IDENTIFIED BY ?", [password]);
    await connection.query("GRANT SELECT ON homarr.* TO 'migration_reader'@'%'");
    return { connectionOptions: { ...connectionOptions, user: "migration_reader" }, connection, container, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
