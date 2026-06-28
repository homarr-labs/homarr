import { z } from "zod/v4";

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
});

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
}

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
});
