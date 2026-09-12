import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { assertWidgetArtifactIntegrity } from "@homarr/custom-widgets/package/server";
import { parseWorkshopPackageRelease } from "@homarr/workshop/package-releases";
import { WorkshopBackend } from "@homarr/workshop/backend";
import { resolveHomarrUrlConfig } from "@homarr/workshop/schema";

import { env } from "../../../env";
import { packageDigest } from "./records";

const urls = resolveHomarrUrlConfig({
  homarrWebsiteUrl: env.HOMARR_WEBSITE_URL,
  workshopApiUrl: env.WORKSHOP_API_URL,
  workshopWebUrl: env.WORKSHOP_WEB_URL,
});
export const widgetWorkshop = new WorkshopBackend(urls.workshopApiUrl);
export const widgetWorkshopOriginSchema = z.object({
  kind: z.literal("workshop"),
  workshopApiUrl: z.string(),
  submissionId: z.string(),
  releaseId: z.string(),
  version: z.string(),
  sourceDigest: z.string(),
  artifactDigest: z.string(),
  author: z.string(),
  forkedFrom: z.string(),
});

export function readWidgetWorkshopOrigin(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = widgetWorkshopOriginSchema.safeParse(JSON.parse(raw));
    if (parsed.success && parsed.data.workshopApiUrl === urls.workshopApiUrl) return parsed.data;
  } catch {
    /* Local forks and imported packages may have different provenance. */
  }
  return null;
}

export async function getWidgetWorkshopRelease(releaseId: string) {
  return withWorkshopError(async () => {
    const release = await widgetWorkshop.packages.get(releaseId, AbortSignal.timeout(15_000));
    const parsed = parseWorkshopPackageRelease(release);
    if (
      packageDigest(parsed.source) !== release.sourceDigest ||
      parsed.source.manifest.id !== release.packageId ||
      parsed.source.manifest.version !== release.version
    ) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Workshop release metadata does not match its package" });
    }
    if (parsed.artifact) {
      assertWidgetArtifactIntegrity(parsed.artifact, parsed.source);
      if (parsed.artifact.digest !== release.artifactDigest) throw new Error("Release artifact checksum mismatch");
    }
    return {
      ...parsed,
      release,
      origin: { kind: "workshop" as const, workshopApiUrl: urls.workshopApiUrl, ...parsed.origin },
      workshopUrl: `${urls.workshopWebUrl}/${encodeURIComponent(release.submission)}`,
    };
  });
}

export function authenticatedWidgetWorkshop(token: string) {
  const backend = new WorkshopBackend(urls.workshopApiUrl);
  backend.pocketBase.authStore.save(token);
  return backend;
}

export async function withWorkshopError<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "Workshop request failed. Check your connection and Workshop account.",
    });
  }
}
