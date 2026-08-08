import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, lstat, mkdir, mkdtemp, readFile, readlink, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";

import {
  applyDockerBuildSyntheticSourceChange,
  fingerprintDockerBuildSource,
  getBuildCacheContinuityIneligibleReasons,
  getBuildCacheStateIneligibleReasons,
  getDockerBuildClaimIneligibleReasons,
  getMeasuredRevision,
  normalizeDockerArchitecture,
  parseDockerBuildCacheMountDescription,
  parseDockerBuildOutput,
  parseDockerfileCacheMounts,
} from "./docker-build-lib.mts";
import type { DockerBuildSourceEntry } from "./docker-build-lib.mts";

const runStartedAt = new Date().toISOString();
const execFileAsync = promisify(execFile);
const contextDirectory = path.resolve(process.env.BUILD_BENCHMARK_CONTEXT ?? ".");
const declaredRevision = process.env.BUILD_BENCHMARK_REVISION?.trim() || null;
const mode = process.env.BUILD_BENCHMARK_MODE ?? "cached";
if (mode !== "cached" && mode !== "no-cache" && mode !== "source-change") {
  throw new Error("BUILD_BENCHMARK_MODE must be cached, no-cache, or source-change");
}
const sourceChangeId = process.env.BUILD_BENCHMARK_SOURCE_CHANGE_ID?.trim() || null;
if (mode === "source-change" && !sourceChangeId) {
  throw new Error("BUILD_BENCHMARK_SOURCE_CHANGE_ID is required in source-change mode");
}

const imageTag = process.env.BUILD_BENCHMARK_IMAGE ?? `homarr-build-benchmark:${process.pid}`;
const builder = process.env.BUILD_BENCHMARK_BUILDER?.trim() || null;
const runLabel = process.env.BUILD_BENCHMARK_RUN_LABEL?.trim() || null;
const seriesId = process.env.BUILD_BENCHMARK_SERIES_ID?.trim() || null;
const cacheState = process.env.BUILD_BENCHMARK_CACHE_STATE?.trim() || null;
const repetition = Number(process.env.BUILD_BENCHMARK_REPETITION ?? 0);
const totalRepetitions = Number(process.env.BUILD_BENCHMARK_TOTAL_REPETITIONS ?? 0);
const outputDirectory = path.resolve(process.env.BUILD_BENCHMARK_OUTPUT_DIR ?? "benchmark-results/docker-build");
const cacheSnapshotPollMs = 2_000;
const cacheSnapshotStableMs = 10_000;
const cacheSnapshotTimeoutMs = 30_000;
const execGitAsync = async (args: string[]) =>
  await execFileAsync("git", ["-C", contextDirectory, ...args], { maxBuffer: 16 * 1024 * 1024 });

const inspectDockerServerAsync = async () => {
  const { stdout } = await execFileAsync("docker", ["version", "--format", "{{json .Server}}"], {
    maxBuffer: 16 * 1024 * 1024,
  });
  const server = JSON.parse(stdout) as {
    ApiVersion?: string;
    Arch?: string;
    Os?: string;
    Version?: string;
  } | null;
  if (!server?.Arch || !server.Os) throw new Error("Docker server OS and architecture could not be inspected");
  const architecture = normalizeDockerArchitecture(server.Arch);
  return {
    apiVersion: server.ApiVersion ?? null,
    architecture,
    operatingSystem: server.Os.toLowerCase(),
    targetPlatform: `${server.Os.toLowerCase()}/${architecture}`,
    version: server.Version ?? null,
  };
};

const fingerprintSourceAsync = async () => {
  const { stdout } = await execGitAsync(["ls-files", "--cached", "--others", "--exclude-standard", "-z"]);
  const files = stdout.split("\0").filter(Boolean).toSorted();
  let fileCount = 0;
  const entries: DockerBuildSourceEntry[] = [];

  for (const file of files) {
    const absolutePath = path.join(contextDirectory, file);
    const stats = await lstat(absolutePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (!stats) continue;
    fileCount += 1;
    const entry: DockerBuildSourceEntry = stats.isSymbolicLink()
      ? { file, mode: stats.mode, linkTarget: await readlink(absolutePath) }
      : { file, mode: stats.mode, content: await readFile(absolutePath) };
    entries.push(entry);
  }

  return { fingerprint: fingerprintDockerBuildSource(entries), fileCount, entries };
};

const materializeSourceSnapshotAsync = async (entries: DockerBuildSourceEntry[]) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "homarr-build-benchmark-"));
  for (const entry of entries) {
    const destination = path.join(directory, entry.file);
    await mkdir(path.dirname(destination), { recursive: true });
    if (entry.linkTarget !== undefined) {
      await symlink(entry.linkTarget, destination);
    } else {
      await writeFile(destination, entry.content);
      await chmod(destination, entry.mode & 0o777);
    }
  }
  return directory;
};

