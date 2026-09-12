import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type Database from "better-sqlite3";

const encryptedColumns = [
  { table: "custom_widget_connection", column: "encrypted_secrets" },
  { table: "custom_widget_v2_secret", column: "encrypted_value" },
  { table: "custom_widget_secret", column: "value" },
  { table: "widget_secret", column: "value" },
] as const;

function existingTables(database: Database.Database) {
  return encryptedColumns.filter(({ table }) =>
    database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table),
  );
}

export function countEncryptedWidgetValues(database: Database.Database) {
  return existingTables(database).reduce((count, { table }) => {
    const row = database.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get() as { count: number };
    return count + row.count;
  }, 0);
}

export function reencryptWidgetValues(database: Database.Database, oldKey: Buffer, newKey: Buffer) {
  database.transaction(() => {
    for (const { table, column } of existingTables(database)) {
      const values = database.prepare(`SELECT rowid, "${column}" AS value FROM "${table}"`).all() as Array<{
        rowid: number;
        value: string;
      }>;
      const update = database.prepare(`UPDATE "${table}" SET "${column}" = ? WHERE rowid = ?`);
      for (const row of values) {
        const parts = row.value.split(".");
        if (parts.length !== 2) throw new Error(`Malformed encrypted value in ${table}`);
        const [value, iv] = parts as [string, string];
        try {
          const decipher = createDecipheriv("aes-256-cbc", oldKey, Buffer.from(iv, "hex"));
          const plain = Buffer.concat([decipher.update(Buffer.from(value, "hex")), decipher.final()]);
          const nextIv = randomBytes(16);
          const cipher = createCipheriv("aes-256-cbc", newKey, nextIv);
          const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
          update.run(`${encrypted.toString("hex")}.${nextIv.toString("hex")}`, row.rowid);
        } catch {
          throw new Error(`Cannot restore an encrypted widget value in ${table} with the supplied backup key`);
        }
      }
    }
  })();
}
