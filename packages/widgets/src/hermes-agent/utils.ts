import type { HermesTheme } from "./theme-data";

export const getStatusColor = (status: string | null | undefined) => {
  switch (status?.toLowerCase()) {
    case "ok":
    case "running":
    case "connected":
    case "ready":
      return "green";
    case "queued":
    case "busy":
    case "degraded":
    case "draining":
    case "retrying":
    case "starting":
    case "stopping":
    case "waiting_for_approval":
      return "yellow";
    case "cancelled":
    case "auth_error":
    case "error":
    case "unhealthy":
    case "not_ready":
    case "disconnected":
    case "failed":
    case "fatal":
    case "paused":
    case "startup_failed":
    case "stopped":
      return "red";
    default:
      return "gray";
  }
};

export const getThemeStatusColor = (theme: HermesTheme, status: string | null | undefined) => {
  switch (getStatusColor(status)) {
    case "green":
      return theme.success;
    case "yellow":
      return theme.warning;
    case "red":
      return theme.error;
    default:
      return theme.textTertiary;
  }
};

interface HermesJobState {
  failed: boolean;
  paused: boolean;
}

export const getJobSortPriority = (job: HermesJobState) => (job.failed ? 0 : job.paused ? 1 : 2);

export const getJobDisplayState = (job: HermesJobState) => (job.paused ? "paused" : job.failed ? "failed" : "enabled");

interface OverflowListOptions {
  totalItems?: number | null;
  hasMore?: boolean;
}

interface HermesSkillUsage {
  name: string;
  usage: number | null;
}

export const sortSkillsByUsage = <T extends HermesSkillUsage>(skills: readonly T[]) =>
  skills.toSorted((skillA, skillB) => {
    const usageDifference = (skillB.usage ?? -1) - (skillA.usage ?? -1);
    return usageDifference === 0 ? skillA.name.localeCompare(skillB.name) : usageDifference;
  });

export const getOverflowList = <T>(items: readonly T[], maxRows: number, options: OverflowListOptions = {}) => {
  const rowLimit = Math.max(1, Math.floor(maxRows));
  const knownTotal = Math.max(items.length, options.totalItems ?? 0);
  const remainingIsLowerBound = options.totalItems == null && options.hasMore === true;
  const totalForDisplay = knownTotal + (remainingIsLowerBound ? 1 : 0);
  const needsSummary = totalForDisplay > rowLimit || totalForDisplay > items.length;
  const visibleCount = needsSummary
    ? Math.min(items.length, Math.max(0, rowLimit - 1))
    : Math.min(items.length, rowLimit);

  return {
    visibleItems: items.slice(0, visibleCount),
    remainingCount: needsSummary ? totalForDisplay - visibleCount : 0,
    remainingIsLowerBound,
  };
};

export const getCompactStatusKey = (status: string) => {
  switch (status.toLowerCase()) {
    case "connected":
    case "ok":
    case "ready":
    case "running":
      return "ok" as const;
    case "busy":
      return "busy" as const;
    case "degraded":
      return "warn" as const;
    case "auth_error":
      return "auth" as const;
    case "error":
    case "unhealthy":
    case "not_ready":
    case "disconnected":
    case "failed":
    case "fatal":
    case "startup_failed":
    case "stopped":
      return "error" as const;
    case "draining":
    case "queued":
    case "retrying":
    case "starting":
    case "stopping":
    case "waiting_for_approval":
      return "wait" as const;
    default:
      return null;
  }
};
