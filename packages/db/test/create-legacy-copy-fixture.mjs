import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { stringify } from "superjson";
import { readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

const [path, migrationsFolder, mode] = process.argv.slice(2);
if (!path || !migrationsFolder || !isAbsolute(path) || !isAbsolute(migrationsFolder))
  throw new Error("Explicit fixture path and migration folder are required");
const versions = { historical: 46, old49: 49, current: 50 };
const version = versions[mode];
const journal = JSON.parse(readFileSync(join(migrationsFolder, "meta/_journal.json"), "utf8"));
if (!version || journal.entries.length !== version) throw new Error("Explicit fixture migration version required");
const database = new Database(path);
try {
  migrate(drizzle(database), { migrationsFolder });
  if (database.prepare("SELECT COUNT(*) AS count FROM __drizzle_migrations").get().count !== version)
    throw new Error("Fixture migration ledger mismatch");
  if (mode === "current") {
    database.prepare('UPDATE "homarr_runtime_meta" SET epoch = ? WHERE id = 1').run("disposable-imported-epoch");
    database
      .prepare('INSERT INTO "homarr_runtime_state" (epoch, key, value) VALUES (?, ?, ?)')
      .run("disposable-imported-epoch", "disposable-state", "disposable-value");
    database
      .prepare('INSERT INTO "homarr_runtime_history_stream" (epoch, kind, name, head_sequence) VALUES (?, ?, ?, ?)')
      .run("disposable-imported-epoch", "log", "disposable-stream", 1);
    database
      .prepare(
        'INSERT INTO "homarr_runtime_history_entry" (epoch, kind, name, sequence, payload) VALUES (?, ?, ?, ?, ?)',
      )
      .run("disposable-imported-epoch", "log", "disposable-stream", 1, "disposable-payload");
  }
  database
    .prepare("INSERT INTO user (id, name, password, open_search_in_new_tab) VALUES (?, ?, ?, ?)")
    .run("copied-user", "Saved identity", "$2b$10$odRXt5e95kSQV5Axmk/FeO6GVOxuRQQ8NnRcBA78Wg4V3kZxPY68u", 0);
  database.prepare('INSERT INTO "group" (id, name, position) VALUES (?, ?, ?)').run("copied-group", "Saved group", 7);
  database.prepare("INSERT INTO groupMember (group_id, user_id) VALUES (?, ?)").run("copied-group", "copied-user");
  database
    .prepare("INSERT INTO board (id, name, creator_id) VALUES (?, ?, ?)")
    .run("copied-board", "Saved board", "copied-user");
  database
    .prepare("INSERT INTO media (id, name, content, content_type, size, creator_id) VALUES (?, ?, ?, ?, ?, ?)")
    .run("copied-media", "bytes", Buffer.from([0, 255, 17]), "application/octet-stream", 3, "copied-user");
  database
    .prepare("INSERT INTO serverSetting (setting_key, value) VALUES (?, ?)")
    .run("culture", stringify({ defaultLocale: "de", savedAt: new Date("2020-01-02T00:00:00Z") }));
  database
    .prepare("INSERT INTO integration (id, name, url, kind) VALUES (?, ?, ?, ?)")
    .run("copied-integration", "Disposable", "http://127.0.0.1/disposable", "mock");
  database
    .prepare("INSERT INTO integrationSecret (integration_id, kind, value, updated_at) VALUES (?, ?, ?, ?)")
    .run("copied-integration", "apiKey", "fixture.integration", 1577923200);
  database
    .prepare("INSERT INTO item (id, board_id, kind, options, advanced_options) VALUES (?, ?, ?, ?, ?)")
    .run("copied-item", "copied-board", "clock", stringify({}), stringify({}));
  database
    .prepare("INSERT INTO widget_secret (item_id, kind, value, updated_at) VALUES (?, ?, ?, ?)")
    .run("copied-item", "apiKey", "fixture.widget", 1577923200);
  database
    .prepare("INSERT INTO custom_widget_definition (id, name, url, creator_id) VALUES (?, ?, ?, ?)")
    .run("copied-legacy-definition", "Legacy", "http://127.0.0.1/disposable", "copied-user");
  database
    .prepare("INSERT INTO custom_widget_secret (definition_id, kind, value, updated_at) VALUES (?, ?, ?, ?)")
    .run("copied-legacy-definition", "apiKey", "fixture.legacy", 1577923200);
  database
    .prepare(
      "INSERT INTO custom_widget_v2_definition (id, name, sources, requests, options, template, creator_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      "copied-definition",
      "Saved JSX",
      stringify([]),
      stringify([]),
      stringify({}),
      "<Text>Saved</Text>",
      "copied-user",
    );
  database
    .prepare(
      "INSERT INTO custom_widget_v2_secret (definition_id, source_id, kind, encrypted_value, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run("copied-definition", "copied-source", "apiKey", "fixture.custom", 1577923200);
  database
    .prepare("INSERT INTO assistant_configuration (id, encrypted_api_key, encrypted_headers) VALUES (?, ?, ?)")
    .run("default", "fixture.assistant-key", "fixture.assistant-headers");
  if (mode === "historical") {
    database
      .prepare("INSERT INTO integration (id, name, url, kind) VALUES (?, ?, ?, ?)")
      .run("old-opnsense", "OPNsense", "http://127.0.0.1/disposable", "opnsense");
    database
      .prepare("INSERT INTO integrationSecret (integration_id, kind, value, updated_at) VALUES (?, ?, ?, ?)")
      .run("old-opnsense", "username", "fixture.old-user", 1577923200);
    database
      .prepare("INSERT INTO integrationSecret (integration_id, kind, value, updated_at) VALUES (?, ?, ?, ?)")
      .run("old-opnsense", "password", "fixture.old-password", 1577923200);
    database
      .prepare("INSERT INTO integration (id, name, url, kind) VALUES (?, ?, ?, ?)")
      .run("old-github", "GitHub", "http://127.0.0.1/disposable", "github");
    database.prepare("INSERT INTO item (id, board_id, kind, options) VALUES (?, ?, ?, ?)").run(
      "old-release",
      "copied-board",
      "releases",
      stringify({
        repositories: [{ providerKey: "Github", providerIntegrationId: "old-github", repository: "fixture/repo" }],
      }),
    );
    database
      .prepare("INSERT INTO integration_item (item_id, integration_id) VALUES (?, ?)")
      .run("old-release", "old-github");
    database
      .prepare("INSERT INTO item (id, board_id, kind, options) VALUES (?, ?, ?, ?)")
      .run("old-app", "copied-board", "app", stringify({ showDescriptionTooltip: true, appId: "saved-reference" }));
    database
      .prepare("INSERT INTO section (id, board_id, kind, options) VALUES (?, ?, ?, ?)")
      .run("old-container", "copied-board", "dynamic", stringify({}));
  }
} finally {
  database.close();
}
