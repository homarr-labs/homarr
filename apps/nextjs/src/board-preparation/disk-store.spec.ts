// @vitest-environment node
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, stat, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createDiskDocumentCacheAsync } from "./disk-store";
import { compressDocumentAsync, decompressDocumentAsync } from "./document";
import { maxPreparationVariants, maxStoredDocumentBytes, preparationMaxAgeMs } from "./limits";

const directories: string[] = [];
const cacheAsync = async () => {
  const directory = await mkdtemp(join(tmpdir(), "homarr-prepared-disk-"));
  directories.push(directory);
  return { directory, cache: await createDiskDocumentCacheAsync(directory) };
};
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("prepared Board disk storage", () => {
  it("reopens private documents after restart without putting viewer or Board names in filenames", async () => {
    const { directory, cache } = await cacheAsync();
    const key = "viewer/alice/../../private-board";
    const document = { token: randomUUID(), ...(await compressDocumentAsync("<main>Dashboard 🌎</main>")) };
    await cache.writeAsync(key, document);
    const reopened = await createDiskDocumentCacheAsync(directory);
    expect(reopened.identity).toBe(cache.identity);
    const restored = await reopened.readAsync(key, document.token);
    if (!restored) throw new Error("Expected the saved document after restart");
    expect(await decompressDocumentAsync(restored)).toContain("Dashboard 🌎");
    expect(await reopened.readAsync(key, "wrong-version")).toBeNull();
    const [filename] = (await readdir(directory)).filter((name) => name.endsWith(".json"));
    if (!filename) throw new Error("Expected a stored document");
    expect(filename).toMatch(/^[a-f0-9]{64}\.[a-f0-9]{64}\.json$/);
    expect((await stat(join(directory, filename))).mode & 0o777).toBe(0o600);
  });

  it("uses one complete identity when processes initialize the same directory together", async () => {
    const directory = await mkdtemp(join(tmpdir(), "homarr-prepared-disk-"));
    directories.push(directory);
    const caches = await Promise.all(Array.from({ length: 16 }, () => createDiskDocumentCacheAsync(directory)));
    expect(new Set(caches.map((cache) => cache.identity)).size).toBe(1);
    expect(await readdir(directory)).toEqual([".identity"]);
  });

  it("bounds disk bytes across builds and replaces old versions instead of accumulating them", async () => {
    const { directory, cache } = await cacheAsync();
    const document = { token: "first", encoding: "gzip-base64" as const, body: "a".repeat(1024 * 1024) };
    for (let index = 0; index < 12; index++) await cache.writeAsync(`build-${index}:board`, document);
    await cache.writeAsync("build-11:board", { ...document, token: "second" });
    const files = (await readdir(directory)).filter((name) => name.endsWith(".json"));
    const sizes = await Promise.all(files.map(async (name) => (await stat(join(directory, name))).size));
    expect(sizes.reduce((total, size) => total + size, 0)).toBeLessThanOrEqual(maxStoredDocumentBytes);
    expect(await cache.readAsync("build-0:board", "first")).toBeNull();
    expect(await cache.readAsync("build-11:board", "first")).toBeNull();
    expect(await cache.readAsync("build-11:board", "second")).toEqual({ ...document, token: "second" });
  });

  it("bounds entry count and removes expired data and abandoned temporary files", async () => {
    const { directory, cache } = await cacheAsync();
    const document = { token: "version", ...(await compressDocumentAsync("content")) };
    await cache.writeAsync("expired", document);
    const [old] = (await readdir(directory)).filter((name) => name.endsWith(".json"));
    const past = new Date(Date.now() - preparationMaxAgeMs - 1000);
    if (!old) throw new Error("Expected the expired document");
    await utimes(join(directory, old), past, past);
    const abandoned = join(directory, `${randomUUID()}.tmp`);
    await writeFile(abandoned, "partial");
    await utimes(abandoned, past, past);
    for (let index = 0; index <= maxPreparationVariants; index++) await cache.writeAsync(`board-${index}`, document);
    expect((await readdir(directory)).filter((name) => name.endsWith(".json"))).toHaveLength(maxPreparationVariants);
    expect(await cache.readAsync("expired", document.token)).toBeNull();
    await expect(readFile(abandoned)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects oversized or symlinked files and treats removed documents as cache misses", async () => {
    const { directory, cache } = await cacheAsync();
    const document = { token: "version", ...(await compressDocumentAsync("content")) };
    await cache.writeAsync("board", document);
    const [name] = (await readdir(directory)).filter((entry) => entry.endsWith(".json"));
    if (!name) throw new Error("Expected a stored document");
    const filename = join(directory, name);
    await writeFile(filename, Buffer.alloc(maxStoredDocumentBytes + 1));
    await expect(cache.readAsync("board", document.token)).rejects.toThrow("Invalid prepared Board cache file");
    await rm(filename);
    await symlink(join(directory, ".identity"), filename);
    await expect(cache.readAsync("board", document.token)).rejects.toMatchObject({ code: "ELOOP" });
    await rm(filename);
    expect(await cache.readAsync("board", document.token)).toBeNull();
  });
});
