// @vitest-environment node

import { mkdir, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import {
  acquireSlotLease,
  assertSafeContainedPath,
  assertSafeRunRoot,
  assertSupportedRuntimePlatform,
  createFixtureEnvironment,
  getSlotLeasePath,
  isPathWithin,
  sanitizeAppEnvironment,
  validateFixtureUrl,
  validateLoopbackHost,
} from "./safety.mts";

const temporaryPaths: string[] = [];
const uniqueName = (suffix: string) => `homarr-release-v2-qa-test-${process.pid}-${Date.now()}-${suffix}`;

afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((target) => rm(target, { force: true, recursive: true })));
});

describe("release-v2 QA harness safety", () => {
  test("supports runtime mutations only on Linux", () => {
    expect(() => assertSupportedRuntimePlatform("linux")).not.toThrow();
    expect(() => assertSupportedRuntimePlatform("darwin")).toThrow(/Linux/u);
    expect(() => assertSupportedRuntimePlatform("win32")).toThrow(/Linux/u);
  });

  test("rejects an unsupported platform before creating a slot lease", async () => {
    const runRoot = path.join(tmpdir(), uniqueName("unsupported-platform"));
    const leasePath = await getSlotLeasePath(runRoot, 1);
    temporaryPaths.push(leasePath);

    await expect(acquireSlotLease(runRoot, 1, "unsupported-start", "darwin")).rejects.toThrow(/Linux/u);
    await expect(stat(leasePath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("accepts only direct, predictably named children of the temporary directory", async () => {
    const safeRoot = path.join(tmpdir(), uniqueName("safe"));
    temporaryPaths.push(safeRoot);

    await expect(assertSafeRunRoot(safeRoot, { allowMissing: true })).resolves.toBe(path.resolve(safeRoot));
    await expect(
      assertSafeRunRoot(path.join(tmpdir(), "unrelated-homarr-release-v2-qa"), { allowMissing: true }),
    ).rejects.toThrow("must start with");
    await expect(
      assertSafeRunRoot(path.join(tmpdir(), "homarr-release-v2-qaevil"), { allowMissing: true }),
    ).rejects.toThrow("must start with");
    await expect(
      assertSafeRunRoot(path.join(tmpdir(), "nested", uniqueName("nested")), { allowMissing: true }),
    ).rejects.toThrow("direct child");
    await expect(
      assertSafeRunRoot(path.join(tmpdir(), "..", "var", "tmp", uniqueName("traversal")), { allowMissing: true }),
    ).rejects.toThrow("direct child");
  });

  test("canonicalizes a temporary-directory alias without widening containment", async () => {
    const temporaryAlias = path.join(tmpdir(), uniqueName("temporary-alias"));
    const runRootName = uniqueName("canonical-root");
    temporaryPaths.push(temporaryAlias);
    await symlink(tmpdir(), temporaryAlias, "dir");

    await expect(assertSafeRunRoot(path.join(temporaryAlias, runRootName), { allowMissing: true })).resolves.toBe(
      path.join(await realpath(tmpdir()), runRootName),
    );
  });

  test("rejects a symlink run-root", async () => {
    const target = path.join(tmpdir(), uniqueName("target"));
    const linkedRoot = path.join(tmpdir(), uniqueName("linked"));
    temporaryPaths.push(linkedRoot, target);
    await mkdir(target);
    await symlink(target, linkedRoot);

    await expect(assertSafeRunRoot(linkedRoot)).rejects.toThrow("symlink");
  });

  test("rejects symlink components in a contained reset target", async () => {
    const runRoot = path.join(tmpdir(), uniqueName("component-root"));
    const externalTarget = path.join(tmpdir(), uniqueName("component-target"));
    temporaryPaths.push(runRoot, externalTarget);
    await mkdir(runRoot);
    await mkdir(externalTarget);
    await symlink(externalTarget, path.join(runRoot, "slots"));

    await expect(
      assertSafeContainedPath(runRoot, path.join(runRoot, "slots", "1"), "QA slot reset target"),
    ).rejects.toThrow("symlink");
  });

  test("catches a symlink swapped in after an earlier missing-target check", async () => {
    const runRoot = path.join(tmpdir(), uniqueName("swap-root"));
    const externalTarget = path.join(tmpdir(), uniqueName("swap-target"));
    const slotPath = path.join(runRoot, "slots", "1");
    temporaryPaths.push(runRoot, externalTarget);
    await mkdir(path.dirname(slotPath), { recursive: true });
    await mkdir(externalTarget);

    await expect(assertSafeContainedPath(runRoot, slotPath, "QA slot mutation target")).resolves.toBe(slotPath);
    await symlink(externalTarget, slotPath);
    await expect(assertSafeContainedPath(runRoot, slotPath, "QA slot mutation target")).rejects.toThrow("symlink");
  });

  test("rejects a concurrent operation while a live slot lease is held", async () => {
    const runRoot = path.join(tmpdir(), uniqueName("live-lease"));
    const lease = await acquireSlotLease(runRoot, 1, "first-start");
    temporaryPaths.push(lease.path);

    await expect(acquireSlotLease(runRoot, 1, "second-start")).rejects.toThrow(/slot 1 is busy.*first-start/u);
    await lease.release();
  });

  test("recovers a stale lease with a dead owner PID", async () => {
    const runRoot = path.join(tmpdir(), uniqueName("stale-lease"));
    const leasePath = await getSlotLeasePath(runRoot, 2);
    temporaryPaths.push(leasePath);
    await writeFile(
      leasePath,
      `${JSON.stringify({
        schemaVersion: 1,
        pid: 2_147_483_647,
        processStartMarker: "linux:stale",
        token: "stale-token",
        runRoot: path.resolve(runRoot),
        slot: 2,
        operation: "stale-start",
        acquiredAt: "2026-01-01T00:00:00.000Z",
      })}\n`,
      { mode: 0o600 },
    );

    const lease = await acquireSlotLease(runRoot, 2, "replacement-start");
    expect(lease.owner.operation).toBe("replacement-start");
    await lease.release();
  });

  test("recovers a PID-reuse lease marker without signaling the unrelated process", async () => {
    const runRoot = path.join(tmpdir(), uniqueName("pid-reuse-lease"));
    const leasePath = await getSlotLeasePath(runRoot, 3);
    temporaryPaths.push(leasePath);
    await writeFile(
      leasePath,
      `${JSON.stringify({
        schemaVersion: 1,
        pid: process.pid,
        processStartMarker: "linux:not-this-process",
        token: "reused-pid-token",
        runRoot: path.resolve(runRoot),
        slot: 3,
        operation: "abandoned-start",
        acquiredAt: "2026-01-01T00:00:00.000Z",
      })}\n`,
      { mode: 0o600 },
    );

    const lease = await acquireSlotLease(runRoot, 3, "safe-recovery");
    expect(process.pid).toBeGreaterThan(0);
    await lease.release();
  });

  test("uses path segments rather than string prefixes for containment", () => {
    const parent = path.join(tmpdir(), "qa-artifacts", "packet-1");
    expect(isPathWithin(parent, path.join(parent, "screen.png"))).toBe(true);
    expect(isPathWithin(parent, `${parent}-spoof/screen.png`)).toBe(false);
    expect(isPathWithin(parent, path.join(parent, "..", "packet-2", "screen.png"))).toBe(false);
    expect(isPathWithin(parent, ".screenshots/release-v2/packet-1/screen.png")).toBe(false);
  });

  test.each(["http://127.0.0.1:3210", "http://localhost:3210", "http://[::1]:3210", "http://[0:0:0:0:0:0:0:1]:3210"])(
    "accepts a credential-free loopback fixture origin: %s",
    (fixtureUrl) => {
      expect(validateFixtureUrl(fixtureUrl)).toBe(new URL(fixtureUrl).origin);
    },
  );

  test.each([
    "https://127.0.0.1:3210",
    "http://user:secret@127.0.0.1:3210",
    "http://0.0.0.0:3210",
    "http://192.0.2.1:3210",
    "http://localhost.example:3210",
    "http://127.0.0.1:3210/path",
  ])("rejects an unsafe fixture URL without echoing it: %s", (fixtureUrl) => {
    expect(() => validateFixtureUrl(fixtureUrl)).toThrow("fixture URL");
  });

  test.each(["127.0.0.1", "localhost", "::1", "[::1]", "0:0:0:0:0:0:0:1"])(
    "accepts the loopback fixture bind host %s",
    (host) => {
      expect(validateLoopbackHost(host)).toBeTruthy();
    },
  );

  test.each(["0.0.0.0", "::", "192.0.2.1", "example.test"])("rejects the non-loopback bind host %s", (host) => {
    expect(() => validateLoopbackHost(host)).toThrow("loopback");
  });

  test("removes both QA password inputs from the spawned app environment", () => {
    const environment = sanitizeAppEnvironment({
      QA_PASSWORD: "do-not-forward",
      QA_PASSWORD_FILE: "/tmp/do-not-forward",
      QA_RUN_ID: "qa-run",
    });

    expect(environment).toEqual({ QA_RUN_ID: "qa-run" });
    expect("QA_PASSWORD" in environment).toBe(false);
    expect("QA_PASSWORD_FILE" in environment).toBe(false);
  });

  test("uses an explicit fixture environment allowlist", () => {
    const environment = createFixtureEnvironment("qa-run");

    expect(environment).toEqual({ QA_RUN_ID: "qa-run" });
    for (const forbiddenName of [
      "QA_PASSWORD",
      "QA_PASSWORD_FILE",
      "DB_URL",
      "AUTH_SECRET",
      "API_KEY",
      "SECRET_ENCRYPTION_KEY",
      "HOME",
      "PATH",
    ]) {
      expect(forbiddenName in environment).toBe(false);
    }
  });
});
