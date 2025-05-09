import dayjs from "dayjs";
import { z } from "zod";

import { fetchWithTimeout } from "@homarr/common";
import { logger } from "@homarr/log";

import { createCachedWidgetRequestHandler } from "./lib/cached-widget-request-handler";
import { Providers } from "./releases-providers";
import type { DetailsResponse } from "./releases-providers";

const errorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
});

type ReleasesError = z.infer<typeof errorSchema>;

const _reponseSchema = z.object({
  identifier: z.string(),
  providerKey: z.string(),
  latestRelease: z.string().optional(),
  latestReleaseAt: z.date().optional(),
  releaseUrl: z.string().optional(),
  releaseDescription: z.string().optional(),
  isPreRelease: z.boolean().optional(),
  projectUrl: z.string().optional(),
  projectDescription: z.string().optional(),
  isFork: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  createdAt: z.date().optional(),
  starsCount: z.number().optional(),
  openIssues: z.number().optional(),
  forksCount: z.number().optional(),
  error: errorSchema.optional(),
});

const formatErrorRelease = (identifier: string, providerKey: string, error: ReleasesError) => ({
  identifier,
  providerKey,
  latestRelease: undefined,
  latestReleaseAt: undefined,
  releaseUrl: undefined,
  releaseDescription: undefined,
  isPreRelease: undefined,
  projectUrl: undefined,
  projectDescription: undefined,
  isFork: undefined,
  isArchived: undefined,
  createdAt: undefined,
  starsCount: undefined,
  openIssues: undefined,
  forksCount: undefined,
  error,
});

export const releasesRequestHandler = createCachedWidgetRequestHandler({
  queryKey: "releasesApiResult",
  widgetKind: "releases",
  async requestAsync(input: { providerKey: string; identifier: string; versionRegex: string | undefined }) {
    const provider = Providers[input.providerKey];

    if (!provider) return undefined;

    let detailsResult: DetailsResponse;
    const detailsUrl = provider.getDetailsUrl(input.identifier);
    if (detailsUrl !== undefined) {
      const detailsResponse = await fetchWithTimeout(detailsUrl);
      const parsedDetails = provider.parseDetailsResponse(await detailsResponse.json());

      if (parsedDetails?.success) {
        detailsResult = parsedDetails.data;
      } else {
        detailsResult = undefined;
        logger.warn(`Failed to parse details response for ${input.identifier} on ${input.providerKey}`, {
          provider: input.providerKey,
          identifier: input.identifier,
          detailsUrl,
          error: parsedDetails?.error,
        });
      }
    }

    const releasesResponse = await fetchWithTimeout(provider.getReleasesUrl(input.identifier));
    const releasesResponseJson: unknown = await releasesResponse.json();
    const releasesResult = provider.parseReleasesResponse(releasesResponseJson);

    if (!releasesResult.success) {
      return formatErrorRelease(input.identifier, input.providerKey, {
        message: releasesResponseJson ? JSON.stringify(releasesResponseJson, null, 2) : releasesResult.error.message,
      });
    } else {
      const releases = releasesResult.data.filter((result) =>
        input.versionRegex && result.latestRelease ? new RegExp(input.versionRegex).test(result.latestRelease) : true,
      );

      const latest =
        releases.length === 0
          ? formatErrorRelease(input.identifier, input.providerKey, { code: "noMatchingVersion" })
          : releases.reduce(
              (latest, result) => {
                return {
                  ...detailsResult,
                  ...(result.latestReleaseAt > latest.latestReleaseAt ? result : latest),
                  identifier: input.identifier,
                  providerKey: input.providerKey,
                };
              },
              {
                identifier: "",
                providerKey: "",
                latestRelease: "",
                latestReleaseAt: new Date(0),
              },
            );

      return latest;
    }
  },
  cacheDuration: dayjs.duration(5, "minutes"),
});

export type ReleaseResponse = z.infer<typeof _reponseSchema>;
