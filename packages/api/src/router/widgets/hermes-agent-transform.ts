import { parseHermesTimestamp } from "@homarr/integrations/types";
import type { HermesAgentOverview, HermesJob } from "@homarr/integrations/types";

export interface HermesAgentWidgetOverview {
  mode: "apiServer" | "dashboard";
  version: string | null;
  release: string | null;
  gatewayState: string | null;
  update: {
    latestReleaseTag: string;
    hasNewRelease: boolean;
    commitsBehind: number | null;
    releaseUrl: string | null;
  } | null;
  summary: {
    activeAgents: number;
    totalAgents: number | null;
    activeSessions: number | null;
    activeSessionsHasMore: boolean;
    sessionsLast24Hours: number | null;
    sessionsLast24HoursHasMore: boolean;
    platforms: { connected: number; total: number };
    sessions: number | null;
    sessionsHasMore: boolean;
    jobs: { total: number; active: number; failed: number; paused: number };
    skills: { enabled: number; total: number };
    toolsets: { enabled: number; total: number };
  };
  dataAvailability: HermesAgentOverview["dataAvailability"];
  detailsRestricted: boolean;
  details: {
    platforms: { name: string; state: string | null; updatedAt: string | null }[];
    sessions: { id: string; title: string | null; source: string | null }[];
    jobs: {
      id: string;
      name: string | null;
      schedule: string | null;
      nextRunAt: string | null;
      paused: boolean;
      failed: boolean;
    }[];
    skills: {
      name: string;
      enabled: boolean;
      category: string | null;
      usage: number | null;
    }[];
  } | null;
}

export const toHermesAgentWidgetOverview = (
  overview: HermesAgentOverview,
  includeDetails: boolean,
): HermesAgentWidgetOverview => {
  const platformEntries = Object.entries(overview.dashboardStatus?.gateway_platforms ?? overview.health.platforms);
  const jobSummary = getJobSummary(overview.jobs);
  const enabledSkills = overview.skills.filter((skill) => skill.enabled !== false).length;
  const enabledToolsets = overview.toolsets.filter((toolset) => toolset.enabled !== false).length;
  const sessionCount = overview.dataAvailability.sessions ? (overview.sessionsTotal ?? overview.sessions.length) : null;
  const sessionActivity = getSessionActivitySummary(overview);
  const reportedActiveSessions = overview.dashboardStatus?.active_sessions ?? overview.health.active_sessions ?? null;
  const activeSessions = maxReportedValue(reportedActiveSessions, sessionActivity.active);
  const activeAgents = Math.max(overview.health.active_agents, overview.health.gateway_busy === true ? 1 : 0);
  const totalAgents = overview.dashboardStatus
    ? Math.max(activeAgents, overview.dashboardStatus.profiles.length)
    : null;

  return {
    mode: overview.mode,
    version: overview.dashboardStatus?.version ?? overview.health.version ?? null,
    release: overview.dashboardStatus?.release_date ? `v${overview.dashboardStatus.release_date}` : null,
    gatewayState: getGatewayState(overview),
    update: overview.update
      ? {
          latestReleaseTag: overview.update.latestReleaseTag,
          hasNewRelease: overview.update.hasNewRelease,
          commitsBehind: overview.update.commitsBehind,
          releaseUrl: overview.update.releaseUrl,
        }
      : null,
    summary: {
      activeAgents,
      totalAgents,
      activeSessions,
      activeSessionsHasMore: reportedActiveSessions === null && sessionActivity.activeHasMore,
      sessionsLast24Hours: sessionActivity.last24Hours,
      sessionsLast24HoursHasMore: sessionActivity.last24HoursHasMore,
      platforms: {
        connected: platformEntries.filter(([, platform]) => platform.state === "connected").length,
        total: platformEntries.length,
      },
      sessions: sessionCount,
      sessionsHasMore: overview.sessionsHasMore,
      jobs: jobSummary,
      skills: { enabled: enabledSkills, total: overview.skills.length },
      toolsets: { enabled: enabledToolsets, total: overview.toolsets.length },
    },
    dataAvailability: { ...overview.dataAvailability },
    detailsRestricted: !includeDetails,
    details: includeDetails
      ? {
          platforms: platformEntries.map(([name, platform]) => ({
            name,
            state: platform.state ?? null,
            updatedAt: platform.updated_at ?? null,
          })),
          sessions: overview.sessions.map((session) => ({
            id: session.id,
            title: session.title ?? null,
            source: session.source ?? null,
          })),
          jobs: overview.jobs.map((job, index) => ({
            id: job.id ?? job.job_id ?? job.name ?? `job-${index}`,
            name: job.name ?? null,
            schedule: job.schedule ?? null,
            nextRunAt: job.next_run_at ?? null,
            paused: isJobPaused(job),
            failed: isJobFailed(job),
          })),
          skills: overview.skills.map((skill) => ({
            name: skill.name,
            enabled: skill.enabled !== false,
            category: skill.category ?? null,
            usage: skill.usage ?? null,
          })),
        }
      : null,
  };
};

