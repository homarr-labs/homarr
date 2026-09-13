import { mkdir, utimes } from "node:fs/promises";
import { join } from "node:path";

import { createRedisClient } from "@homarr/core/infrastructure/redis";
import { hashWidgetArtifactContent } from "@homarr/custom-widgets/package/server";
import type { CustomWidgetPackage } from "@homarr/custom-widgets/package";

import { withWidgetInstallationLock } from "./coordination";
import { getWidgetPackageDirectory } from "./paths";

export const widgetArtifactGraceMs = 7 * 24 * 60 * 60 * 1000;
const leases = new Map<string, number>();
let redis: ReturnType<typeof createRedisClient> | undefined;

/** Always acquire installation locks before this short reference lock, never the reverse. */
export function withWidgetArtifactReferenceLock<T>(operation: (signal: AbortSignal) => Promise<T>) {
  return withWidgetInstallationLock("__artifact-references__", operation);
}

export async function leaseWidgetArtifact(id: string) {
  if (process.env.NODE_ENV === "test" || process.env.CI !== undefined) {
    leases.set(id, Date.now() + widgetArtifactGraceMs);
    return;
  }
  redis ??= createRedisClient();
  await redis.set(`custom-widget:artifact-lease:${id}`, "1", "PX", widgetArtifactGraceMs);
}

export async function hasWidgetArtifactLease(id: string) {
  if (process.env.NODE_ENV === "test" || process.env.CI !== undefined) {
    const expires = leases.get(id) ?? 0;
    if (expires > Date.now()) return true;
    leases.delete(id);
    return false;
  }
  redis ??= createRedisClient();
  return (await redis.exists(`custom-widget:artifact-lease:${id}`)) === 1;
}

/** Mark a dependency cache as in use before compiling outside the reference lock. */
export async function reserveWidgetBuild(source: CustomWidgetPackage) {
  if (Object.keys(source.dependencies).length === 0) return;
  const directory = join(getWidgetPackageDirectory(), "dependencies", hashWidgetArtifactContent(source));
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const now = new Date();
  await utimes(directory, now, now);
}
