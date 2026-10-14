import type { HomarrDatabasePostgresql } from "../driver";
import type { HistoryStatements } from "./statements";
import type { RuntimeHistoryAppendResult } from "./types";
import { nextSequence, requireAffectedRows, requireClockObservation, requireEpoch, requireHead } from "./validation";

const lockStreamAsync = async (
  database: HomarrDatabasePostgresql,
  statements: HistoryStatements,
  epoch: string,
  check: () => void,
): Promise<readonly unknown[]> => {
  const meta = await database.execute(statements.epoch);
  check();
  requireEpoch(meta.rows, epoch);
  const inserted = await database.execute(statements.insertHeader);
  check();
  requireAffectedRows(inserted.rowCount);
  const header = await database.execute(statements.lockHeader);
  check();
  requireHead(header.rows);
  const observation = await database.execute(statements.observeClock);
  check();
  requireClockObservation(observation.rows);
  return header.rows;
};

export const appendTrimPostgresqlAsync = async (
  database: HomarrDatabasePostgresql,
  statements: HistoryStatements,
  epoch: string,
  payload: string,
  maxEntries: number,
  check: () => void,
): Promise<RuntimeHistoryAppendResult> => {
  const sequence = nextSequence(await lockStreamAsync(database, statements, epoch, check));
  const advanced = await database.execute(statements.advanceHead(sequence));
  check();
  requireAffectedRows(advanced.rowCount, 1);
  const inserted = await database.execute(statements.insertEntry(sequence, payload));
  check();
  requireAffectedRows(inserted.rowCount, 1);
  const trimmed = await database.execute(statements.trim(maxEntries));
  check();
  requireAffectedRows(trimmed.rowCount);
  return { sequence, payload };
};

export const clearPostgresqlAsync = async (
  database: HomarrDatabasePostgresql,
  statements: HistoryStatements,
  epoch: string,
  check: () => void,
): Promise<void> => {
  await lockStreamAsync(database, statements, epoch, check);
  const cleared = await database.execute(statements.clear);
  check();
  requireAffectedRows(cleared.rowCount);
};
