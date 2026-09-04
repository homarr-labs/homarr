import { describe, expect, test } from "vitest";

import type { HermesAgentOverview } from "@homarr/integrations/types";

import { toHermesAgentWidgetOverview } from "../../widgets/hermes-agent-transform";

const nowSeconds = Math.floor(Date.now() / 1000);

const overview = {
  mode: "apiServer",
  health: {
    status: "ready",
    platform: "hermes-agent",
    version: "0.19.0",
    gateway_state: "running",
    platforms: {
      telegram: {
        state: "connected",
        updated_at: "2026-07-21T10:00:00Z",
        error: "upstream token-shaped error",
      },
    },
    active_agents: 2,
  },
  sessions: [
    {
      id: "session-private-id",
      source: "telegram",
      title: "Private operations session",
      last_active: nowSeconds,
      ended_at: null,
      is_active: true,
    },
  ],
  sessionsTotal: 1,
  sessionsHasMore: false,
  jobs: [
    {
      id: "job-private-id",
      name: "Private backup job",
      schedule: "0 3 * * *",
      enabled: true,
      has_error: true,
    },
  ],
  toolsets: [
    {
      name: "private-tools",
      label: "Private tools",
      enabled: true,
      configured: true,
      tools: ["read_secret_file"],
    },
  ],
  dashboardStatus: null,
  skills: [{ name: "private-skill", enabled: true, category: "private-category", usage: 42 }],
  update: null,
  dataAvailability: { sessions: true, jobs: true, toolsets: true, skills: true },
} satisfies HermesAgentOverview;