const runDockerBuildAsync = async (args: string[]) =>
  await new Promise<{ output: string; wallTimeMs: number }>((resolve, reject) => {
    const startedAt = performance.now();
    const child = spawn("docker", args, { cwd: contextDirectory, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    const capture = (chunk: Buffer) => {
      chunks.push(chunk);
      process.stdout.write(chunk);
    };
    child.stdout.on("data", capture);
    child.stderr.on("data", capture);
    child.once("error", reject);
    child.once("close", (code) => {
      const output = Buffer.concat(chunks).toString("utf8");
      const wallTimeMs = Math.round(performance.now() - startedAt);
      if (code !== 0) {
        reject(new Error(`docker build exited with ${String(code)} after ${wallTimeMs}ms`));
        return;
      }
      resolve({ output, wallTimeMs });
    });
  });

const inspectBuilderCacheAsync = async () => {
  if (!builder) return null;
  await execFileAsync("docker", ["buildx", "inspect", "--builder", builder, "--bootstrap"], {
    maxBuffer: 16 * 1024 * 1024,
  });
  const { stdout } = await execFileAsync("docker", ["buildx", "du", "--builder", builder, "--format", "json"], {
    maxBuffer: 16 * 1024 * 1024,
  });
  const records = stdout
    .split("\n")
    .filter(Boolean)
    .map(
      (line) =>
        JSON.parse(line) as {
          CreatedAt?: string;
          Description?: string;
          ID: string;
          Mutable?: boolean;
          Parents?: string[];
          Reclaimable?: boolean;
          Shared?: boolean;
          Size?: string;
          Type?: string;
          UsageCount?: number;
        },
    );
  const normalizedRecords = records
    .map(({ CreatedAt, Description, ID, Mutable, Parents, Reclaimable, Shared, Size, Type, UsageCount }) => ({
      createdAt: CreatedAt ?? null,
      description: Description ?? null,
      id: ID,
      mutable: Mutable ?? null,
      parents: Parents?.toSorted() ?? [],
      reclaimable: Reclaimable ?? null,
      shared: Shared ?? null,
      size: Size ?? null,
      type: Type ?? null,
      usageCount: UsageCount ?? null,
    }))
    .toSorted((left, right) => left.id.localeCompare(right.id));
  const cacheMounts = records
    .filter(({ Type }) => Type === "exec.cachemount")
    .map(({ Description, ID, Size, UsageCount }) => {
      const description = Description ?? null;
      const identity = parseDockerBuildCacheMountDescription(description);
      return {
        description,
        logicalId: identity?.logicalId ?? null,
        recordId: ID,
        size: Size ?? null,
        target: identity?.target ?? null,
        usageCount: UsageCount ?? null,
      };
    });
  return {
    cacheMountCount: cacheMounts.length,
    cacheMounts,
    recordCount: records.length,
    recordsFingerprint: createHash("sha256").update(JSON.stringify(normalizedRecords)).digest("hex"),
  };
};

const inspectSettledBuilderCacheAsync = async () => {
  if (!builder) return { snapshot: null, stability: null };
  const startedAt = performance.now();
  let attempts = 1;
  let previous = await inspectBuilderCacheAsync();
  let stableSince = performance.now();

  while (performance.now() - startedAt < cacheSnapshotTimeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, cacheSnapshotPollMs));
    const current = await inspectBuilderCacheAsync();
    attempts += 1;
    if (current?.recordsFingerprint !== previous?.recordsFingerprint) stableSince = performance.now();
    previous = current;
    const stableForMs = Math.round(performance.now() - stableSince);
    if (stableForMs >= cacheSnapshotStableMs) {
      return {
        snapshot: current,
        stability: { attempts, pollIntervalMs: cacheSnapshotPollMs, stableForMs, timeoutMs: cacheSnapshotTimeoutMs },
      };
    }
  }

  throw new Error(`Docker builder cache did not settle for ${cacheSnapshotStableMs}ms`);
};

await mkdir(outputDirectory, { recursive: true });
const [{ stdout: headOutput }, { stdout: statusOutput }, source, dockerServer] = await Promise.all([
  execGitAsync(["rev-parse", "HEAD"]),
  execGitAsync(["status", "--porcelain=v1"]),
  fingerprintSourceAsync(),
  inspectDockerServerAsync(),
]);
const headSha = headOutput.trim();
const dirty = statusOutput.trim().length > 0;
const measuredRevision = getMeasuredRevision(headSha, dirty);
const dockerfile = source.entries.find(({ file }) => file === "Dockerfile");
if (!dockerfile?.content) throw new Error("Docker build context contains no regular Dockerfile");
const expectedCacheMounts = parseDockerfileCacheMounts(
  dockerfile.content.toString("utf8"),
  dockerServer.targetPlatform,
);
const cacheBefore = await inspectBuilderCacheAsync();
const syntheticSource =
  mode === "source-change"
    ? applyDockerBuildSyntheticSourceChange(source.entries, sourceChangeId as string)
    : { entries: source.entries, change: null };
const measuredSourceFingerprint = fingerprintDockerBuildSource(syntheticSource.entries);

