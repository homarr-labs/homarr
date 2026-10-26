import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { link, mkdir, open, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { maxPreparationVariants, maxStoredDocumentBytes, preparationMaxAgeMs } from "./limits";
import type { CompressedDocument } from "./document";

interface DiskDocument extends CompressedDocument {
  token: string;
}

const isMissing = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT";
const removeAsync = async (path: string) => {
  try {
    await unlink(path);
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
};
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

const readBoundedAsync = async (path: string, limit: number) => {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > limit) throw new Error("Invalid prepared Board cache file");
    // Files are immutable once published. Read at most limit + 1 even if an
    // external writer changes the file after stat().
    const chunks: Buffer[] = [];
    let bytes = 0;
    while (bytes <= limit) {
      const buffer = Buffer.alloc(Math.min(64 * 1024, limit + 1 - bytes));
      const result = await file.read(buffer);
      if (result.bytesRead === 0) return Buffer.concat(chunks, bytes).toString("utf8");
      bytes += result.bytesRead;
      chunks.push(buffer.subarray(0, result.bytesRead));
    }
    throw new Error("Prepared Board cache file exceeds its size budget");
  } finally {
    await file.close();
  }
};

export const createDiskDocumentCacheAsync = async (path: string) => {
  const directory = resolve(path);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const identityPath = join(directory, ".identity");
  try {
    await stat(identityPath);
  } catch (error) {
    if (!isMissing(error)) throw error;
    const temporary = join(directory, `${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, randomUUID(), { flag: "wx", mode: 0o600 });
      try {
        // Publish a complete identity without overwriting another process's ID.
        await link(temporary, identityPath);
      } catch (cause) {
        if ((cause as NodeJS.ErrnoException).code !== "EEXIST") throw cause;
      }
    } finally {
      await removeAsync(temporary);
    }
  }
  const identity = await readBoundedAsync(identityPath, 36);
  if (!/^[a-f0-9-]{36}$/.test(identity)) throw new Error("Invalid prepared Board disk cache identity");

  const filename = (key: string, token: string) => `${hash(key)}.${hash(token)}.json`;
  return {
    identity,
    async readAsync(key: string, token: string): Promise<DiskDocument | null> {
      try {
        const document = JSON.parse(
          await readBoundedAsync(join(directory, filename(key, token)), maxStoredDocumentBytes),
        ) as DiskDocument;
        if (document.token !== token || document.encoding !== "gzip-base64" || typeof document.body !== "string")
          return null;
        return document;
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },
    // The caller holds the Redis lock for this cache identity during writes and
    // publication. Unique version files keep an expired renderer from replacing
    // the document selected by a newer renderer's fenced ready record.
    async writeAsync(key: string, document: DiskDocument) {
      const contents = JSON.stringify(document);
      const bytes = Buffer.byteLength(contents);
      if (bytes > maxStoredDocumentBytes) throw new Error("Prepared Board exceeds its disk cache budget");
      const name = filename(key, document.token);
      const temporary = join(directory, `${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, contents, { flag: "wx", mode: 0o600 });
        const entries = [];
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          if (entry.isFile() && /^[a-f0-9-]{36}\.tmp$/.test(entry.name)) {
            const temporaryPath = join(directory, entry.name);
            if ((await stat(temporaryPath)).mtimeMs < Date.now() - 180_000) await removeAsync(temporaryPath);
            continue;
          }
          if (!entry.isFile() || !/^[a-f0-9]{64}\.[a-f0-9]{64}\.json$/.test(entry.name)) continue;
          const entryPath = join(directory, entry.name);
          const info = await stat(entryPath);
          if (info.mtimeMs < Date.now() - preparationMaxAgeMs || entry.name.startsWith(`${hash(key)}.`)) {
            await removeAsync(entryPath);
            continue;
          }
          entries.push({ path: entryPath, bytes: info.size, time: info.mtimeMs });
        }
        entries.sort((left, right) => left.time - right.time);
        let total = bytes + entries.reduce((sum, entry) => sum + entry.bytes, 0);
        while (total > maxStoredDocumentBytes || entries.length >= maxPreparationVariants) {
          const oldest = entries.shift();
          if (!oldest) break;
          await removeAsync(oldest.path);
          total -= oldest.bytes;
        }
        await rename(temporary, join(directory, name));
      } finally {
        await removeAsync(temporary);
      }
      return bytes;
    },
    async removeAsync(key: string, token: string) {
      await removeAsync(join(directory, filename(key, token)));
    },
  };
};