const activeSessionWindowMs = 5 * 60 * 1000;
const sessionActivityWindowMs = 24 * 60 * 60 * 1000;

const getSessionActivitySummary = (overview: HermesAgentOverview) => {
  if (!overview.dataAvailability.sessions) {
    return { active: null, activeHasMore: false, last24Hours: null, last24HoursHasMore: false };
  }

  if (overview.sessions.length === 0) {
    return { active: 0, activeHasMore: false, last24Hours: 0, last24HoursHasMore: false };
  }

  const now = Date.now();
  const cutoff = now - sessionActivityWindowMs;
  const timestamps = overview.sessions.map(getSessionActivityTime);
  const knownTimestamps = timestamps.filter((timestamp): timestamp is number => timestamp !== null);
  const hasActivityState = overview.sessions.some(
    (session) =>
      (session.is_active !== null && session.is_active !== undefined) ||
      session.ended_at !== undefined ||
      getSessionActivityTime(session) !== null,
  );
  const active = hasActivityState ? overview.sessions.filter((session) => isSessionActive(session, now)).length : null;
  const last24Hours =
    knownTimestamps.length > 0 ? knownTimestamps.filter((timestamp) => timestamp >= cutoff).length : null;
  const oldestKnownTimestamp = knownTimestamps.length > 0 ? Math.min(...knownTimestamps) : null;
  const hasUnknownTimestamp = knownTimestamps.length !== overview.sessions.length;

  return {
    active,
    activeHasMore:
      active !== null &&
      overview.sessionsHasMore &&
      (overview.sessionsTotal === null || active === overview.sessions.length),
    last24Hours,
    last24HoursHasMore:
      hasUnknownTimestamp ||
      (overview.sessionsHasMore &&
        (overview.sessionsTotal === null || oldestKnownTimestamp === null || oldestKnownTimestamp >= cutoff)),
  };
};

const isSessionActive = (session: HermesAgentOverview["sessions"][number], now: number) => {
  if (session.is_active !== null && session.is_active !== undefined) return session.is_active;
  if (session.ended_at != null) return false;

  const activityTime = getSessionActivityTime(session);
  return activityTime !== null && activityTime <= now && now - activityTime < activeSessionWindowMs;
};

const getSessionActivityTime = (session: HermesAgentOverview["sessions"][number]) =>
  parseHermesTimestamp(session.last_active ?? session.started_at);

const maxReportedValue = (left: number | null, right: number | null) => {
  if (left === null) return right;
  if (right === null) return left;
  return Math.max(left, right);
};

const healthyStatuses = ["connected", "ok", "ready", "running"];

const getGatewayState = (overview: HermesAgentOverview) => {
  if (overview.dashboardStatus?.nous_session_valid === "terminal") return "auth_error";
  if (overview.mode === "dashboard" && overview.dashboardStatus?.gateway_running === false) return "error";

  const apiReadinessState =
    overview.mode === "apiServer" ? (overview.health.readiness?.status ?? overview.health.status) : null;
  if (apiReadinessState && !healthyStatuses.includes(apiReadinessState.toLowerCase())) return apiReadinessState;
  if (overview.health.gateway_busy) return "busy";
  if (overview.mode === "apiServer") return apiReadinessState ?? overview.health.gateway_state ?? null;

  return overview.dashboardStatus?.gateway_state ?? overview.health.gateway_state ?? overview.health.status;
};

const isJobPaused = (job: HermesJob) =>
  job.paused === true || job.enabled === false || job.state?.toLowerCase() === "paused";

const isJobFailed = (job: HermesJob) =>
  job.has_error || ["error", "failed"].includes(job.last_status?.toLowerCase() ?? "");

const getJobSummary = (jobs: HermesJob[]) =>
  jobs.reduce(
    (summary, job) => {
      const paused = isJobPaused(job);
      const failed = isJobFailed(job);
      return {
        total: summary.total + 1,
        active: summary.active + (paused ? 0 : 1),
        failed: summary.failed + (failed ? 1 : 0),
        paused: summary.paused + (paused ? 1 : 0),
      };
    },
    { total: 0, active: 0, failed: 0, paused: 0 },
  );
