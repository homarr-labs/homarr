import { randomBytes } from "node:crypto";
import { closeSync, constants, existsSync, openSync } from "node:fs";
import { chmod, cp, mkdir, open, readFile, rename, rm, stat } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  acquireBuildLease,
  acquireSlotLease,
  assertSafeContainedPath,
  assertSafeRunRoot,
  assertSupportedRuntimePlatform,
  createFixtureEnvironment,
  sanitizeAppEnvironment,
} from "./safety.mts";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const defaultRunRoot = path.join(tmpdir(), "homarr-release-v2-qa");
const markerName = ".homarr-release-v2-qa-root.json";
const runtimeMode = "production-standalone" as const;
const runtimeBundler = "webpack" as const;
const candidateBuildHeapLimitMb = 16_384;
const profiles = ["main-writable", "main-readonly", "onboarding-fresh", "degraded"] as const;

type Profile = (typeof profiles)[number];
export type RuntimeCommand = "start" | "status" | "stop";

export const assertRuntimeCommandPlatform = (command: RuntimeCommand, platform: NodeJS.Platform = process.platform) => {
  if (command === "status") return;
  assertSupportedRuntimePlatform(platform);
};

interface RuntimeExecutionContract {
  runtimeMode: typeof runtimeMode;
  bundler: typeof runtimeBundler;
  watcher: null;
}

export const createRuntimeExecutionContract = (): RuntimeExecutionContract => ({
  runtimeMode,
  bundler: runtimeBundler,
  watcher: null,
});

export const validateRuntimeExecutionContract = (value: {
  runtimeMode?: unknown;
  bundler?: unknown;
  watcher?: unknown;
}): string[] => {
  const contractErrors: string[] = [];
  if (value.runtimeMode !== runtimeMode) contractErrors.push("runtime mode must be production-standalone");
  if (value.bundler !== runtimeBundler) contractErrors.push("bundler must be webpack");
  if (value.watcher !== null && value.watcher !== undefined) {
    contractErrors.push("standalone runtimes must not use a filesystem watcher");
  }
  return contractErrors;
};

export const createAppLaunchCommand = (
  serverPath: string,
  options: { platform?: NodeJS.Platform; prlimitAvailable?: boolean; nodeExecutable?: string } = {},
) => {
  const platform = options.platform ?? process.platform;
  const prlimitAvailable = options.prlimitAvailable ?? existsSync("/usr/bin/prlimit");
  const nodeExecutable = options.nodeExecutable ?? process.execPath;
  if (platform === "linux" && prlimitAvailable) {
    return {
      command: "/usr/bin/prlimit",
      arguments: ["--nofile=65536:1048576", "--", nodeExecutable, serverPath],
    };
  }
  return { command: nodeExecutable, arguments: [serverPath] };
};

export const createCandidateBuildPaths = (candidateSha: string) => {
  if (!/^[0-9a-f]{40}$/u.test(candidateSha)) {
    throw new Error("Candidate build requires a 40-character lowercase commit SHA");
  }
  const appRoot = path.join(repoRoot, "apps/nextjs");
  const distDirName = `.next-qa/release-v2-${candidateSha}`;
  const buildDir = path.join(appRoot, distDirName);
  const standaloneRoot = path.join(buildDir, "standalone");
  const standaloneAppDir = path.join(standaloneRoot, "apps/nextjs");
  return {
    appRoot,
    distDirName,
    buildDir,
    standaloneRoot,
    standaloneAppDir,
    generatedServerPath: path.join(standaloneAppDir, "server.js"),
    serverPath: path.join(standaloneAppDir, "server.cjs"),
    markerPath: path.join(buildDir, "qa-build-manifest.json"),
  };
};

interface Options {
  command: RuntimeCommand;
  slot: number;
  profile: Profile;
  runRoot: string;
  candidate: string;
  reset: boolean;
}

