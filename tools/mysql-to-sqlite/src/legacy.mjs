import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const root = new URL("../legacy/v1.77.1/", import.meta.url);
export const schema = JSON.parse(readFileSync(new URL("schema.json", root), "utf8"));

export function migrations(dialect) {
  const journal = JSON.parse(readFileSync(new URL(`${dialect}/journal.json`, root), "utf8"));
  return journal.entries.map((entry) => {
    const sql = readFileSync(new URL(`${dialect}/${entry.tag}.sql`, root), "utf8");
    return { ...entry, sql, hash: createHash("sha256").update(sql).digest("hex") };
  });
}

export const quote = (identifier) => `\`${identifier.replaceAll("`", "``")}\``;

// Use the release's SQL, not its seeding entrypoint: source data owns every ID.
export function initializeSqlite(database) {
  database.exec('CREATE TABLE "__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)');
  const record = database.prepare('INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)');
  database.exec("BEGIN");
  for (const migration of migrations("sqlite")) {
    for (const statement of migration.sql.split("--> statement-breakpoint")) {
      if (statement.trim()) database.exec(statement);
    }
    record.run(migration.hash, migration.when);
  }
  database.exec("COMMIT");
}
