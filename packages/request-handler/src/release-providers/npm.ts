import { z } from "zod/v4";

import { fetchJsonAsync, providerUrl, tokenHeaders } from "./http";
import type { Release, ReleaseProvider } from "./types";
import { noReleasesFoundError, selectNewestRelease } from "./versions";

const timeMetadataKeys = new Set(["created", "modified"]);

const packageSchema = z.object({
  name: z.string(),
  time: z.record(z.string(), z.string()).transform((entries) =>
    Object.entries(entries)
      .filter(([version]) => !timeMetadataKeys.has(version))
      .map(([version, publishedAt]) => ({ version, publishedAt: new Date(publishedAt) })),
  ),
  "dist-tags": z.record(z.string(), z.string()).optional(),
  versions: z.record(z.string(), z.object({ description: z.string().optional() })),
});

type NpmPackage = z.infer<typeof packageSchema>;

const listCandidateVersions = (npmPackage: NpmPackage, versionPattern?: RegExp) => {
  const latestVersion = npmPackage["dist-tags"]?.latest;
  if (versionPattern || !latestVersion) return npmPackage.time;
  return npmPackage.time.filter(({ version }) => version === latestVersion);
};

const toRelease = (npmPackage: NpmPackage, { version, publishedAt }: NpmPackage["time"][number]): Release => ({
  latestRelease: version,
  latestReleaseAt: publishedAt,
  releaseUrl: `https://www.npmjs.com/package/${encodeURIComponent(npmPackage.name)}/v/${encodeURIComponent(version)}`,
  releaseDescription: npmPackage.versions[version]?.description ?? "",
});

export const getNpmReleaseAsync: ReleaseProvider = async ({ baseUrl, identifier, versionPattern, token }) => {
  const headers = tokenHeaders(token, (value) => ({ Authorization: `Bearer ${value}` }));
  const npmPackage = await fetchJsonAsync(providerUrl(baseUrl, `/${encodeURIComponent(identifier)}`), packageSchema, {
    headers,
  });
  if (npmPackage.time.length === 0) throw noReleasesFoundError(identifier);

  const releases = listCandidateVersions(npmPackage, versionPattern).map((entry) => toRelease(npmPackage, entry));
  return selectNewestRelease(releases, versionPattern);
};
