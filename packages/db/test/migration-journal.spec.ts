import fs from "fs";
import path from "path";
import { describe, expect, test } from "vitest";

/**
 * Guards the migration folders against the failure modes that have actually shipped:
 *
 * - v1.70.0 shipped `0042_add_widget_secret.sql` for MySQL without a `_journal.json` entry, so the
 *   migrator never ran it and MySQL instances upgraded from that release had no `widget_secret`
 *   table.
 * - The follow-up fix hand-wrote `0042_snapshot.json` with a `checkConstraints` key instead of
 *   `checkConstraint`, which made `drizzle-kit generate` reject the folder and silently exit 0 for
 *   every later MySQL migration.
 */
const dialects = ["mysql", "postgresql", "sqlite"] as const;

const migrationsRoot = path.join(__dirname, "..", "migrations");

interface Journal {
  entries: { idx: number; tag: string }[];
}

const readDialect = (dialect: (typeof dialects)[number]) => {
  const folder = path.join(migrationsRoot, dialect);
  const journal = JSON.parse(fs.readFileSync(path.join(folder, "meta", "_journal.json"), "utf8")) as Journal;
  const sqlFiles = fs
    .readdirSync(folder)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => file.replace(/\.sql$/u, ""));
  const snapshots = fs
    .readdirSync(path.join(folder, "meta"))
    .filter((file) => /^\d+_snapshot\.json$/u.test(file))
    .map((file) => file.split("_")[0]);

  return { folder, journal, sqlFiles, snapshots };
};

describe.each(dialects)("%s migrations", (dialect) => {
  test("every journal entry has a matching .sql file", () => {
    const { journal, sqlFiles } = readDialect(dialect);
    const missing = journal.entries.filter((entry) => !sqlFiles.includes(entry.tag)).map((entry) => entry.tag);

    expect(missing).toEqual([]);
  });

  test("every .sql file is registered in the journal", () => {
    const { journal, sqlFiles } = readDialect(dialect);
    const tags = new Set(journal.entries.map((entry) => entry.tag));
    const orphans = sqlFiles.filter((file) => !tags.has(file));

    expect(orphans).toEqual([]);
  });

  test("every journal entry has a matching snapshot", () => {
    const { journal, snapshots } = readDialect(dialect);
    const missing = journal.entries
      .filter((entry) => !snapshots.includes(String(entry.idx).padStart(4, "0")))
      .map((entry) => entry.tag);

    expect(missing).toEqual([]);
  });

  test("journal indexes are unique and gap-free", () => {
    const { journal } = readDialect(dialect);
    const indexes = journal.entries.map((entry) => entry.idx);

    expect(indexes).toEqual(indexes.map((_, position) => position));
  });

  // The check-constraint key is spelled differently per snapshot format version (MySQL's v5 uses
  // `checkConstraint`, the newer SQLite/Postgres formats use `checkConstraints`), so rather than
  // hard-coding a spelling this asserts every snapshot in a dialect agrees with the others. A
  // hand-written snapshot that gets it wrong stands out as the odd one and fails drizzle-kit.
  test("all snapshots agree on the check-constraint key spelling", () => {
    const { folder, snapshots } = readDialect(dialect);

    const spellingsPerSnapshot = snapshots.map((snapshot) => {
      const file = path.join(folder, "meta", `${snapshot}_snapshot.json`);
      const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { tables?: Record<string, object> };
      const spellings = new Set<string>();

      for (const table of Object.values(parsed.tables ?? {})) {
        if ("checkConstraint" in table) spellings.add("checkConstraint");
        if ("checkConstraints" in table) spellings.add("checkConstraints");
      }

      return { snapshot, spellings: [...spellings].toSorted().join("+") };
    });

    const used = [...new Set(spellingsPerSnapshot.map((entry) => entry.spellings))].filter(
      (spelling) => spelling.length > 0,
    );

    expect(used, `snapshots disagree: ${JSON.stringify(spellingsPerSnapshot.filter((e) => e.spellings))}`).toHaveLength(
      1,
    );
  });
});
