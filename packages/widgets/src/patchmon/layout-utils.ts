import type { PatchMonStatKey } from "./stat-colors";

const gridColsByWidth = [
  { minWidth: 500, cols: 4 },
  { minWidth: 380, cols: 3 },
  { minWidth: 220, cols: 2 },
  { minWidth: 0, cols: 1 },
] as const;

const statVisibilityByOption = [
  ["showTotalHosts", "totalHosts"],
  ["showHostsNeedingUpdates", "hostsNeedingUpdates"],
  ["showSecurityUpdates", "securityUpdates"],
  ["showUpToDateHosts", "upToDateHosts"],
  ["showHostsWithSecurityUpdates", "hostsWithSecurityUpdates"],
  ["showRecentUpdates24h", "recentUpdates24h"],
  ["showTotalOutdatedPackages", "totalOutdatedPackages"],
  ["showTotalRepos", "totalRepos"],
] as const satisfies readonly (readonly [string, PatchMonStatKey])[];

type PatchMonStatVisibilityOptions = Partial<Record<(typeof statVisibilityByOption)[number][0], boolean>>;

export function getVisiblePatchMonStatKeys(
  options: PatchMonStatVisibilityOptions,
  isAdvanced: boolean,
): PatchMonStatKey[] {
  return statVisibilityByOption.filter(([optionKey]) => isAdvanced || options[optionKey]).map(([, statKey]) => statKey);
}

export function getGridCols(width: number): number {
  const match = gridColsByWidth.find(({ minWidth }) => width >= minWidth);
  return match?.cols ?? 1;
}

export function shouldShowComplianceHeroText(width: number): boolean {
  return getGridCols(width) >= 2;
}