interface RuntimeManifest {
  schemaVersion: 1;
  runId: string;
  status: "running" | "stopped";
  candidateSha: string;
  branch: string | null;
  slot: number;
  profile: Profile;
  startedAt: string;
  stoppedAt?: string;
  repoRoot: string;
  runRoot: string;
  slotDir: string;
  dbPath: string;
  fixtureManifestPath: string;
  nextDistDir: string;
  url: string;
  fixtureUrl: string;
  ports: { app: number; fixture: number; redis: number };
  flags: { demoMode: boolean; demoReadOnly: boolean; unsafeMockIntegration: boolean };
  runtimeMode: typeof runtimeMode;
  bundler: typeof runtimeBundler;
  watcher: null;
  build: { candidateSha: string; serverPath: string };
  processes: {
    app: { pid: number; logPath: string };
    fixture: { pid: number; logPath: string };
  };
  docker: { redisContainer: string };
}

const usage = () => {
  console.log(
    "Usage: runtime.mts <start|status|stop> --slot <1|2|3> [--profile <main-writable|main-readonly|onboarding-fresh|degraded>] [--run-root <path>] [--candidate <ref>] [--reset]",
  );
};

const parseArgs = (): Options => {
  const args = process.argv.slice(2).filter((argument) => argument !== "--");
  if (args[0] === "--help" || args[0] === "-h") {
    usage();
    process.exit(0);
  }
  const command = args.shift();
  if (command !== "start" && command !== "status" && command !== "stop") {
    usage();
    throw new Error("A runtime command is required");
  }

  let slot = 0;
  let profile: Profile = "main-writable";
  let runRoot = defaultRunRoot;
  let candidate = "HEAD";
  let reset = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const value = args[index + 1];
    if (argument === "--slot" && value) {
      slot = Number(value);
      index += 1;
      continue;
    }
    if (argument === "--profile" && value && profiles.includes(value as Profile)) {
      profile = value as Profile;
      index += 1;
      continue;
    }
    if (argument === "--run-root" && value) {
      runRoot = value;
      index += 1;
      continue;
    }
    if (argument === "--candidate" && value) {
      candidate = value;
      index += 1;
      continue;
    }
    if (argument === "--reset") {
      reset = true;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      usage();
      process.exit(0);
    }
    throw new Error(`Unknown or incomplete argument: ${argument ?? "<missing>"}`);
  }

  if (![1, 2, 3].includes(slot)) throw new Error("--slot must be 1, 2, or 3");
  return { command, slot, profile, runRoot: path.resolve(runRoot), candidate, reset };
};

const commandOutput = (command: string, args: string[]) => {
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.status ?? "unknown"}`;
    throw new Error(`${command} ${args.join(" ")} failed: ${detail}`);
  }
  return result.stdout.trim();
};

const resolveCandidate = (candidate: string) =>
  commandOutput("git", ["rev-parse", "--verify", `${candidate}^{commit}`]).toLowerCase();

const currentBranch = () => {
  const result = spawnSync("git", ["branch", "--show-current"], { cwd: repoRoot, encoding: "utf8" });
  const branch = result.stdout.trim();
  return branch.length > 0 ? branch : null;
};

const writeJsonAtomic = async (filePath: string, value: unknown) => {
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const temporaryPath = `${filePath}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  const handle = await open(
    temporaryPath,
    constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
};

const assertRunRootMarker = async (runRoot: string) => {
  const markerPath = path.join(runRoot, markerName);
  await assertSafeContainedPath(runRoot, markerPath, "QA run-root marker");
  const marker = JSON.parse(await readFile(markerPath, "utf8")) as {
    schemaVersion?: number;
    repoRoot?: string;
    runRoot?: string;
  };
  if (marker.schemaVersion !== 1 || path.resolve(marker.repoRoot ?? "") !== repoRoot) {
    throw new Error(`QA run-root marker does not belong to this checkout: ${markerPath}`);
  }
  if (marker.runRoot && path.resolve(marker.runRoot) !== runRoot) {
    throw new Error(`QA run-root marker records a different root: ${markerPath}`);
  }
};

const readManifest = async (manifestPath: string) => {
  const value = JSON.parse(await readFile(manifestPath, "utf8")) as RuntimeManifest;
  if (value.schemaVersion !== 1) throw new Error(`Unsupported runtime manifest: ${manifestPath}`);
  return value;
};

export interface PortReservation {
  port: number;
  release: () => Promise<void>;
}