const buildArgs = [
  "build",
  "--progress=plain",
  "--platform",
  dockerServer.targetPlatform,
  "--label",
  `org.opencontainers.image.revision=${measuredRevision}`,
  "--label",
  `dev.homarr.source-fingerprint=${measuredSourceFingerprint}`,
  "--tag",
  imageTag,
];
if (builder) buildArgs.push("--builder", builder, "--load");
if (mode === "no-cache") buildArgs.push("--no-cache");
const snapshotDirectory = await materializeSourceSnapshotAsync(syntheticSource.entries);
buildArgs.push(snapshotDirectory);

const build = await runDockerBuildAsync(buildArgs).finally(
  async () => await rm(snapshotDirectory, { recursive: true }),
);
const { snapshot: cacheAfter, stability: cacheAfterStability } = await inspectSettledBuilderCacheAsync();
const imageInspect = JSON.parse((await execFileAsync("docker", ["image", "inspect", imageTag])).stdout)[0] as {
  Architecture: string;
  Config?: { Labels?: Record<string, string> };
  Id: string;
  RepoDigests?: string[];
  Size: number;
};
const labels = imageInspect.Config?.Labels ?? {};
const parsedBuild = parseDockerBuildOutput(build.output);
const claimIneligibleReasons = getDockerBuildClaimIneligibleReasons({
  expectedRevision: measuredRevision,
  expectedSourceFingerprint: measuredSourceFingerprint,
  imageArchitecture: imageInspect.Architecture,
  imageRevision: labels["org.opencontainers.image.revision"] ?? null,
  imageSourceFingerprint: labels["dev.homarr.source-fingerprint"] ?? null,
  expectedImageArchitecture: dockerServer.architecture.split("/")[0] as string,
});
if (!declaredRevision) claimIneligibleReasons.push("BUILD_BENCHMARK_REVISION is missing");
else if (declaredRevision !== measuredRevision) {
  claimIneligibleReasons.push(`declared revision ${declaredRevision} does not match measured ${measuredRevision}`);
}
if (!builder) claimIneligibleReasons.push("BUILD_BENCHMARK_BUILDER is missing");
if (!seriesId) claimIneligibleReasons.push("BUILD_BENCHMARK_SERIES_ID is missing");
claimIneligibleReasons.push(...getBuildCacheStateIneligibleReasons(cacheState, cacheBefore, expectedCacheMounts));
claimIneligibleReasons.push(
  ...getBuildCacheContinuityIneligibleReasons(cacheState, cacheBefore, cacheAfter, expectedCacheMounts),
);
if (mode === "cached") claimIneligibleReasons.push("cached mode does not force an application rebuild");
if (mode === "no-cache" && cacheState === "warm") {
  claimIneligibleReasons.push("no-cache mode resets BuildKit cache mounts and cannot measure a warm build");
}
if (mode !== "cached" && parsedBuild.nextCompileMs === null) {
  claimIneligibleReasons.push("application build did not expose a Next compilation measurement");
}
if (!Number.isInteger(totalRepetitions) || totalRepetitions < 2) {
  claimIneligibleReasons.push("BUILD_BENCHMARK_TOTAL_REPETITIONS must be at least 2");
}
if (!Number.isInteger(repetition) || repetition < 1 || repetition > totalRepetitions) {
  claimIneligibleReasons.push("BUILD_BENCHMARK_REPETITION is outside the declared series");
}
const timestamp = Date.now();
const logPath = path.join(outputDirectory, `build-${timestamp}.log`);
const outputPath = path.join(outputDirectory, `build-${timestamp}.json`);
const runFinishedAt = new Date().toISOString();
const result = {
  schemaVersion: 4,
  claimEligible: claimIneligibleReasons.length === 0,
  claimIneligibleReasons,
  createdAt: runFinishedAt,
  run: { startedAt: runStartedAt, finishedAt: runFinishedAt },
  mode,
  builder,
  runLabel,
  declaredRevision,
  series: { id: seriesId, cacheState, repetition, totalRepetitions },
  source: {
    contextDirectory,
    headSha,
    dirty,
    measuredRevision,
    fingerprint: measuredSourceFingerprint,
    baseFingerprint: source.fingerprint,
    fileCount: source.fileCount,
    immutableSnapshot: true,
    syntheticSourceChange: syntheticSource.change,
  },
  builderCache: {
    expected: expectedCacheMounts,
    before: cacheBefore,
    after: cacheAfter,
    afterStability: cacheAfterStability,
  },
  host: { architecture: process.arch, cpuCount: os.cpus().length, dockerServer, platform: os.platform() },
  image: {
    requested: imageTag,
    id: imageInspect.Id,
    digest: imageInspect.RepoDigests?.[0] ?? null,
    revision: labels["org.opencontainers.image.revision"] ?? null,
    sourceFingerprint: labels["dev.homarr.source-fingerprint"] ?? null,
    architecture: imageInspect.Architecture,
    targetPlatform: dockerServer.targetPlatform,
    localUncompressedBytes: imageInspect.Size,
  },
  build: { wallTimeMs: build.wallTimeMs, ...parsedBuild },
  logPath,
};

await Promise.all([writeFile(logPath, build.output), writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`)]);
console.log(JSON.stringify({ outputPath, ...result }, null, 2));
