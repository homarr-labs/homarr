import { ParseError } from "@homarr/common/server";
import { z } from "zod/v4";

const PATCHMON_STATS_PARSE_ERROR_MESSAGE = "Invalid PatchMon stats response";

export const patchmonOsDistributionEntrySchema = z.object({
  name: z.string(),
  count: z.number(),
  os_type: z.string().optional(),
  os_version: z.string().optional(),
});

export const patchmonStatsResponseSchema = z.object({
  total_hosts: z.number(),
  hosts_needing_updates: z.number(),
  security_updates: z.number(),
  up_to_date_hosts: z.number(),
  hosts_with_security_updates: z.number(),
  recent_updates_24h: z.number(),
  total_outdated_packages: z.number(),
  total_repos: z.number(),
  last_updated: z.string(),
  os_distribution: z.array(patchmonOsDistributionEntrySchema).default([]),
});

export interface PatchMonOsDistributionEntry {
  name: string;
  count: number;
  osType?: string;
  osVersion?: string;
}

export interface PatchMonStats {
  totalHosts: number;
  hostsNeedingUpdates: number;
  securityUpdates: number;
  upToDateHosts: number;
  hostsWithSecurityUpdates: number;
  recentUpdates24h: number;
  totalOutdatedPackages: number;
  totalRepos: number;
  lastUpdated: string;
  osDistribution: PatchMonOsDistributionEntry[];
}

const mapOsDistributionEntry = (
  entry: z.infer<typeof patchmonOsDistributionEntrySchema>,
): PatchMonOsDistributionEntry => ({
  name: entry.name,
  count: entry.count,
  osType: entry.os_type,
  osVersion: entry.os_version,
});

export const parsePatchMonStatsResponseAsync = async (
  response: { json: () => Promise<unknown> },
): Promise<z.infer<typeof patchmonStatsResponseSchema>> => {
  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new ParseError(PATCHMON_STATS_PARSE_ERROR_MESSAGE, {
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }

  const parseResult = await patchmonStatsResponseSchema.safeParseAsync(json);
  if (!parseResult.success) {
    throw new ParseError(PATCHMON_STATS_PARSE_ERROR_MESSAGE, { cause: parseResult.error });
  }

  return parseResult.data;
};

export const mapPatchMonStats = (data: z.infer<typeof patchmonStatsResponseSchema>): PatchMonStats => ({
  totalHosts: data.total_hosts,
  hostsNeedingUpdates: data.hosts_needing_updates,
  securityUpdates: data.security_updates,
  upToDateHosts: data.up_to_date_hosts,
  hostsWithSecurityUpdates: data.hosts_with_security_updates,
  recentUpdates24h: data.recent_updates_24h,
  totalOutdatedPackages: data.total_outdated_packages,
  totalRepos: data.total_repos,
  lastUpdated: data.last_updated,
  osDistribution: [...data.os_distribution]
    .map(mapOsDistributionEntry)
    .sort((a, b) => b.count - a.count),
});