export const reserveLoopbackPort = async (): Promise<PortReservation> =>
  await new Promise<PortReservation>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Unable to allocate a TCP port"));
        return;
      }
      let released = false;
      resolve({
        port: address.port,
        release: async () => {
          if (released) return;
          released = true;
          await new Promise<void>((closeResolve, closeReject) => {
            server.close((error) => {
              if (error) closeReject(error);
              else closeResolve();
            });
          });
        },
      });
    });
  });

type PortLaunchResult<T> = { status: "ready"; value: T } | { status: "address-in-use" };

export const launchWithPortRetry = async <T,>(
  launch: (port: number) => Promise<PortLaunchResult<T>>,
  options: { attempts?: number; initialReservation?: PortReservation } = {},
): Promise<T> => {
  const attempts = options.attempts ?? 3;
  let reservation = options.initialReservation;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    reservation ??= await reserveLoopbackPort();
    const port = reservation.port;
    await reservation.release();
    reservation = undefined;
    const result = await launch(port);
    if (result.status === "ready") return result.value;
  }
  throw new Error(`Unable to launch the QA app after ${attempts} address-in-use retries`);
};

const waitForJsonFile = async <T,>(filePath: string, timeoutMs: number) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      return JSON.parse(await readFile(filePath, "utf8")) as T;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error(`Timed out waiting for ${filePath}`);
};

const waitForUrl = async (url: string, timeoutMs: number) => {
  const deadline = Date.now() + timeoutMs;
  let lastStatus: number | undefined;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5_000) });
      lastStatus = response.status;
      if (response.ok) return;
    } catch {
      // Startup failures are reported from the process log after the deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}; last status=${lastStatus ?? "unreachable"}`);
};

interface SpawnedProcess {
  pid: number;
  exited: Promise<number | null>;
}

const spawnLogged = (
  command: string,
  args: string[],
  logPath: string,
  env: NodeJS.ProcessEnv,
  options: { cwd?: string } = {},
): SpawnedProcess => {
  const output = openSync(
    logPath,
    constants.O_CREAT | constants.O_APPEND | constants.O_WRONLY | constants.O_NOFOLLOW,
    0o600,
  );
  const child = spawn(command, args, {
    cwd: options.cwd ?? repoRoot,
    detached: true,
    env,
    stdio: ["ignore", output, output],
  });
  closeSync(output);
  if (!child.pid) throw new Error(`Failed to launch ${command}`);
  const exited = new Promise<number | null>((resolve) => {
    child.once("exit", (code) => resolve(code));
  });
  child.unref();
  return { pid: child.pid, exited };
};

