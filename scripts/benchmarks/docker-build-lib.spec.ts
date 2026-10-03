import { describe, expect, it } from "vitest";

import {
  applyDockerBuildSyntheticSourceChange,
  fingerprintDockerBuildSource,
  getBuildCacheContinuityIneligibleReasons,
  getBuildCacheStateIneligibleReasons,
  getDockerBuildClaimIneligibleReasons,
  getMeasuredRevision,
  nextBuildCacheTarget,
  normalizeDockerArchitecture,
  parseDockerBuildCacheMountDescription,
  parseDockerBuildOutput,
  parseDockerfileCacheMounts,
} from "./docker-build-lib.mts";

const pnpmMount = { logicalId: "pnpm-store", target: "/pnpm/store", mustIncreaseUsage: false };
const nextMount = {
  logicalId: "homarr-next-build-linux/arm64",
  target: nextBuildCacheTarget,
  mustIncreaseUsage: true,
};
const cacheRecord = ({
  logicalId,
  recordId,
  target,
  usageCount,
}: {
  logicalId: string;
  recordId: string;
  target: string;
  usageCount: number | null;
}) => ({
  description: `cached mount ${target} from exec benchmark with id "/${logicalId}"`,
  logicalId,
  recordId,
  size: "1MB",
  target,
  usageCount,
});

