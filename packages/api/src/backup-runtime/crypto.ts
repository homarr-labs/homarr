import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { BackupError } from "./contracts";
import type { CopiedDatabase, SqlValue } from "./contracts";
import { encryptedFields } from "./inventory";

export function assertEncryptionKey(key: string) {
  if (!/^[0-9a-fA-F]{64}$/.test(key)) throw new BackupError("invalid-key");
}

export function convertEncryptedFields(copy: CopiedDatabase, sourceKey: string | undefined, targetKey: string) {
  assertEncryptionKey(targetKey);
  if (sourceKey !== undefined) assertEncryptionKey(sourceKey);
  const oldKey = sourceKey ? Buffer.from(sourceKey, "hex") : undefined;
  const newKey = Buffer.from(targetKey, "hex");
  try {
    copy.transaction(() => {
      for (const field of encryptedFields) {
        const keys = field.keys.map((key) => `"${key}"`).join(", ");
        const query = `SELECT ${keys}, "${field.column}" FROM "${field.table}" WHERE "${field.column}" IS NOT NULL`;
        for (const row of copy.iterate(query)) {
          if (!oldKey) throw new BackupError("source-key-required");
          const value = row[field.column];
          if (typeof value !== "string" || !/^(?:[0-9a-fA-F]{32})+\.[0-9a-fA-F]{32}$/.test(value))
            throw new BackupError("invalid-ciphertext");
          const [data, iv] = value.split(".");
          if (!data || !iv) throw new BackupError("invalid-ciphertext");
          let plaintext: Buffer | undefined;
          try {
            const decipher = createDecipheriv("aes-256-cbc", oldKey, Buffer.from(iv, "hex"));
            plaintext = Buffer.concat([decipher.update(Buffer.from(data, "hex")), decipher.final()]);
            new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
            if (!oldKey.equals(newKey)) {
              const newIv = randomBytes(16);
              const cipher = createCipheriv("aes-256-cbc", newKey, newIv);
              const converted = `${Buffer.concat([cipher.update(plaintext), cipher.final()]).toString("hex")}.${newIv.toString("hex")}`;
              const values: SqlValue[] = [converted];
              for (const key of field.keys) {
                const identity = row[key];
                if (typeof identity !== "string") throw new BackupError("invalid-ciphertext");
                values.push(identity);
              }
              copy.run(
                `UPDATE "${field.table}" SET "${field.column}" = ? WHERE ${field.keys.map((key) => `"${key}" = ?`).join(" AND ")}`,
                values,
              );
            }
          } catch {
            throw new BackupError("invalid-ciphertext");
          } finally {
            plaintext?.fill(0);
          }
        }
      }
    });
  } finally {
    oldKey?.fill(0);
    newKey.fill(0);
  }
}
