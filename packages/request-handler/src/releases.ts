import dayjs from "dayjs";
import { z } from "zod";

import { fetchWithTimeout } from "@homarr/common";
import { logger } from "@homarr/log";

import { createCachedWidgetRequestHandler } from "./lib/cached-widget-request-handler";
import { Providers } from "./releases-providers";
import type { DetailsResponse } from "./releases-providers";

const _reponseSchema = z.object({
  identifier: z.string(),
  providerKey: z.string(),
  latestRelease: z.string(),
  latestReleaseAt: z.date(),
  releaseUrl: z.string(),
  releaseDescription: z.string(),
  isPreRelease: z.boolean(),
  projectUrl: z.string(),
  projectDescription: z.string(),
  isFork: z.boolean(),
  isArchived: z.boolean(),
  createdAt: z.date(),
  starsCount: z.number(),
  openIssues: z.number(),
  forksCount: z.number(),
  errorMessage: z.string().optional(),
});

const formatErrorRelease = (identifier: string, providerKey: string, errorMessage: string) => ({
  identifier,
  providerKey,
  latestRelease: "",
  latestReleaseAt: new Date(0),
  releaseUrl: "",
  releaseDescription: "",
  isPreRelease: false,
  projectUrl: "",
  projectDescription: "",
  isFork: false,
  isArchived: false,
  createdAt: new Date(0),
  starsCount: 0,
  openIssues: 0,
  forksCount: 0,
  errorMessage,
});

export const releasesRequestHandler = createCachedWidgetRequestHandler({
  queryKey: "releasesApiResult",
  widgetKind: "releases",
  async requestAsync(input: { providerKey: string; identifier: string; versionRegex: string | undefined }) {
    const provider = Providers[input.providerKey];

    if (!provider) return undefined;

    let detailsResult: DetailsResponse = {
      projectUrl: "",
      projectDescription: "",
      isFork: false,
      isArchived: false,
      createdAt: new Date(0),
      starsCount: 0,
      openIssues: 0,
      forksCount: 0,
    };

    const detailsUrl = provider.getDetailsUrl(input.identifier);
    if (detailsUrl !== undefined) {
      const detailsResponse = await fetchWithTimeout(detailsUrl);
      const parsedDetails = provider.parseDetailsResponse(await detailsResponse.json());

      if (parsedDetails?.success) {
        detailsResult = parsedDetails.data;
      } else {
        logger.warn("Failed to parse details response", {
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
      return formatErrorRelease(
        input.identifier,
        input.providerKey,
        releasesResponseJson ? JSON.stringify(releasesResponseJson, null, 2) : releasesResult.error.message,
      );
    } else {
      const releases = releasesResult.data.filter((result) =>
        input.versionRegex ? new RegExp(input.versionRegex).test(result.latestRelease) : true,
      );

      const latest =
        releases.length === 0
          ? formatErrorRelease(input.identifier, input.providerKey, "Could not find any releases for version filter")
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
                releaseUrl: "",
                releaseDescription: "",
                isPreRelease: false,
                projectUrl: "",
                projectDescription: "",
                isFork: false,
                isArchived: false,
                createdAt: new Date(0),
                starsCount: 0,
                openIssues: 0,
                forksCount: 0,
                errorMessage: "",
              },
            );

      return latest;
    }
  },
  cacheDuration: dayjs.duration(5, "minutes"),
});

export type ResponseResponse = z.infer<typeof _reponseSchema>;