describe("Docker build benchmark", () => {
  it("fingerprints the exact imported source mutation used to force incremental compilation", () => {
    const entries = [
      {
        file: "apps/nextjs/src/app/[locale]/layout.tsx",
        mode: 0o100644,
        content: Buffer.from('openGraph: {\n    siteName: "Homarr",\n  },\n'),
      },
    ];
    const before = fingerprintDockerBuildSource(entries);
    const { entries: changedEntries, change } = applyDockerBuildSyntheticSourceChange(entries, "paired-edit-1");

    expect(change).toEqual({
      file: "apps/nextjs/src/app/[locale]/layout.tsx",
      id: "paired-edit-1",
      from: 'siteName: "Homarr",',
      to: 'siteName: "Homarr build benchmark paired-edit-1",',
    });
    expect(changedEntries[0]?.content?.toString("utf8")).toContain(change.to);
    expect(fingerprintDockerBuildSource(changedEntries)).not.toBe(before);
  });

  it("fails closed when the real source marker is absent or ambiguous", () => {
    expect(() =>
      applyDockerBuildSyntheticSourceChange(
        [{ file: "apps/nextjs/src/app/[locale]/layout.tsx", mode: 0o100644, content: Buffer.from("no marker") }],
        "edit",
      ),
    ).toThrow("Expected exactly one build benchmark source marker");
    expect(() => applyDockerBuildSyntheticSourceChange([], "edit")).toThrow("source marker file is missing");
  });

  it("derives the exact context-specific cache mounts for the target platform", () => {
    const dockerfile = `RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store echo fetch
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store echo install
RUN --mount=type=cache,id=homarr-next-build-\${TARGETPLATFORM},target=${nextBuildCacheTarget},sharing=locked echo build`;

    expect(parseDockerfileCacheMounts(dockerfile, "linux/arm64")).toEqual([nextMount, pnpmMount]);
    expect(parseDockerfileCacheMounts(dockerfile.split("\n").slice(0, 2).join("\n"), "linux/arm64")).toEqual([
      pnpmMount,
    ]);
  });

  it("fails closed for implicit or unresolved Dockerfile cache mount identity", () => {
    expect(() => parseDockerfileCacheMounts("RUN --mount=type=cache,target=/cache echo build", "linux/arm64")).toThrow(
      "explicit id and target",
    );
    expect(() =>
      parseDockerfileCacheMounts(
        "RUN --mount=type=cache,id=homarr-${BUILDPLATFORM},target=/cache echo build",
        "linux/arm64",
      ),
    ).toThrow("unresolved variable ${BUILDPLATFORM}");
    expect(() =>
      parseDockerfileCacheMounts(
        "RUN --mount=type=cache,id=homarr-${INVALID-NAME},target=/cache echo build",
        "linux/arm64",
      ),
    ).toThrow("unresolved variable");
  });

  it("reads exact logical cache identity from real buildx du descriptions", () => {
    expect(
      parseDockerBuildCacheMountDescription(
        'cached mount /app/apps/nextjs/.next/cache from exec /bin/sh -c pnpm build with id "/homarr-next-build-linux/arm64"',
      ),
    ).toEqual({ logicalId: "homarr-next-build-linux/arm64", target: nextBuildCacheTarget });
    expect(parseDockerBuildCacheMountDescription("unrecognized output")).toBeNull();
  });

  it("extracts cache and Next compilation measurements from plain BuildKit output", () => {
    const output = `#7 CACHED
#8 DONE 0.4s
#9 12.0 ✓ Compiled successfully in 21.7s
#9 DONE 22.3s`;

    expect(parseDockerBuildOutput(output)).toEqual({
      cachedStepCount: 1,
      completedStepCount: 2,
      nextCompileMs: 21_700,
    });
  });

  it("only permits claims for a native image labeled with the exact measured source", () => {
    expect(
      getDockerBuildClaimIneligibleReasons({
        expectedRevision: "head+worktree",
        expectedSourceFingerprint: "source-hash",
        imageArchitecture: "amd64",
        imageRevision: "head+worktree",
        imageSourceFingerprint: "source-hash",
        expectedImageArchitecture: "amd64",
      }),
    ).toEqual([]);
  });

  it("normalizes Docker server architectures into OCI platform names", () => {
    expect(normalizeDockerArchitecture("x86_64")).toBe("amd64");
    expect(normalizeDockerArchitecture("aarch64")).toBe("arm64");
    expect(normalizeDockerArchitecture("armv7l")).toBe("arm/v7");
  });

  it("derives revisions from Git state instead of trusting image-label input", () => {
    expect(getMeasuredRevision("abc123", false)).toBe("abc123");
    expect(getMeasuredRevision("abc123", true)).toBe("abc123+worktree");
  });

  it("verifies declared cold and warm cache preconditions", () => {
    const empty = { cacheMountCount: 0, cacheMounts: [], recordCount: 0 };
    const warm = {
      cacheMountCount: 2,
      cacheMounts: [
        cacheRecord({ logicalId: pnpmMount.logicalId, recordId: "pnpm", target: pnpmMount.target, usageCount: 2 }),
        cacheRecord({ logicalId: nextMount.logicalId, recordId: "next", target: nextMount.target, usageCount: 4 }),
      ],
      recordCount: 4,
    };
    expect(getBuildCacheStateIneligibleReasons("cold", empty, [pnpmMount])).toEqual([]);
    expect(getBuildCacheStateIneligibleReasons("cold", warm, [pnpmMount])).toEqual([
      "cold builder already contains 4 cache records",
    ]);
    expect(getBuildCacheStateIneligibleReasons("warm", warm, [pnpmMount, nextMount])).toEqual([]);

    const staleNext = {
      ...warm,
      cacheMounts: [
        warm.cacheMounts[0]!,
        cacheRecord({
          logicalId: "homarr-next-build",
          recordId: "old-next",
          target: nextBuildCacheTarget,
          usageCount: 9,
        }),
      ],
    };
    expect(getBuildCacheStateIneligibleReasons("warm", staleNext, [pnpmMount, nextMount])).toEqual([
      `warm builder is missing cache mount ${nextMount.logicalId} at ${nextBuildCacheTarget}`,
    ]);
  });

  it("requires every warm cache record to survive and the Next cache to be used", () => {
    const before = {
      cacheMountCount: 2,
      cacheMounts: [
        cacheRecord({ logicalId: pnpmMount.logicalId, recordId: "pnpm", target: pnpmMount.target, usageCount: 2 }),
        cacheRecord({ logicalId: nextMount.logicalId, recordId: "next", target: nextMount.target, usageCount: 4 }),
      ],
      recordCount: 4,
    };
    const after = {
      cacheMountCount: 2,
      cacheMounts: [
        cacheRecord({ logicalId: pnpmMount.logicalId, recordId: "pnpm", target: pnpmMount.target, usageCount: 2 }),
        cacheRecord({ logicalId: nextMount.logicalId, recordId: "next", target: nextMount.target, usageCount: 6 }),
      ],
      recordCount: 8,
    };

    expect(getBuildCacheContinuityIneligibleReasons("warm", before, after, [pnpmMount, nextMount])).toEqual([]);
    expect(
      getBuildCacheContinuityIneligibleReasons(
        "warm",
        before,
        {
          ...after,
          cacheMounts: [after.cacheMounts[0]!, { ...after.cacheMounts[1]!, recordId: "replacement" }],
        },
        [pnpmMount, nextMount],
      ),
    ).toEqual([`warm cache mount ${nextMount.logicalId} at ${nextBuildCacheTarget} was replaced during the build`]);
    expect(
      getBuildCacheContinuityIneligibleReasons(
        "warm",
        before,
        {
          ...after,
          cacheMounts: [after.cacheMounts[0]!, { ...after.cacheMounts[1]!, usageCount: 4 }],
        },
        [pnpmMount, nextMount],
      ),
    ).toEqual([`warm cache mount ${nextMount.logicalId} was not used by the application build`]);
  });
});
