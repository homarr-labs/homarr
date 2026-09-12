import type PocketBase from "pocketbase";
import { z } from "zod/v4";

import { customWidgetArtifactSchema, customWidgetPackageSchema } from "@homarr/custom-widgets/package";
import type { CustomWidgetArtifact, CustomWidgetPackage } from "@homarr/custom-widgets/package";
import { WORKSHOP_REQUEST_TIMEOUT_MS } from "./schema";

export const workshopPackageReleaseSchema = z.object({
  id: z.string(),
  submission: z.string(),
  author: z.string(),
  packageId: z.string(),
  version: z.string(),
  sdkVersion: z.string(),
  sourceDigest: z.string(),
  artifactDigest: z.string().default(""),
  content: z.string(),
  artifact: z.string().default(""),
  changelog: z.string().default(""),
  forkedFrom: z.string().default(""),
  created: z.string(),
});
export type WorkshopPackageRelease = z.infer<typeof workshopPackageReleaseSchema>;
export const workshopPackageReleaseSummarySchema = workshopPackageReleaseSchema.omit({ content: true, artifact: true });
export type WorkshopPackageReleaseSummary = z.infer<typeof workshopPackageReleaseSummarySchema>;

export interface WorkshopPackagePublishInput {
  submissionId?: string;
  expectedRevision?: number;
  source: CustomWidgetPackage;
  artifact?: CustomWidgetArtifact;
  title?: string;
  description?: string;
  changelog?: string;
  forkedFrom?: string;
}

/** This client fetches and publishes bytes; it never imports or evaluates widget code. */
export class WorkshopPackageReleases {
  public constructor(private readonly pocketBase: PocketBase) {}

  public async list(submissionId: string, signal?: AbortSignal): Promise<WorkshopPackageReleaseSummary[]> {
    const records = await this.pocketBase.collection("widget_releases").getList(1, 100, {
      filter: this.pocketBase.filter("submission = {:submission}", { submission: submissionId }),
      sort: "-created",
      signal: signal ?? AbortSignal.timeout(WORKSHOP_REQUEST_TIMEOUT_MS),
      requestKey: null,
      fields:
        "id,submission,author,packageId,version,sdkVersion,sourceDigest,artifactDigest,changelog,forkedFrom,created",
    });
    return records.items.map((record) => workshopPackageReleaseSummarySchema.parse(record));
  }

  public async get(releaseId: string, signal?: AbortSignal): Promise<WorkshopPackageRelease> {
    return workshopPackageReleaseSchema.parse(
      await this.pocketBase
        .collection("widget_releases")
        .getOne(releaseId, { signal: signal ?? AbortSignal.timeout(WORKSHOP_REQUEST_TIMEOUT_MS), requestKey: null }),
    );
  }

  public async publish(input: WorkshopPackagePublishInput): Promise<WorkshopPackageRelease> {
    const source = customWidgetPackageSchema.parse(input.source);
    let artifact: CustomWidgetArtifact | undefined;
    if (input.artifact) artifact = customWidgetArtifactSchema.parse(input.artifact);
    return workshopPackageReleaseSchema.parse(
      await this.pocketBase.send("/api/workshop/package-releases", {
        method: "POST",
        body: { ...input, source, artifact },
        requestKey: null,
        signal: AbortSignal.timeout(WORKSHOP_REQUEST_TIMEOUT_MS),
      }),
    );
  }

  public async fork(releaseId: string, newPackageId: string) {
    const release = await this.get(releaseId);
    const source = customWidgetPackageSchema.parse(JSON.parse(release.content));
    const fork = customWidgetPackageSchema.parse({
      ...source,
      manifest: { ...source.manifest, id: newPackageId, version: "1.0.0" },
    });
    return {
      source: fork,
      origin: {
        submissionId: release.submission,
        releaseId: release.id,
        forkedFrom: release.id,
        version: release.version,
      },
    };
  }
}

export function parseWorkshopPackageRelease(release: WorkshopPackageRelease) {
  const source = customWidgetPackageSchema.parse(JSON.parse(release.content));
  let artifact: CustomWidgetArtifact | undefined;
  if (release.artifact) artifact = customWidgetArtifactSchema.parse(JSON.parse(release.artifact));
  return {
    source,
    artifact,
    origin: {
      submissionId: release.submission,
      releaseId: release.id,
      version: release.version,
      sourceDigest: release.sourceDigest,
      artifactDigest: release.artifactDigest,
      author: release.author,
      forkedFrom: release.forkedFrom,
    },
  };
}
