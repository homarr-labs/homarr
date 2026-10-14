import type { HomarrDatabase } from "../driver";
import type { HistoryStatements } from "./statements";
import type { RuntimeHistoryAppendResult } from "./types";
import { nextSequence, requireAffectedRows, requireClockObservation, requireEpoch, requireHead } from "./validation";

const lockStream = (
  database: HomarrDatabase,
  statements: HistoryStatements,
  epoch: string,
  check: () => void,
): readonly unknown[] => {
  requireEpoch(database.all<unknown>(statements.epoch), epoch);
  check();
  requireAffectedRows(database.run(statements.insertHeader).changes);
  check();
  const header = database.all<unknown>(statements.lockHeader);
  check();
  requireHead(header);
  requireClockObservation(database.all<unknown>(statements.observeClock));
  check();
  return header;
};

export const appendTrimSqlite = (
  database: HomarrDatabase,
  statements: HistoryStatements,
  epoch: string,
  payload: string,
  maxEntries: number,
  check: () => void,
): RuntimeHistoryAppendResult => {
  const sequence = nextSequence(lockStream(database, statements, epoch, check));
  requireAffectedRows(database.run(statements.advanceHead(sequence)).changes, 1);
  check();
  requireAffectedRows(database.run(statements.insertEntry(sequence, payload)).changes, 1);
  check();
  requireAffectedRows(database.run(statements.trim(maxEntries)).changes);
  check();
  return { sequence, payload };
};

export const clearSqlite = (
  database: HomarrDatabase,
  statements: HistoryStatements,
  epoch: string,
  check: () => void,
): void => {
  lockStream(database, statements, epoch, check);
  requireAffectedRows(database.run(statements.clear).changes);
  check();
};