const runForeground = (command: string, args: string[], env: NodeJS.ProcessEnv) => {
  const result = spawnSync(command, args, { cwd: repoRoot, env, stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status ?? "unknown"}`);
};

const candidateBuildIsReady = async (candidateSha: string) => {
  const buildPaths = createCandidateBuildPaths(candidateSha);
  try {
    const marker = JSON.parse(await readFile(buildPaths.markerPath, "utf8")) as {
      schemaVersion?: number;
      candidateSha?: string;
      runtimeMode?: string;
      bundler?: string;
    };
    const serverStats = await stat(buildPaths.serverPath);
    const staticStats = await stat(path.join(buildPaths.standaloneAppDir, ".next/static"));
    const publicStats = await stat(path.join(buildPaths.standaloneAppDir, "public"));
    return (
      marker.schemaVersion === 1 &&
      marker.candidateSha === candidateSha &&
      marker.runtimeMode === runtimeMode &&
      marker.bundler === runtimeBundler &&
      serverStats.isFile() &&
      staticStats.isDirectory() &&
      publicStats.isDirectory()
    );
  } catch {
    return false;
  }
};

const ensureCandidateBuild = async (runRoot: string, candidateSha: string) => {
  const buildPaths = createCandidateBuildPaths(candidateSha);
  if (await candidateBuildIsReady(candidateSha)) return buildPaths;

  const buildLease = await acquireBuildLease(runRoot, `build:${candidateSha}`);
  try {
    if (await candidateBuildIsReady(candidateSha)) return buildPaths;
    await assertSafeContainedPath(buildPaths.appRoot, buildPaths.buildDir, "QA candidate build directory");
    await rm(buildPaths.buildDir, { recursive: true, force: true });
    await assertSafeContainedPath(buildPaths.appRoot, buildPaths.buildDir, "QA candidate build directory");

    runForeground("pnpm", ["--filter", "@homarr/nextjs", "with-env", "next", "build", "--webpack"], {
      ...sanitizeAppEnvironment(process.env),
      CI: "true",
      DISABLE_REDIS_LOGS: "true",
      HOMARR_QA_NEXT_DIST_DIR: buildPaths.distDirName,
      HOMARR_QA_STANDALONE_BUILD: "true",
      HOMARR_VERSION: candidateSha.slice(0, 12),
      NEXT_TELEMETRY_DISABLED: "1",
      NODE_OPTIONS: `--max-old-space-size=${candidateBuildHeapLimitMb}`,
      SKIP_ENV_VALIDATION: "true",
    });

    const staticTarget = path.join(buildPaths.standaloneAppDir, ".next/static");
    const publicTarget = path.join(buildPaths.standaloneAppDir, "public");
    await mkdir(path.dirname(staticTarget), { recursive: true });
    await cp(path.join(buildPaths.buildDir, "static"), staticTarget, { recursive: true, force: true });
    await cp(path.join(buildPaths.appRoot, "public"), publicTarget, { recursive: true, force: true });
    // The app package is ESM, while Next emits a CommonJS standalone launcher.
    // Give the generated launcher an explicit CommonJS extension before executing it.
    await rename(buildPaths.generatedServerPath, buildPaths.serverPath);
    const serverStats = await stat(buildPaths.serverPath);
    if (!serverStats.isFile()) throw new Error(`Standalone server is missing after build: ${buildPaths.serverPath}`);
    await writeJsonAtomic(buildPaths.markerPath, {
      schemaVersion: 1,
      candidateSha,
      runtimeMode,
      bundler: runtimeBundler,
      builtAt: new Date().toISOString(),
    });
    return buildPaths;
  } finally {
    await buildLease.release();
  }
};

const isProcessRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const waitForAppAttempt = async (
  spawned: SpawnedProcess,
  url: string,
  logPath: string,
  logOffset: number,
  timeoutMs: number,
): Promise<"ready" | "address-in-use"> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const exitCode = await Promise.race([
      spawned.exited,
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 250)),
    ]);
    if (exitCode !== undefined) {
      const log = await readFile(logPath, "utf8").catch(() => "");
      const attemptLog = log.slice(logOffset);
      if (/EADDRINUSE|address already in use/iu.test(attemptLog)) return "address-in-use";
      throw new Error(`QA app process exited during startup; inspect ${logPath}`);
    }

    try {
      const response = await fetch(`${url}/api/health/ready`, {
        redirect: "manual",
        signal: AbortSignal.timeout(5_000),
      });
      if (response.ok && isProcessRunning(spawned.pid)) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        if (isProcessRunning(spawned.pid)) return "ready";
      }
    } catch {
      // Continue while the selected process owns its startup attempt.
    }
  }
  throw new Error(`Timed out waiting for ${url}; inspect ${logPath}`);
};

const processBelongsToRun = async (pid: number, runId: string) => {
  if (!isProcessRunning(pid)) return false;
  try {
    const environment = await readFile(`/proc/${pid}/environ`);
    return environment.includes(Buffer.from(`QA_RUN_ID=${runId}\0`));
  } catch {
    return false;
  }
};

const stopProcess = async (pid: number, runId: string) => {
  if (!isProcessRunning(pid)) return;
  if (!(await processBelongsToRun(pid, runId))) {
    throw new Error(`Refusing to signal PID ${pid}: it is not owned by QA run ${runId}`);
  }
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    process.kill(pid, "SIGTERM");
  }
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline && isProcessRunning(pid)) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (isProcessRunning(pid)) {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      process.kill(pid, "SIGKILL");
    }
  }
};

const removeRedisContainer = (container: string, runId: string) => {
  const inspect = spawnSync(
    "docker",
    ["inspect", "--format", '{{ index .Config.Labels "com.homarr.release-v2-qa.run" }}', container],
    {
      encoding: "utf8",
    },
  );
  if (inspect.status !== 0) return;
  if (inspect.stdout.trim() !== runId)
    throw new Error(`Refusing to remove Docker container without matching QA run label: ${container}`);
  const result = spawnSync("docker", ["rm", "--force", container], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Failed to remove QA Redis container ${container}`);
};

