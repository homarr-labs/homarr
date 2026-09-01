// @vitest-environment node

import { createServer } from "node:net";
import type { Server } from "node:net";
import { afterEach, describe, expect, test } from "vitest";

import {
  assertRuntimeCommandPlatform,
  createAppLaunchCommand,
  createCandidateBuildPaths,
  createRuntimeExecutionContract,
  launchWithPortRetry,
  reserveLoopbackPort,
  validateRuntimeExecutionContract,
} from "./runtime.mts";

const openServers: Server[] = [];

const listen = async (server: Server, port: number) =>
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

const close = async (server: Server) =>
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

afterEach(async () => {
  await Promise.all(
    openServers.splice(0).map(async (server) => {
      if (server.listening) await close(server);
    }),
  );
});

describe("release-v2 QA runtime port startup", () => {
  test("keeps an allocated loopback port reserved until startup is ready to bind", async () => {
    const reservation = await reserveLoopbackPort();
    const contender = createServer();
    openServers.push(contender);

    await expect(listen(contender, reservation.port)).rejects.toMatchObject({ code: "EADDRINUSE" });
    await reservation.release();
    await listen(contender, reservation.port);
  });

  test("retries with a newly reserved port after an address-in-use collision", async () => {
    let attempts = 0;
    const selectedPort = await launchWithPortRetry(async (port) => {
      attempts += 1;
      const server = createServer();
      openServers.push(server);
      await listen(server, port);

      if (attempts === 1) {
        const collidedProcess = createServer();
        openServers.push(collidedProcess);
        await expect(listen(collidedProcess, port)).rejects.toMatchObject({ code: "EADDRINUSE" });
        await close(server);
        return { status: "address-in-use" } as const;
      }

      await close(server);
      return { status: "ready", value: port } as const;
    });

    expect(attempts).toBe(2);
    expect(selectedPort).toBeGreaterThan(0);
  });
});

describe("release-v2 QA runtime platform boundary", () => {
  test.each(["start", "stop"] as const)("rejects %s before dispatch on an unsupported platform", (command) => {
    expect(() => assertRuntimeCommandPlatform(command, "darwin")).toThrow(/Linux/u);
  });

  test("allows read-only status on an unsupported platform", () => {
    expect(() => assertRuntimeCommandPlatform("status", "win32")).not.toThrow();
  });

  test.each(["start", "status", "stop"] as const)("allows %s on Linux", (command) => {
    expect(() => assertRuntimeCommandPlatform(command, "linux")).not.toThrow();
  });
});

describe("release-v2 QA app execution contract", () => {
  test("uses the candidate standalone server while preserving the Linux file-descriptor wrapper", () => {
    const serverPath = "/tmp/release-v2-build/standalone/apps/nextjs/server.js";
    const launch = createAppLaunchCommand(serverPath, {
      platform: "linux",
      prlimitAvailable: true,
      nodeExecutable: "/usr/bin/node",
    });
    const launchWithoutPrlimit = createAppLaunchCommand(serverPath, {
      platform: "linux",
      prlimitAvailable: false,
      nodeExecutable: "/usr/bin/node",
    });

    expect(launch).toEqual({
      command: "/usr/bin/prlimit",
      arguments: ["--nofile=65536:1048576", "--", "/usr/bin/node", serverPath],
    });
    expect(launchWithoutPrlimit).toEqual({ command: "/usr/bin/node", arguments: [serverPath] });
  });

  test("records and validates the deterministic standalone build settings", () => {
    const execution = createRuntimeExecutionContract();

    expect(execution).toEqual({
      runtimeMode: "production-standalone",
      bundler: "webpack",
      watcher: null,
    });
    expect(validateRuntimeExecutionContract(execution)).toEqual([]);
    expect(
      validateRuntimeExecutionContract({
        runtimeMode: "development",
        bundler: "turbopack",
        watcher: { watchpackPollingIntervalMs: 500 },
      }),
    ).toEqual([
      "runtime mode must be production-standalone",
      "bundler must be webpack",
      "standalone runtimes must not use a filesystem watcher",
    ]);
    expect(validateRuntimeExecutionContract({ watcher: execution.watcher })).toEqual([
      "runtime mode must be production-standalone",
      "bundler must be webpack",
    ]);
  });

  test("derives one candidate-pinned build shared by every runtime slot", () => {
    const paths = createCandidateBuildPaths("0123456789abcdef0123456789abcdef01234567");

    expect(paths.distDirName).toBe(".next-qa/release-v2-0123456789abcdef0123456789abcdef01234567");
    expect(paths.serverPath).toBe(`${paths.buildDir}/standalone/apps/nextjs/server.js`);
    expect(paths.standaloneRoot).toBe(`${paths.buildDir}/standalone`);
    expect(() => createCandidateBuildPaths("not-a-commit")).toThrow(/40-character lowercase commit SHA/u);
  });
});