describe("Hermes Agent widget projection", () => {
  test("returns aggregate-only data when detail access is not granted", () => {
    const result = toHermesAgentWidgetOverview(overview, false);
    const serialized = JSON.stringify(result);

    expect(result.detailsRestricted).toBe(true);
    expect(result.details).toBeNull();
    expect(result.summary).toMatchObject({
      activeAgents: 2,
      totalAgents: null,
      activeSessions: 1,
      sessionsLast24Hours: 1,
      sessions: 1,
      sessionsHasMore: false,
      platforms: { connected: 1, total: 1 },
      jobs: { total: 1, active: 1, failed: 1, paused: 0 },
      skills: { enabled: 1, total: 1 },
      toolsets: { enabled: 1, total: 1 },
    });
    expect(serialized).not.toContain("session-private-id");
    expect(serialized).not.toContain("Private operations session");
    expect(serialized).not.toContain("Private backup job");
    expect(serialized).not.toContain("private-skill");
    expect(serialized).not.toContain("private-tools");
    expect(serialized).not.toContain("telegram");
    expect(serialized).not.toContain("upstream token-shaped error");
  });

  test("returns only redacted detail fields when detail access is granted", () => {
    const result = toHermesAgentWidgetOverview(overview, true);
    const serialized = JSON.stringify(result);

    expect(result.detailsRestricted).toBe(false);
    expect(result.details).toMatchObject({
      platforms: [{ name: "telegram", state: "connected" }],
      sessions: [{ id: "session-private-id", title: "Private operations session", source: "telegram" }],
      jobs: [{ id: "job-private-id", name: "Private backup job", failed: true }],
      skills: [{ name: "private-skill", category: "private-category", usage: 42 }],
    });
    expect(serialized).not.toContain("private-tools");
    expect(serialized).not.toContain("read_secret_file");
    expect(serialized).not.toContain("upstream token-shaped error");
  });

  test("treats an explicit stopped dashboard gateway as unhealthy", () => {
    const result = toHermesAgentWidgetOverview(
      {
        ...overview,
        mode: "dashboard",
        health: { ...overview.health, status: "error", gateway_state: "running" },
        dashboardStatus: {
          version: "0.20.0",
          gateway_running: false,
          gateway_state: "running",
          gateway_platforms: {},
          profiles: [],
          auth_providers: [],
        },
      },
      false,
    );

    expect(result.gatewayState).toBe("error");
  });

  test("defaults toolsets without an enabled flag to enabled", () => {
    const result = toHermesAgentWidgetOverview(
      {
        ...overview,
        toolsets: [{ name: "core", label: "Core", configured: true, tools: ["read_file"] }],
      },
      true,
    );

    expect(result.summary.toolsets).toEqual({ enabled: 1, total: 1 });
  });

  test("marks a paginated session count as a lower bound", () => {
    const result = toHermesAgentWidgetOverview({ ...overview, sessionsTotal: null, sessionsHasMore: true }, false);

    expect(result.summary.activeSessions).toBe(1);
    expect(result.summary.activeSessionsHasMore).toBe(true);
    expect(result.summary.sessionsLast24Hours).toBe(1);
    expect(result.summary.sessionsLast24HoursHasMore).toBe(true);
    expect(result.summary.sessionsHasMore).toBe(true);
  });

  test("derives active sessions from recent API timestamps when activity flags are absent", () => {
    const result = toHermesAgentWidgetOverview(
      {
        ...overview,
        sessions: [
          {
            id: "recent-last-active",
            source: "api_server",
            title: "Recent API session",
            last_active: nowSeconds - 60,
          },
          {
            id: "recent-started",
            source: "api_server",
            title: "Recently started API session",
            started_at: nowSeconds - 120,
          },
        ],
        sessionsTotal: 2,
      },
      false,
    );

    expect(result.summary.activeSessions).toBe(2);
    expect(result.summary.sessionsLast24Hours).toBe(2);
  });

  test("keeps the exact session total when Hermes paginates the detail rows", () => {
    const result = toHermesAgentWidgetOverview({ ...overview, sessionsTotal: 12, sessionsHasMore: true }, false);

    expect(result.summary.sessions).toBe(12);
    expect(result.summary.sessionsHasMore).toBe(true);
  });

  test("uses per-session activity when the dashboard status counter is stale", () => {
    const result = toHermesAgentWidgetOverview(
      {
        ...overview,
        mode: "dashboard",
        dashboardStatus: {
          version: "0.20.0",
          gateway_running: true,
          gateway_state: "running",
          gateway_platforms: {},
          active_sessions: 0,
          active_agents: 0,
          profiles: [],
          auth_providers: [],
        },
      },
      false,
    );

    expect(result.summary.activeSessions).toBe(1);
  });

  test("reports active agents compared with all available dashboard profiles", () => {
    const result = toHermesAgentWidgetOverview(
      {
        ...overview,
        mode: "dashboard",
        health: { ...overview.health, active_agents: 1 },
        dashboardStatus: {
          version: "0.20.0",
          gateway_running: true,
          gateway_state: "running",
          gateway_platforms: {},
          active_agents: 1,
          profiles: ["default", "reviewer", "writer"],
          auth_providers: [],
        },
      },
      false,
    );

    expect(result.summary.activeAgents).toBe(1);
    expect(result.summary.totalAgents).toBe(3);
    expect(JSON.stringify(result)).not.toContain("reviewer");
  });

  test("counts session activity during the last 24 hours independently from active sessions", () => {
    const result = toHermesAgentWidgetOverview(
      {
        ...overview,
        sessions: [
          ...overview.sessions,
          {
            id: "recently-ended",
            source: "cron",
            title: "Recently ended",
            last_active: nowSeconds - 60 * 60,
            ended_at: nowSeconds - 60 * 60,
            is_active: false,
          },
          {
            id: "old",
            source: "cli",
            title: "Old",
            last_active: nowSeconds - 25 * 60 * 60,
            ended_at: nowSeconds - 25 * 60 * 60,
            is_active: false,
          },
        ],
      },
      false,
    );

    expect(result.summary.activeSessions).toBe(1);
    expect(result.summary.sessionsLast24Hours).toBe(2);
  });
});
