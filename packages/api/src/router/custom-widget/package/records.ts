import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { parse } from "superjson";

import { isRecord } from "@homarr/common";
import { eq } from "@homarr/db";
import { boards, customWidgetArtifacts, customWidgetInstallations, items } from "@homarr/db/schema";
import { getCustomWidgetDefaultOptions, validateCustomWidgetOptions } from "@homarr/custom-widgets/core";
import {
  customWidgetArtifactSchema,
  customWidgetPackageSchema,
  mergeWidgetConnectionBindings,
} from "@homarr/custom-widgets/package";
import type { CustomWidgetArtifact, CustomWidgetPackage } from "@homarr/custom-widgets/package";

import { throwIfActionForbiddenAsync } from "../../board/board-access";
import type { ConnectionBindings, PackageContext, PackagePlacementOptions } from "./types";
import { refreshWidgetActor } from "./actor";

export const packageDigest = (value: unknown) => createHash("sha256").update(stableJson(value)).digest("hex");

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .toSorted()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function parseBindings(raw: string): ConnectionBindings {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

/** Recovery and management must remain reachable even when stored source is malformed. */
export function readPackageDraft(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { _draftMetadata: raw, files: {} };
  }
}

export function parsePackagePlacement(raw: string): PackagePlacementOptions | null {
  try {
    const value: unknown = parse(raw);
    if (!isRecord(value) || typeof value.definitionId !== "string") return null;
    return {
      definitionId: value.definitionId,
      configuration: isRecord(value.configuration) ? value.configuration : {},
      connectionBindings: parseBindings(JSON.stringify(value.connectionBindings ?? {})),
    };
  } catch {
    return null;
  }
}

export async function getInstallation(ctx: PackageContext, id: string) {
  const record = await ctx.db.query.customWidgetInstallations.findFirst({
    where: eq(customWidgetInstallations.id, id),
  });
  if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Widget installation not found" });
  return record;
}

export async function getArtifact(ctx: PackageContext, id: string) {
  const row = await ctx.db.query.customWidgetArtifacts.findFirst({ where: eq(customWidgetArtifacts.id, id) });
  if (!row) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Widget artifact is unavailable" });
  return {
    row,
    artifact: customWidgetArtifactSchema.parse(JSON.parse(row.artifact)),
    source: customWidgetPackageSchema.parse(JSON.parse(row.source)),
  };
}

export async function getPackagePlacements(ctx: PackageContext, installationId: string) {
  const candidates = await ctx.db.query.items.findMany({ where: eq(items.kind, "customApi") });
  return candidates.flatMap((item) => {
    const options = parsePackagePlacement(item.options);
    if (options?.definitionId !== installationId) return [];
    return [{ ...item, packageOptions: options }];
  });
}

export async function resolvePackagePlacement(ctx: PackageContext, itemId: string): Promise<ResolvedPackagePlacement> {
  ctx = await refreshWidgetActor(ctx);
  const item = await ctx.db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item || item.kind !== "customApi") throw new TRPCError({ code: "NOT_FOUND" });
  await throwIfActionForbiddenAsync(ctx, eq(boards.id, item.boardId), "view");
  const options = parsePackagePlacement(item.options);
  if (!options) throw new TRPCError({ code: "NOT_FOUND" });
  const installation = await getInstallation(ctx, options.definitionId);
  if (!installation.enabled || !installation.activeArtifactId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Widget installation is disabled" });
  }
  const { artifact, source } = await getArtifact(ctx, installation.activeArtifactId);
  const configuration = { ...getCustomWidgetDefaultOptions(source.options), ...options.configuration };
  const issues = validateCustomWidgetOptions(source.options, configuration);
  if (issues.length > 0)
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Widget configuration needs repair" });
  const bindings = mergeWidgetConnectionBindings(
    source.connections,
    parseBindings(installation.bindings),
    options.connectionBindings,
  );
  return { item, installation, artifact, source, configuration, bindings };
}

export interface ResolvedPackagePlacement {
  item: { id: string; boardId: string };
  installation: Awaited<ReturnType<typeof getInstallation>>;
  artifact: CustomWidgetArtifact;
  source: CustomWidgetPackage;
  configuration: Record<string, unknown>;
  bindings: ConnectionBindings;
  preview?: { id: string; liveActions: boolean; scenario?: string };
}

export function getPackageDisplayData(resolved: ResolvedPackagePlacement) {
  const surfaceUrls: { tile: string; advanced?: string; configuration?: string } = { tile: "" };
  const stylesheetUrls: typeof surfaceUrls = { tile: "" };
  for (const surface of ["tile", "advanced", "configuration"] as const) {
    if (!resolved.artifact.client[surface]) continue;
    const url = `/api/custom-widgets/artifacts/${encodeURIComponent(resolved.item.id)}/${resolved.artifact.digest}/${surface}`;
    surfaceUrls[surface] = url;
    stylesheetUrls[surface] = `${url}?asset=css`;
  }
  return {
    type: "customWidgetV3" as const,
    installationId: resolved.installation.id,
    artifactDigest: resolved.artifact.digest,
    manifest: resolved.artifact.manifest,
    options: resolved.configuration,
    surfaceUrls,
    stylesheetUrls,
  };
}
