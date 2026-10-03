import { randomUUID } from "node:crypto";
import { closeSync, constants, fsyncSync, openSync } from "node:fs";
import { link, lstat, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { isDeepStrictEqual } from "node:util";
import mysql from "mysql2/promise";

import { initializeSqlite, migrations, quote, schema } from "./legacy.mjs";

function normalizeType(type) {
  return type
    .toLowerCase()
    .replace(/^boolean$/, "tinyint")
    .replace(/^(tinyint|smallint|int)\(\d+\)$/, "$1");
}

async function validateSource(connection) {
  const [tables] = await connection.query(
    "SELECT TABLE_NAME AS name, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
  );
  const expected = [...schema.tables.map(({ name }) => name), "__drizzle_migrations"].toSorted();
  if (
    !isDeepStrictEqual(tables.map(({ name }) => name).toSorted(), expected) ||
    tables.some(({ engine }) => engine !== "InnoDB")
  ) {
    throw new Error("Unsupported source schema: expected the complete v1.77.1 InnoDB database, without extra tables.");
  }
  const [columns] = await connection.query(
    "SELECT TABLE_NAME AS tableName, COLUMN_NAME AS name, COLUMN_TYPE AS type, IS_NULLABLE AS nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()",
  );
  for (const table of schema.tables) {
    const actual = columns.filter(({ tableName }) => tableName === table.name);
    if (
      actual.length !== table.columns.length ||
      table.columns.some((column) => {
        const found = actual.find(({ name }) => name === column.name);
        return (
          !found ||
          normalizeType(found.type) !== normalizeType(column.mysqlType) ||
          (found.nullable === "NO") !== column.notNull
        );
      })
    ) {
      throw new Error(`Unsupported or partially migrated source schema: ${table.name}. Expected v1.77.1.`);
    }
  }
  const [journal] = await connection.query("SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at");
  const expectedJournal = migrations("mysql");
  if (
    journal.length !== expectedJournal.length ||
    journal.some(
      (row, index) =>
        row.hash !== expectedJournal[index].hash || Number(row.created_at) !== expectedJournal[index].when,
    )
  ) {
    throw new Error("Unsupported migration journal. Upgrade Homarr to v1.77.1 and complete all migrations first.");
  }
}

function encode(value, column) {
  if (value === null) return null;
  switch (column.encoding) {
    case "milliseconds":
    case "seconds": {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
        throw new Error(`Invalid timestamp in ${column.name}`);
      }
      const milliseconds = Date.parse(`${value.replace(" ", "T")}Z`);
      if (
        !Number.isFinite(milliseconds) ||
        new Date(milliseconds).toISOString().slice(0, 19).replace("T", " ") !== value
      ) {
        throw new Error(`Invalid timestamp in ${column.name}`);
      }
      return column.encoding === "milliseconds" ? milliseconds : milliseconds / 1000;
    }
    case "boolean":
      if (value !== 0 && value !== 1) throw new Error(`Invalid boolean in ${column.name}`);
      return value;
    case "integer":
      if (!Number.isSafeInteger(value)) throw new Error(`Invalid integer in ${column.name}`);
      return value;
    case "blob":
      if (!Buffer.isBuffer(value)) throw new Error(`Invalid binary value in ${column.name}`);
      return value;
    case "text":
      if (typeof value !== "string") throw new Error(`Invalid text in ${column.name}`);
      return value;
    default:
      throw new Error(`Unknown encoding in ${column.name}`);
  }
}

