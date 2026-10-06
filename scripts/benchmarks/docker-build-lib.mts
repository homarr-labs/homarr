import { createHash } from "node:crypto";

export type DockerBuildSourceEntry =
  | { file: string; mode: number; content: Buffer; linkTarget?: never }
  | { file: string; mode: number; content?: never; linkTarget: string };

export type DockerBuildSyntheticSourceChange = {
  file: string;
  id: string;
  from: string;
  to: string;
};

export const nextBuildCacheTarget = "/app/apps/nextjs/.next/cache";

export type ExpectedDockerBuildCacheMount = {
  logicalId: string;
  target: string;
  mustIncreaseUsage: boolean;
};

export type DockerBuildCacheMount = {
  description: string | null;
  logicalId: string | null;
  recordId: string;
  size: string | null;
  target: string | null;
  usageCount: number | null;
};

export type DockerBuildCacheSnapshot = {
  cacheMountCount: number;
  cacheMounts: DockerBuildCacheMount[];
  recordCount: number;
};

export const fingerprintDockerBuildSource = (entries: DockerBuildSourceEntry[]) => {
  const hash = createHash("sha256");
  for (const entry of entries.toSorted((left, right) => left.file.localeCompare(right.file))) {
    hash.update(entry.file);
    hash.update("\0");
    hash.update(String(entry.mode));
    hash.update("\0");
    hash.update(entry.linkTarget ?? entry.content);
    hash.update("\0");
  }
  return hash.digest("hex");
};

export const applyDockerBuildSyntheticSourceChange = (
  entries: DockerBuildSourceEntry[],
  id: string,
): { entries: DockerBuildSourceEntry[]; change: DockerBuildSyntheticSourceChange } => {
  const file = "apps/nextjs/src/app/[locale]/layout.tsx";
  const from = 'siteName: "Homarr",';
  const to = `siteName: ${JSON.stringify(`Homarr build benchmark ${id}`)},`;
  let changed = false;
  const nextEntries = entries.map((entry) => {
    if (entry.file !== file || entry.content === undefined) return entry;
    const source = entry.content.toString("utf8");
    if (source.split(from).length !== 2) {
      throw new Error(`Expected exactly one build benchmark source marker in ${file}`);
    }
    changed = true;
    return { ...entry, content: Buffer.from(source.replace(from, to)) };
  });
  if (!changed) throw new Error(`Build benchmark source marker file is missing: ${file}`);
  return { entries: nextEntries, change: { file, id, from, to } };
};

const expandDockerfileMountValue = (value: string, variables: Record<string, string>) => {
  const expanded = value.replaceAll(
    /\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/g,
    (reference, braced, plain) => {
      const name = (braced ?? plain) as string;
      const replacement = variables[name];
      if (replacement === undefined) {
        throw new Error(`Dockerfile cache mount contains unresolved variable ${reference}`);
      }
      return replacement;
    },
  );
  if (expanded.includes("$")) {
    throw new Error(`Dockerfile cache mount contains unresolved variable in ${value}`);
  }
  return expanded;
};

export const parseDockerfileCacheMounts = (
  dockerfile: string,
  targetPlatform: string,
): ExpectedDockerBuildCacheMount[] => {
  const mounts = [...dockerfile.matchAll(/--mount=([^\s\\]+)/g)]
    .map(([, serialized = ""]) =>
      Object.fromEntries(
        serialized.split(",").map((option) => {
          const separator = option.indexOf("=");
          return separator === -1 ? [option, ""] : [option.slice(0, separator), option.slice(separator + 1)];
        }),
      ),
    )
    .filter(({ type }) => type === "cache")
    .map((options) => {
      const id = options.id;
      const target = options.target ?? options.dst ?? options.destination;
      if (!id || !target) {
        throw new Error("Dockerfile cache mounts must declare explicit id and target options");
      }
      const variables = { TARGETPLATFORM: targetPlatform };
      const logicalId = expandDockerfileMountValue(id, variables);
      const expandedTarget = expandDockerfileMountValue(target, variables);
      return {
        logicalId,
        target: expandedTarget,
        mustIncreaseUsage: expandedTarget === nextBuildCacheTarget,
      };
    });

  const uniqueMounts = new Map(mounts.map((mount) => [`${mount.logicalId}\0${mount.target}`, mount]));
  return [...uniqueMounts.values()].toSorted(
    (left, right) => left.logicalId.localeCompare(right.logicalId) || left.target.localeCompare(right.target),
  );
};

export const parseDockerBuildCacheMountDescription = (description: string | null) => {
  if (!description) return null;
  const match = /^cached mount (\S+) from exec .* with id "(\/[^"\n]+)"$/.exec(description);
  if (!match) return null;
  const [, target = "", printedId = ""] = match;
  return { logicalId: printedId.slice(1), target };
};

