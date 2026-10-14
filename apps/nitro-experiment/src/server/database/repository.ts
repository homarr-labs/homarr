import type { Database } from "db0";
import { z } from "zod";

import type {
  BoardId,
  BoardRecord,
  BoardSaveInput,
  FixtureIdentity,
  IdentityId,
  WidgetSnapshot,
} from "../../contracts/schemas";
import {
  boardRecordSchema,
  boardSaveInputSchema,
  fixtureIdentitySchema,
  widgetSnapshotSchema,
} from "../../contracts/schemas";

const boardRowSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  visibility: z.string(),
  revision: z.number(),
  content_json: z.string(),
});

function decodeBoard(row: unknown): BoardRecord {
  const parsed = boardRowSchema.parse(row);
  return boardRecordSchema.parse({
    id: parsed.id,
    ownerId: parsed.owner_id,
    visibility: parsed.visibility,
    revision: parsed.revision,
    content: JSON.parse(parsed.content_json),
  });
}

export type BoardCommitResult =
  | { status: "saved"; board: BoardRecord }
  | { status: "conflict"; currentRevision: number }
  | { status: "not-found" };

export interface FixtureRepository {
  readBoard(boardId: BoardId): Promise<BoardRecord | null>;
  compareAndSave(input: BoardSaveInput): Promise<BoardCommitResult>;
  readIdentity(identityId: IdentityId): Promise<FixtureIdentity | null>;
  listIdentities(): Promise<FixtureIdentity[]>;
  readSeedWidget(boardId: BoardId): Promise<WidgetSnapshot>;
}

export function createFixtureRepository(database: Database): FixtureRepository {
  return {
    async readBoard(boardId) {
      const row = await database
        .prepare("SELECT id, owner_id, visibility, revision, content_json FROM fixture_boards WHERE id = ?")
        .get(boardId);
      return row == null ? null : decodeBoard(row);
    },
    async compareAndSave(input) {
      const validated = boardSaveInputSchema.parse(input);
      const row = await database
        .prepare(
          "UPDATE fixture_boards SET content_json = ?, revision = revision + 1 WHERE id = ? AND revision = ? AND revision < 9007199254740991 RETURNING id, owner_id, visibility, revision, content_json",
        )
        .get(JSON.stringify(validated.content), validated.boardId, validated.expectedRevision);
      if (row != null) return { status: "saved", board: decodeBoard(row) };
      const current = await this.readBoard(validated.boardId);
      return current == null ? { status: "not-found" } : { status: "conflict", currentRevision: current.revision };
    },
    async readIdentity(identityId) {
      const row = await database.prepare("SELECT id, label FROM fixture_identities WHERE id = ?").get(identityId);
      return row == null ? null : fixtureIdentitySchema.parse(row);
    },
    async listIdentities() {
      const rows = await database.prepare("SELECT id, label FROM fixture_identities ORDER BY id").all();
      return rows.map((row) => fixtureIdentitySchema.parse(row));
    },
    async readSeedWidget(boardId) {
      const row = z
        .object({ snapshot_json: z.string() })
        .parse(
          await database.prepare("SELECT snapshot_json FROM fixture_widget_seeds WHERE board_id = ?").get(boardId),
        );
      return widgetSnapshotSchema.parse(JSON.parse(row.snapshot_json));
    },
  };
}

export async function initializeFixtures(database: Database): Promise<void> {
  await database.exec("PRAGMA journal_mode = WAL");
  await database.exec("PRAGMA busy_timeout = 1000");
  await database.exec("CREATE TABLE IF NOT EXISTS fixture_identities (id TEXT PRIMARY KEY, label TEXT NOT NULL)");
  await database.exec(
    "CREATE TABLE IF NOT EXISTS fixture_boards (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')), revision INTEGER NOT NULL CHECK (revision >= 1), content_json TEXT NOT NULL)",
  );
  await database.exec(
    "CREATE TABLE IF NOT EXISTS fixture_widget_seeds (board_id TEXT PRIMARY KEY, snapshot_json TEXT NOT NULL)",
  );
  for (const identity of [
    { id: "owner", label: "Fixture owner" },
    { id: "viewer", label: "Fixture viewer" },
  ]) {
    await database
      .prepare("INSERT OR IGNORE INTO fixture_identities (id, label) VALUES (?, ?)")
      .run(identity.id, identity.label);
  }
  const observedAt = new Date().toISOString();
  const snapshot = widgetSnapshotSchema.parse({
    status: "ready",
    generation: 0,
    data: { value: 42, unit: "items" },
    observedAt,
    freshUntil: observedAt,
    staleUntil: new Date(Date.now() + 86400000).toISOString(),
  });
  for (const id of ["public", "private"] as const) {
    const content = {
      label: id === "public" ? "Public fixture dashboard" : "Private fixture dashboard",
      columns: 2,
      widget: { displayLabel: "Synthetic inventory" },
    };
    await database
      .prepare(
        "INSERT OR IGNORE INTO fixture_boards (id, owner_id, visibility, revision, content_json) VALUES (?, ?, ?, 1, ?)",
      )
      .run(id, "owner", id, JSON.stringify(content));
    await database
      .prepare("INSERT OR IGNORE INTO fixture_widget_seeds (board_id, snapshot_json) VALUES (?, ?)")
      .run(id, JSON.stringify(snapshot));
  }
}