export async function convert({ connectionOptions, output, homarrStopped, signal }) {
  signal?.throwIfAborted();
  if (!homarrStopped) throw new Error("Stop every Homarr process using this database, then pass --homarr-stopped.");
  if (!output) throw new Error("An --output file is required.");
  const destination = resolve(output);
  try {
    await lstat(destination);
    throw new Error("Destination already exists; choose a new output file.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const temporary = `${destination}.partial-${randomUUID()}`;
  let connection;
  let database;
  let created = false;
  let published = false;
  try {
    connection = await mysql.createConnection({
      ...connectionOptions,
      timezone: "Z",
      dateStrings: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
      multipleStatements: false,
      charset: "utf8mb4",
    });
    await connection.query("SET SESSION time_zone = '+00:00'");
    await connection.query("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await connection.query("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY");
    await validateSource(connection);
    signal?.throwIfAborted();

    closeSync(openSync(temporary, "wx", 0o600));
    created = true;
    database = new DatabaseSync(temporary);
    database.exec("PRAGMA foreign_keys = OFF");
    initializeSqlite(database);
    // Historical migrations contain their own FK pragmas. Disable only for the
    // complete copy, then check every relationship before publishing the file.
    database.exec("PRAGMA foreign_keys = OFF; BEGIN IMMEDIATE");
    const counts = {};
    for (const table of schema.tables) {
      const names = table.columns.map(({ name }) => quote(name)).join(", ");
      const insert = database.prepare(
        `INSERT INTO ${quote(table.name)} (${names}) VALUES (${table.columns.map(() => "?").join(", ")})`,
      );
      const read = database.prepare(`SELECT ${names} FROM ${quote(table.name)} WHERE rowid = ?`);
      let count = 0;
      while (true) {
        signal?.throwIfAborted();
        const [rows] = await connection.query(
          `SELECT ${names} FROM ${quote(table.name)} ORDER BY ${table.orderBy.map(quote).join(", ")} LIMIT 250 OFFSET ?`,
          [count],
        );
        for (const row of rows) {
          const values = table.columns.map((column) => encode(row[column.name], column));
          const inserted = insert.run(...values);
          const stored = read.get(inserted.lastInsertRowid);
          for (const [index, column] of table.columns.entries()) {
            const value = stored[column.name];
            const normalized = value instanceof Uint8Array ? Buffer.from(value) : value;
            if (!isDeepStrictEqual(normalized, values[index]))
              throw new Error(`Value verification failed in ${table.name}.${column.name}`);
          }
        }
        count += rows.length;
        if (rows.length < 250) break;
      }
      const [[sourceCount]] = await connection.query(`SELECT COUNT(*) AS count FROM ${quote(table.name)}`);
      const targetCount = database.prepare(`SELECT COUNT(*) AS count FROM ${quote(table.name)}`).get().count;
      if (Number(sourceCount.count) !== count || targetCount !== count)
        throw new Error(`Row count mismatch in ${table.name}`);
      counts[table.name] = count;
    }
    if (database.prepare("PRAGMA foreign_key_check").all().length)
      throw new Error("Source contains broken relationships; output was not published.");
    const integrity = database.prepare("PRAGMA integrity_check").all();
    if (integrity.length !== 1 || integrity[0].integrity_check !== "ok")
      throw new Error("SQLite integrity check failed.");
    database.exec("COMMIT; PRAGMA foreign_keys = ON");
    database.close();
    database = undefined;
    await connection.rollback();
    await connection.end();
    connection = undefined;
    const descriptor = openSync(temporary, constants.O_RDONLY);
    try {
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
    signal?.throwIfAborted();
    // Hard-link publication is atomic and fails if another process created the
    // destination. rename() would silently overwrite that file on Unix.
    await link(temporary, destination);
    published = true;
    return { release: schema.release, output: destination, counts };
  } finally {
    try {
      database?.close();
    } finally {
      try {
        await connection?.end();
      } finally {
        if (created)
          await unlink(temporary).catch((error) => {
            if (error.code === "ENOENT") return;
            if (!published) throw error;
            // The verified output already exists. A leftover hard link must not
            // turn a successful conversion into a misleading failure report.
            console.warn("Conversion succeeded, but its temporary .partial file could not be removed.");
          });
      }
    }
  }
}