export const normalizeDockerArchitecture = (architecture: string) => {
  switch (architecture.toLowerCase()) {
    case "x64":
    case "x86_64":
      return "amd64";
    case "aarch64":
      return "arm64";
    case "armv6l":
      return "arm/v6";
    case "armv7l":
      return "arm/v7";
    default:
      return architecture.toLowerCase();
  }
};

export const parseDockerBuildOutput = (output: string) => {
  const compileDurationsMs = [...output.matchAll(/Compiled (?:successfully )?in\s+([\d.]+)\s*(ms|s)/gi)].map(
    ([, value = "0", unit = "ms"]) => Number(value) * (unit.toLowerCase() === "s" ? 1_000 : 1),
  );

  return {
    cachedStepCount: (output.match(/^#\d+ CACHED$/gm) ?? []).length,
    completedStepCount: (output.match(/^#\d+ DONE(?:\s+[\d.]+s)?$/gm) ?? []).length,
    nextCompileMs: compileDurationsMs.at(-1) ?? null,
  };
};

export const getMeasuredRevision = (headSha: string, dirty: boolean) => (dirty ? `${headSha}+worktree` : headSha);

export const getBuildCacheStateIneligibleReasons = (
  cacheState: string | null,
  snapshot: DockerBuildCacheSnapshot | null,
  expectedMounts: ExpectedDockerBuildCacheMount[],
) => {
  if (cacheState !== "cold" && cacheState !== "warm") {
    return ["BUILD_BENCHMARK_CACHE_STATE must be cold or warm"];
  }
  if (!snapshot) return ["Docker builder cache state could not be inspected"];
  if (cacheState === "cold" && snapshot.recordCount !== 0) {
    return [`cold builder already contains ${snapshot.recordCount} cache records`];
  }
  if (cacheState === "warm" && expectedMounts.length === 0) {
    return ["Dockerfile declares no cache mounts for a warm build"];
  }
  if (cacheState === "warm") {
    return expectedMounts.flatMap((expected) => {
      const matches = snapshot.cacheMounts.filter(
        ({ logicalId, target }) => logicalId === expected.logicalId && target === expected.target,
      );
      if (matches.length === 0) {
        return [`warm builder is missing cache mount ${expected.logicalId} at ${expected.target}`];
      }
      if (matches.length > 1) {
        return [`warm builder contains duplicate cache mounts ${expected.logicalId} at ${expected.target}`];
      }
      return [];
    });
  }
  return [];
};

export const getBuildCacheContinuityIneligibleReasons = (
  cacheState: string | null,
  before: DockerBuildCacheSnapshot | null,
  after: DockerBuildCacheSnapshot | null,
  expectedMounts: ExpectedDockerBuildCacheMount[],
) => {
  if (cacheState !== "warm") return [];
  if (!before || !after) return ["warm builder cache continuity could not be inspected"];

  return expectedMounts.flatMap((expected) => {
    const beforeMatches = before.cacheMounts.filter(
      ({ logicalId, target }) => logicalId === expected.logicalId && target === expected.target,
    );
    const afterMatches = after.cacheMounts.filter(
      ({ logicalId, target }) => logicalId === expected.logicalId && target === expected.target,
    );
    if (beforeMatches.length !== 1 || afterMatches.length !== 1) {
      return [`warm cache mount ${expected.logicalId} at ${expected.target} could not be traced across the build`];
    }
    const beforeMount = beforeMatches[0];
    const afterMount = afterMatches[0];
    if (!beforeMount || !afterMount || beforeMount.recordId !== afterMount.recordId) {
      return [`warm cache mount ${expected.logicalId} at ${expected.target} was replaced during the build`];
    }
    if (!expected.mustIncreaseUsage) return [];
    if (beforeMount.usageCount === null || afterMount.usageCount === null) {
      return [`warm cache mount ${expected.logicalId} usage could not be verified`];
    }
    if (afterMount.usageCount <= beforeMount.usageCount) {
      return [`warm cache mount ${expected.logicalId} was not used by the application build`];
    }
    return [];
  });
};

export const getDockerBuildClaimIneligibleReasons = ({
  expectedRevision,
  expectedSourceFingerprint,
  imageArchitecture,
  imageRevision,
  imageSourceFingerprint,
  expectedImageArchitecture,
}: {
  expectedRevision: string | null;
  expectedSourceFingerprint: string;
  imageArchitecture: string;
  imageRevision: string | null;
  imageSourceFingerprint: string | null;
  expectedImageArchitecture: string;
}) => {
  const reasons: string[] = [];

  if (!expectedRevision) reasons.push("BUILD_BENCHMARK_REVISION is missing");
  else if (imageRevision !== expectedRevision) {
    reasons.push(`image revision ${imageRevision ?? "missing"} does not match ${expectedRevision}`);
  }
  if (imageSourceFingerprint !== expectedSourceFingerprint) {
    reasons.push("image source fingerprint does not match the measured context");
  }
  if (imageArchitecture !== expectedImageArchitecture) {
    reasons.push(`image architecture ${imageArchitecture} is not Docker server ${expectedImageArchitecture}`);
  }

  return reasons;
};
