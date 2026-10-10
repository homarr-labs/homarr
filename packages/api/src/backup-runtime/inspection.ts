import { BackupError } from "./contracts";
import type { BackupInspection, BackupMetadata, CopiedDatabase } from "./contracts";
import { encryptedFields, sourceModels } from "./inventory";

export function validateCopiedDatabase(copy: CopiedDatabase) {
  const integrity = copy.all("PRAGMA quick_check(1)");
  if (integrity.length !== 1 || Object.values(integrity[0] ?? {})[0] !== "ok")
    throw new BackupError("invalid-database");
  const violations = copy.iterate("PRAGMA foreign_key_check")[Symbol.iterator]();
  try {
    if (violations.next().done !== true) throw new BackupError("invalid-reference");
  } finally {
    violations.return?.();
  }
  const invalidParent = copy.all(
    `SELECT 1 FROM "assistant_message" AS child LEFT JOIN "assistant_message" AS parent ON parent.id = child.parent_id WHERE child.parent_id IS NOT NULL AND (parent.id IS NULL OR parent.thread_id != child.thread_id) LIMIT 1`,
  );
  if (invalidParent.length) throw new BackupError("invalid-reference");
  const invalidPlacement = copy.all(
    `SELECT 1 FROM "item_layout" AS placement INNER JOIN "item" ON item.id = placement.item_id INNER JOIN "section" ON section.id = placement.section_id INNER JOIN "layout" ON layout.id = placement.layout_id WHERE item.board_id != section.board_id OR item.board_id != layout.board_id LIMIT 1`,
  );
  if (invalidPlacement.length) throw new BackupError("invalid-reference");
  const invalidSection = copy.all(
    `SELECT 1 FROM "section_layout" AS placement INNER JOIN "section" ON section.id = placement.section_id INNER JOIN "layout" ON layout.id = placement.layout_id LEFT JOIN "section" AS parent ON parent.id = placement.parent_section_id WHERE section.board_id != layout.board_id OR (parent.id IS NOT NULL AND parent.board_id != section.board_id) LIMIT 1`,
  );
  if (invalidSection.length) throw new BackupError("invalid-reference");
  for (const definition of copy.iterate('SELECT "id", "sources" FROM "custom_widget_v2_definition"')) {
    if (typeof definition.id !== "string" || typeof definition.sources !== "string")
      throw new BackupError("invalid-database");
    let sources: unknown;
    try {
      sources = parse<unknown>(definition.sources);
    } catch {
      throw new BackupError("invalid-database");
    }
    if (typeof sources !== "object" || sources === null || Array.isArray(sources))
      throw new BackupError("invalid-database");
    for (const secret of copy.iterate('SELECT "source_id" FROM "custom_widget_v2_secret" WHERE "definition_id" = ?', [
      definition.id,
    ])) {
      if (typeof secret.source_id !== "string" || !Object.hasOwn(sources, secret.source_id))
        throw new BackupError("invalid-reference");
    }
  }
}

function count(copy: CopiedDatabase, sql: string) {
  const result = copy.all(sql)[0]?.count;
  if (typeof result !== "number" || !Number.isSafeInteger(result) || result < 0)
    throw new BackupError("invalid-database");
  return result;
}

export function inspectCopiedDatabase(
  copy: CopiedDatabase,
  metadata: BackupMetadata,
  carriesEncryptionKey: boolean,
): BackupInspection {
  const counts: Record<string, number> = {};
  for (const [model, table] of Object.entries(sourceModels))
    counts[model] = count(copy, `SELECT COUNT(*) AS count FROM "${table}"`);
  const secrets: Record<string, number> = {};
  for (const field of encryptedFields)
    secrets[`${field.model}.${field.column}`] = count(
      copy,
      `SELECT COUNT(*) AS count FROM "${field.table}" WHERE "${field.column}" IS NOT NULL`,
    );
  const boards = copy.all('SELECT "id", "name" FROM "board" ORDER BY "name", "id"').map((row) => {
    if (typeof row.id !== "string" || typeof row.name !== "string") throw new BackupError("invalid-database");
    return { id: row.id, name: row.name };
  });
  const homeRow = copy.all(`SELECT id, name FROM (
    SELECT board.id, board.name, 0 AS priority FROM "group" INNER JOIN board ON board.id = "group".home_board_id WHERE "group".name = 'everyone'
    UNION ALL SELECT board.id, board.name, 1 AS priority FROM "user" INNER JOIN board ON board.id = "user".home_board_id
    UNION ALL SELECT board.id, board.name, 2 AS priority FROM board
  ) ORDER BY priority, name, id LIMIT 1`)[0];
  const homeBoard =
    homeRow && typeof homeRow.id === "string" && typeof homeRow.name === "string"
      ? { id: homeRow.id, name: homeRow.name }
      : null;
  return {
    metadata,
    counts,
    boards,
    homeBoard,
    encryptedFields: secrets,
    carriesEncryptionKey,
    requiresMigrationLogout: true,
    scope: "sql-only-sensitive",
  };
}
import { parse } from "superjson";