const stopFromManifest = async (
  manifestPath: string,
  manifest: RuntimeManifest,
  expectedRunRoot: string,
  expectedSlot: number,
) => {
  if (manifest.status === "stopped") return;
  const expectedSlotDir = path.join(expectedRunRoot, "slots", String(expectedSlot));
  const expectedManifestPath = path.join(expectedSlotDir, "runtime-manifest.json");
  if (path.resolve(manifest.runRoot) !== expectedRunRoot || manifest.slot !== expectedSlot) {
    throw new Error(`Refusing runtime manifest for a different QA run-root or slot: ${manifestPath}`);
  }
  if (path.resolve(manifestPath) !== expectedManifestPath) {
    throw new Error(`Refusing runtime manifest outside the selected slot: ${manifestPath}`);
  }
  if (path.resolve(manifest.slotDir) !== path.resolve(expectedSlotDir)) {
    throw new Error(`Refusing runtime manifest with an unsafe slot directory: ${manifest.slotDir}`);
  }
  await assertSafeContainedPath(expectedRunRoot, expectedSlotDir, "QA slot directory");
  await stopProcess(manifest.processes.app.pid, manifest.runId);
  await stopProcess(manifest.processes.fixture.pid, manifest.runId);
  removeRedisContainer(manifest.docker.redisContainer, manifest.runId);
  const stopped: RuntimeManifest = { ...manifest, status: "stopped", stoppedAt: new Date().toISOString() };
  await assertSafeContainedPath(expectedRunRoot, manifestPath, "QA runtime manifest");
  await writeJsonAtomic(manifestPath, stopped);
};

const profileFlags = (profile: Profile) => ({
  demoMode: profile !== "onboarding-fresh",
  demoReadOnly: profile === "main-readonly",
  unsafeMockIntegration: true,
});

