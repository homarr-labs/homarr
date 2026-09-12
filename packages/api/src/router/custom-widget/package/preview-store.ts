import { TRPCError } from "@trpc/server";

import { createRedisClient } from "@homarr/core/infrastructure/redis";
import { customWidgetArtifacts } from "@homarr/db/schema";
import { getCustomWidgetDefaultOptions, validateCustomWidgetOptions } from "@homarr/custom-widgets/core";
import type { CustomWidgetArtifact, CustomWidgetPackage } from "@homarr/custom-widgets/package";
import { assertWidgetArtifactIntegrity } from "@homarr/custom-widgets/package/server";

import { getArtifact, getInstallation, getPackageDisplayData, parseBindings } from "./records";
import type { ResolvedPackagePlacement } from "./records";
import type { PackageContext } from "./types";
import { refreshWidgetActor } from "./actor";
import { leaseWidgetArtifact, withWidgetArtifactReferenceLock } from "./artifact-references";

const prefix = "custom-widget:package-preview:";
const ttl = 60 * 60 * 1000;
const local = new Map<string, { value: string; expires: number }>();
let redis: ReturnType<typeof createRedisClient> | undefined;

export async function previewValue(key: string, value?: string) {
  const localMode = process.env.NODE_ENV === "test" || process.env.CI !== undefined;
  if (localMode) {
    for (const [entryKey, entry] of local) if (entry.expires < Date.now()) local.delete(entryKey);
    if (value !== undefined) local.set(key, { value, expires: Date.now() + ttl });
    return local.get(key)?.value ?? null;
  }
  redis ??= createRedisClient();
  if (value !== undefined) await redis.set(`${prefix}${key}`, value, "PX", ttl);
  return redis.get(`${prefix}${key}`);
}

interface PreviewRecord {
  id: string;
  userId: string;
  installationId: string;
  artifactId: string;
  options: Record<string, unknown>;
  bindings: Record<string, string>;
  liveActions: boolean;
  scenario?: string;
}

export async function persistPackageArtifact(
  ctx: PackageContext,
  source: CustomWidgetPackage,
  artifact: CustomWidgetArtifact,
) {
  return withWidgetArtifactReferenceLock(async () => {
    await leaseWidgetArtifact(artifact.digest);
    await persistArtifactRecord(ctx, source, artifact);
  });
}

async function persistArtifactRecord(ctx: PackageContext, source: CustomWidgetPackage, artifact: CustomWidgetArtifact) {
  assertWidgetArtifactIntegrity(artifact, source);
  try {
    const existing = await getArtifact(ctx, artifact.digest);
    assertWidgetArtifactIntegrity(existing.artifact, source);
    return;
  } catch (error) {
    if (!(error instanceof TRPCError && error.code === "PRECONDITION_FAILED")) throw error;
  }
  try {
    await ctx.db.insert(customWidgetArtifacts).values({
      id: artifact.digest,
      packageId: source.manifest.id,
      version: source.manifest.version,
      source: JSON.stringify(source),
      artifact: JSON.stringify(artifact),
      createdAt: new Date(),
    });
  } catch (error) {
    // Two owners/replicas may import the same immutable artifact concurrently.
    try {
      const existing = await getArtifact(ctx, artifact.digest);
      assertWidgetArtifactIntegrity(existing.artifact, source);
    } catch {
      throw error;
    }
  }
}

export async function savePackagePreview(ctx: PackageContext, record: Omit<PreviewRecord, "userId">) {
  if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
  await previewValue(record.id, JSON.stringify({ ...record, userId: ctx.session.user.id }));
  return resolvePackagePreview(ctx, record.id);
}

export async function resolvePackagePreview(ctx: PackageContext, id: string): Promise<ResolvedPackagePlacement> {
  ctx = await refreshWidgetActor(ctx);
  if (!ctx.session?.user.permissions.includes("admin")) throw new TRPCError({ code: "FORBIDDEN" });
  const raw = await previewValue(id);
  if (!raw) throw new TRPCError({ code: "NOT_FOUND", message: "Preview expired. Preview the draft again." });
  const record = JSON.parse(raw) as PreviewRecord | null;
  if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Preview expired" });
  if (record.userId !== ctx.session.user.id) throw new TRPCError({ code: "NOT_FOUND" });
  const installation = await getInstallation(ctx, record.installationId);
  const { artifact, source } = await getArtifact(ctx, record.artifactId);
  if (record.scenario && !source.previewScenarios?.[record.scenario])
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The selected preview scenario is unavailable" });
  const configuration = { ...getCustomWidgetDefaultOptions(source.options), ...record.options };
  const issues = validateCustomWidgetOptions(source.options, configuration);
  if (issues.length) throw new TRPCError({ code: "BAD_REQUEST", message: issues[0]?.message });
  return {
    item: { id: `preview-${id}`, boardId: `preview-${id}` },
    installation,
    source,
    artifact,
    configuration,
    bindings: { ...parseBindings(installation.bindings), ...record.bindings },
    preview: { id, liveActions: record.liveActions && !record.scenario, scenario: record.scenario },
  };
}

export function getPackagePreviewData(resolved: ResolvedPackagePlacement) {
  const data = getPackageDisplayData(resolved);
  for (const surface of ["tile", "advanced", "configuration"] as const) {
    if (!resolved.artifact.client[surface]) continue;
    const url = `/api/custom-widgets/previews/${resolved.preview?.id}/${surface}`;
    data.surfaceUrls[surface] = url;
    data.stylesheetUrls[surface] = `${url}?asset=css`;
  }
  let previewScenario: { id: string; label: string; description?: string } | undefined;
  const scenarioId = resolved.preview?.scenario;
  const scenario = scenarioId ? resolved.source.previewScenarios?.[scenarioId] : undefined;
  if (scenario && scenarioId)
    previewScenario = { id: scenarioId, label: scenario.label, description: scenario.description };
  return { ...data, previewId: resolved.preview?.id, previewScenario };
}
