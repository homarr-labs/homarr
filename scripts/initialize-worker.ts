import { randomBytes, timingSafeEqual } from "node:crypto";
import { chmod, lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const directory = process.env.HOMARR_WORKER_STATE_DIRECTORY ?? "/appdata/worker";
await mkdir(directory, { recursive: true, mode: 0o700 });
await chmod(directory, 0o700);

async function persistentSecret(
  variable: "SECRET_ENCRYPTION_KEY" | "AUTH_SECRET",
  filename: string,
  generate: () => string,
  valid: (value: string) => boolean,
) {
  const path = join(directory, filename);
  const configured = process.env[variable];
  if (configured && !valid(configured)) throw new Error(`Invalid ${variable}`);
  let existing: string | undefined;
  try {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Invalid persistent ${variable} file`);
    existing = (await readFile(path, "utf8")).replace(/\r?\n$/, "");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (existing !== undefined) {
    if (!valid(existing)) throw new Error(`Invalid persistent ${variable}`);
    if (configured) {
      const actual = Buffer.from(existing);
      const supplied = Buffer.from(configured);
      if (actual.length !== supplied.length || !timingSafeEqual(actual, supplied)) {
        throw new Error(
          `Configured ${variable} differs from the persisted secret; restore the correct secret before starting`,
        );
      }
    }
    await chmod(path, 0o600);
    return;
  }
  if (variable === "SECRET_ENCRYPTION_KEY" && !configured && process.env.DB_DRIVER !== "node-postgres") {
    const databasePath = process.env.DB_URL ?? "/appdata/db/db.sqlite";
    try {
      const database = await lstat(databasePath);
      if (database.isFile() && database.size > 0) {
        throw new Error("Existing SQLite data needs its original SECRET_ENCRYPTION_KEY before creating worker secrets");
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  const value = configured || generate();
  // Exclusive creation prevents two starting processes from replacing a key.
  await writeFile(path, `${value}\n`, { mode: 0o600, flag: "wx" });
}

await persistentSecret(
  "SECRET_ENCRYPTION_KEY",
  "secret-encryption-key",
  () => randomBytes(32).toString("hex"),
  (key) => /^[a-fA-F0-9]{64}$/.test(key),
);
await persistentSecret(
  "AUTH_SECRET",
  "auth-secret",
  () => randomBytes(32).toString("base64url"),
  (secret) => secret.length > 0 && !/[\r\n]/.test(secret),
);