const startWithLease = async (options: Options) => {
  const candidateSha = resolveCandidate(options.candidate);
  const checkoutSha = resolveCandidate("HEAD");
  if (checkoutSha !== candidateSha) {
    throw new Error(`The requested candidate ${candidateSha} does not match the checked-out HEAD ${checkoutSha}`);
  }
  const branch = currentBranch();

  await mkdir(options.runRoot, { recursive: true, mode: 0o700 });
  await assertSafeRunRoot(options.runRoot);
  await chmod(options.runRoot, 0o700);
  await assertSafeRunRoot(options.runRoot);
  const markerPath = path.join(options.runRoot, markerName);
  await assertSafeContainedPath(options.runRoot, markerPath, "QA run-root marker");
  if (!existsSync(markerPath)) {
    await assertSafeContainedPath(options.runRoot, markerPath, "QA run-root marker");
    await writeJsonAtomic(markerPath, {
      schemaVersion: 1,
      repoRoot,
      runRoot: options.runRoot,
      createdAt: new Date().toISOString(),
    });
  } else {
    await assertRunRootMarker(options.runRoot);
  }
  const candidateBuild = await ensureCandidateBuild(options.runRoot, candidateSha);

  const slotsRoot = path.join(options.runRoot, "slots");
  await assertSafeContainedPath(options.runRoot, slotsRoot, "QA slots directory");
  await mkdir(slotsRoot, { recursive: true, mode: 0o700 });
  await assertSafeContainedPath(options.runRoot, slotsRoot, "QA slots directory");
  const slotDir = path.join(slotsRoot, String(options.slot));
  await assertSafeContainedPath(options.runRoot, slotDir, "QA slot directory");
  const manifestPath = path.join(slotDir, "runtime-manifest.json");
  if (existsSync(manifestPath)) {
    await assertSafeContainedPath(options.runRoot, manifestPath, "QA runtime manifest");
    const existing = await readManifest(manifestPath);
    if (!options.reset) throw new Error(`Slot ${options.slot} already has a manifest; pass --reset to replace it`);
    await stopFromManifest(manifestPath, existing, options.runRoot, options.slot);
    await assertSafeContainedPath(options.runRoot, slotDir, "QA slot reset target");
    await rm(slotDir, { recursive: true });
    await assertSafeContainedPath(options.runRoot, slotDir, "QA slot reset target");
  } else if (existsSync(slotDir)) {
    if (!options.reset) throw new Error(`Slot ${options.slot} has incomplete state; pass --reset to replace it`);
    await assertSafeContainedPath(options.runRoot, slotDir, "QA slot reset target");
    await rm(slotDir, { recursive: true });
    await assertSafeContainedPath(options.runRoot, slotDir, "QA slot reset target");
  }
  const legacyNextDistDir = path.join(repoRoot, "apps/nextjs/.next-qa", `slot-${options.slot}`);
  if (options.reset) {
    await assertSafeContainedPath(
      path.join(repoRoot, "apps/nextjs"),
      legacyNextDistDir,
      "legacy QA Next cache reset target",
    );
    await rm(legacyNextDistDir, { recursive: true, force: true });
    await assertSafeContainedPath(
      path.join(repoRoot, "apps/nextjs"),
      legacyNextDistDir,
      "legacy QA Next cache reset target",
    );
  }
  await assertSafeContainedPath(options.runRoot, slotDir, "QA slot creation target");
  await mkdir(slotDir, { mode: 0o700 });
  await assertSafeContainedPath(options.runRoot, slotDir, "QA slot directory");
  await chmod(slotDir, 0o700);
  await assertSafeContainedPath(options.runRoot, slotDir, "QA slot directory");

  const runId = `release-v2-${candidateSha.slice(0, 8)}-s${options.slot}-${Date.now()}`;
  const redisContainer = `homarr-release-v2-qa-redis-s${options.slot}-${candidateSha.slice(0, 8)}-${Date.now().toString(36)}`;
  const dbPath = path.join(slotDir, "db.sqlite");
  const fixtureReadyPath = path.join(slotDir, "fixture-ready.json");
  const fixtureManifestPath = path.join(slotDir, "fixture-manifest.json");
  const fixtureLogPath = path.join(slotDir, "fixture.log");
  const appLogPath = path.join(slotDir, "app.log");
  const flags = profileFlags(options.profile);
  let fixturePid: number | undefined;
  let appPid: number | undefined;
  let appPortReservation: PortReservation | undefined;
  let redisCreated = false;

  try {
    const redisRun = spawnSync(
      "docker",
      [
        "run",
        "--detach",
        "--name",
        redisContainer,
        "--label",
        `com.homarr.release-v2-qa.run=${runId}`,
        "--publish",
        "127.0.0.1::6379",
        "redis:latest",
      ],
      { encoding: "utf8" },
    );
    if (redisRun.status !== 0) throw new Error(`Unable to start QA Redis: ${redisRun.stderr.trim()}`);
    redisCreated = true;
    const redisPortOutput = commandOutput("docker", ["port", redisContainer, "6379/tcp"]);
    const redisPort = Number(redisPortOutput.split(":").at(-1));
    if (!Number.isInteger(redisPort)) throw new Error(`Unable to parse QA Redis port: ${redisPortOutput}`);

    await assertSafeContainedPath(options.runRoot, fixtureReadyPath, "QA fixture readiness file");
    await assertSafeContainedPath(options.runRoot, fixtureLogPath, "QA fixture log");
    const fixtureProcess = spawnLogged(
      process.execPath,
      ["--import", "tsx", "scripts/release-v2-qa/fixture-server.mts", "--port", "0", "--ready-file", fixtureReadyPath],
      fixtureLogPath,
      createFixtureEnvironment(runId),
    );
    fixturePid = fixtureProcess.pid;
    const fixtureReady = await waitForJsonFile<{ url: string; port: number }>(fixtureReadyPath, 30_000);
    await waitForUrl(`${fixtureReady.url}/health`, 30_000);
    appPortReservation = await reserveLoopbackPort();
    let appPort = appPortReservation.port;
    let url = `http://127.0.0.1:${appPort}`;
    let qaPassword = process.env.QA_PASSWORD;
    if (!qaPassword && process.env.QA_PASSWORD_FILE) {
      qaPassword = (await readFile(path.resolve(process.env.QA_PASSWORD_FILE), "utf8")).trim();
    }
    if (flags.demoMode && !qaPassword) {
      throw new Error("QA_PASSWORD or QA_PASSWORD_FILE is required for populated QA profiles");
    }

    const environment: NodeJS.ProcessEnv = {
      ...process.env,
      AUTH_SECRET: randomBytes(32).toString("hex"),
      AUTH_PROVIDERS: "credentials",
      AUTH_COOKIE_PREFIX: `homarr_qa_s${options.slot}`,
      DB_DRIVER: "better-sqlite3",
      DB_URL: dbPath,
      DEMO_MODE: String(flags.demoMode),
      DEMO_READ_ONLY: String(flags.demoReadOnly),
      UNSAFE_ENABLE_MOCK_INTEGRATION: String(flags.unsafeMockIntegration),
      SECRET_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
      REDIS_IS_EXTERNAL: "true",
      REDIS_HOST: "127.0.0.1",
      REDIS_PORT: String(redisPort),
      REDIS_DATABASE_INDEX: String(options.slot),
      QA_CANDIDATE_SHA: candidateSha,
      QA_FIXTURE_URL: fixtureReady.url,
      QA_PROFILE: options.profile,
      QA_RUN_ID: runId,
      QA_RUN_ROOT: options.runRoot,
      QA_SLOT: String(options.slot),
      QA_PASSWORD: qaPassword,
      HOMARR_WEBSITE_URL: url,
      WORKSHOP_API_URL: fixtureReady.url,
      WORKSHOP_WEB_URL: `${fixtureReady.url}/iframe`,
      HOMARR_QA_NEXT_DIST_DIR: candidateBuild.distDirName,
      HOMARR_VERSION: candidateSha.slice(0, 12),
      NEXT_TELEMETRY_DISABLED: "1",
    };

    await assertSafeContainedPath(options.runRoot, dbPath, "QA SQLite database");
    runForeground("pnpm", ["db:migration:sqlite:run"], environment);
    await assertSafeContainedPath(options.runRoot, dbPath, "QA SQLite database");
    await assertSafeContainedPath(options.runRoot, fixtureManifestPath, "QA fixture manifest");
    runForeground("pnpm", ["qa:release-v2:seed", "--", "--profile", options.profile, "--output", slotDir], environment);
    await assertSafeContainedPath(options.runRoot, fixtureManifestPath, "QA fixture manifest");

    const appEnvironment = sanitizeAppEnvironment(environment);
    await assertSafeContainedPath(options.runRoot, appLogPath, "QA app log");
    const launchedApp = await launchWithPortRetry<{ pid: number; port: number; url: string }>(
      async (attemptPort) => {
        appPort = attemptPort;
        url = `http://127.0.0.1:${appPort}`;
        const appLaunch = createAppLaunchCommand(candidateBuild.serverPath);
        const logOffset = await stat(appLogPath)
          .then((stats) => stats.size)
          .catch(() => 0);
        await assertSafeContainedPath(options.runRoot, appLogPath, "QA app log");
        const spawned = spawnLogged(
          appLaunch.command,
          appLaunch.arguments,
          appLogPath,
          {
            ...appEnvironment,
            HOSTNAME: "127.0.0.1",
            HOMARR_WEBSITE_URL: url,
            NODE_ENV: "production",
            PORT: String(appPort),
          },
          { cwd: candidateBuild.standaloneRoot },
        );
        appPid = spawned.pid;
        const outcome = await waitForAppAttempt(spawned, url, appLogPath, logOffset, 300_000);
        if (outcome === "address-in-use") {
          appPid = undefined;
          return { status: "address-in-use" } as const;
        }
        return { status: "ready", value: { pid: spawned.pid, port: appPort, url } } as const;
      },
      { initialReservation: appPortReservation },
    );
    appPortReservation = undefined;
    appPid = launchedApp.pid;
    appPort = launchedApp.port;
    url = launchedApp.url;

    const manifest: RuntimeManifest = {
      schemaVersion: 1,
      runId,
      status: "running",
      candidateSha,
      branch,
      slot: options.slot,
      profile: options.profile,
      startedAt: new Date().toISOString(),
      repoRoot,
      runRoot: options.runRoot,
      slotDir,
      dbPath,
      fixtureManifestPath,
      nextDistDir: candidateBuild.buildDir,
      url,
      fixtureUrl: fixtureReady.url,
      ports: { app: appPort, fixture: fixtureReady.port, redis: redisPort },
      flags,
      ...createRuntimeExecutionContract(),
      build: { candidateSha, serverPath: candidateBuild.serverPath },
      processes: {
        app: { pid: appPid, logPath: appLogPath },
        fixture: { pid: fixturePid, logPath: fixtureLogPath },
      },
      docker: { redisContainer },
    };
    await writeJsonAtomic(manifestPath, manifest);
    console.log(JSON.stringify(manifest, null, 2));
  } catch (error) {
    if (appPortReservation) await appPortReservation.release();
    if (appPid) await stopProcess(appPid, runId);
    if (fixturePid) await stopProcess(fixturePid, runId);
    if (redisCreated) removeRedisContainer(redisContainer, runId);
    throw error;
  }
};

