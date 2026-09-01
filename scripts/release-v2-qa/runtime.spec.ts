// @vitest-environment node

import { createServer } from "node:net";
import type { Server } from "node:net";
import { afterEach, describe, expect, test } from "vitest";

import {
  assertRuntimeCommandPlatform,
  createAppLaunchCommand,
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
  test("uses Webpack dev while preserving the Linux file-descriptor wrapper", () => {
    const launch = createAppLaunchCommand(31_337, { platform: "linux", prlimitAvailable: true });
    const launchWithoutPrlimit = createAppLaunchCommand(31_337, { platform: "linux", prlimitAvailable: false });

    expect(launch).toEqual({
      command: "/usr/bin/prlimit",
      arguments: [
        "--nofile=65536:1048576",
        "--",
        "pnpm",
        "--filter",
        "@homarr/nextjs",
        "dev",
        "--webpack",
        "--hostname",
        "127.0.0.1",
        "--port",
        "31337",
      ],
    });
    expect(launchWithoutPrlimit.command).toBe("pnpm");
    expect(launchWithoutPrlimit.arguments).toContain("--webpack");
  });

  test("records and validates the deterministic bundler and watcher settings", () => {
    const execution = createRuntimeExecutionContract();

    expect(execution).toEqual({
      bundler: "webpack",
      watcher: { watchpackPollingIntervalMs: 1_000 },
    });
    expect(validateRuntimeExecutionContract(execution)).toEqual([]);
    expect(
      validateRuntimeExecutionContract({
        bundler: "turbopack",
        watcher: { watchpackPollingIntervalMs: 500 },
      }),
    ).toEqual(["bundler must be webpack", "Watchpack polling interval must be 1000ms"]);
    expect(validateRuntimeExecutionContract({ watcher: execution.watcher })).toEqual(["bundler must be webpack"]);
  });
});