const start = async (options: Options) => {
  options.runRoot = await assertSafeRunRoot(options.runRoot, { allowMissing: true });
  const lease = await acquireSlotLease(options.runRoot, options.slot, `start:${options.profile}`);
  try {
    await startWithLease(options);
  } finally {
    await lease.release();
  }
};

const status = async (options: Options) => {
  options.runRoot = await assertSafeRunRoot(options.runRoot);
  await assertRunRootMarker(options.runRoot);
  const manifestPath = path.join(options.runRoot, "slots", String(options.slot), "runtime-manifest.json");
  await assertSafeContainedPath(options.runRoot, manifestPath, "QA runtime manifest");
  const manifest = await readManifest(manifestPath);
  const appReachable = await fetch(`${manifest.url}/api/health/live`, { signal: AbortSignal.timeout(5_000) })
    .then((response) => response.ok)
    .catch(() => false);
  const fixtureReachable = await fetch(`${manifest.fixtureUrl}/health`, { signal: AbortSignal.timeout(5_000) })
    .then((response) => response.ok)
    .catch(() => false);
  const redisRunning =
    spawnSync("docker", ["inspect", "--format", "{{.State.Running}}", manifest.docker.redisContainer], {
      encoding: "utf8",
    }).stdout.trim() === "true";
  console.log(
    JSON.stringify(
      {
        ...manifest,
        observed: {
          appProcess: await processBelongsToRun(manifest.processes.app.pid, manifest.runId),
          fixtureProcess: await processBelongsToRun(manifest.processes.fixture.pid, manifest.runId),
          appReachable,
          fixtureReachable,
          redisRunning,
        },
      },
      null,
      2,
    ),
  );
};

const stopWithLease = async (options: Options) => {
  const markerPath = path.join(options.runRoot, markerName);
  await assertSafeContainedPath(options.runRoot, markerPath, "QA run-root marker");
  if (!existsSync(markerPath)) throw new Error(`QA run-root marker is missing: ${markerPath}`);
  await assertRunRootMarker(options.runRoot);
  const manifestPath = path.join(options.runRoot, "slots", String(options.slot), "runtime-manifest.json");
  await assertSafeContainedPath(options.runRoot, manifestPath, "QA runtime manifest");
  const manifest = await readManifest(manifestPath);
  await stopFromManifest(manifestPath, manifest, options.runRoot, options.slot);
  console.log(`Stopped release-v2 QA slot ${options.slot}`);
};

const stop = async (options: Options) => {
  options.runRoot = await assertSafeRunRoot(options.runRoot);
  const lease = await acquireSlotLease(options.runRoot, options.slot, "stop");
  try {
    await stopWithLease(options);
  } finally {
    await lease.release();
  }
};

const main = async () => {
  const options = parseArgs();
  assertRuntimeCommandPlatform(options.command);
  if (options.command === "start") await start(options);
  else if (options.command === "status") await status(options);
  else await stop(options);
};

const isDirectExecution = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(fileURLToPath(import.meta.url)).href
  : false;
if (isDirectExecution) await main();
