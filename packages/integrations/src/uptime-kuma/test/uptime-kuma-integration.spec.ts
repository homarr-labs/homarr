// @vitest-environment node

import { Response } from "undici";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.SECRET_ENCRYPTION_KEY = "0".repeat(64);
  process.env.DB_DRIVER = "better-sqlite3";
  process.env.DB_URL = ":memory:";
});

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationSecret } from "../../base/types";
import { UptimeKumaIntegration } from "../uptime-kuma-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const createIntegration = (secrets: IntegrationSecret[] = []) =>
  new UptimeKumaIntegration({
    id: "test-uptime-kuma",
    name: "Test Uptime Kuma",
    url: "http://kuma.internal:3001",
    externalUrl: "https://status.example.com",
    decryptedSecrets: secrets,
  });

const respondWith = (statusPage: unknown, heartbeat: unknown) => {
  mockFetch.mockImplementation((url) => {
    const body = String(url).includes("/heartbeat/") ? heartbeat : statusPage;
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 })) as unknown as ReturnType<
      typeof fetchWithTrustedCertificatesAsync
    >;
  });
};

const requestedUrls = () => mockFetch.mock.calls.map(([url]) => String(url));

const beat = (status: number, time: string, ping: number | null = null) => ({ status, time, msg: "", ping });

beforeEach(() => {
  mockFetch.mockReset();
  vi.useFakeTimers({ toFake: ["Date"], now: Date.UTC(2026, 9, 17, 9, 5) });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("UptimeKumaIntegration.getStatusPageAsync", () => {
  test("maps an Uptime Kuma 2 status page with heartbeats, certificates, incidents and maintenance", async () => {
    respondWith(
      {
        config: { slug: "homelab", title: "Homelab" },
        incidents: [
          {
            id: 4,
            style: "danger",
            title: "NAS outage",
            content: "Disk replacement in progress",
            pin: true,
            active: true,
            createdDate: "2026-10-17 08:00:00",
            lastUpdatedDate: null,
          },
        ],
        maintenanceList: [{ id: 2, title: "Router firmware", description: "", strategy: "manual" }],
        publicGroupList: [
          {
            id: 1,
            name: "Core",
            weight: 1,
            monitorList: [
              {
                id: 10,
                name: "Docs",
                sendUrl: 1,
                type: "http",
                url: "https://docs.example.com",
                tags: [{ id: 1, monitor_id: 10, tag_id: 3, value: "", name: "web", color: "#2563eb" }],
                certExpiryDaysRemaining: 41,
                validCert: true,
              },
              { id: 20, name: "NAS", sendUrl: 0, type: "ping", certExpiryDaysRemaining: "", validCert: false },
            ],
          },
        ],
      },
      {
        heartbeatList: {
          "10": [beat(1, "2026-10-17 09:00:00.000", 120), beat(1, "2026-10-17 09:01:00.000", 80)],
          "20": [
            beat(1, "2026-10-17 09:00:00.000", 2),
            beat(0, "2026-10-17 09:01:00.000"),
            beat(0, "2026-10-17 09:02:00.000"),
          ],
        },
        uptimeList: { "10_24": 1, "20_24": 0.875 },
      },
    );

    const statusPage = await createIntegration([{ kind: "slug", value: "Homelab" }]).getStatusPageAsync();

    expect(requestedUrls()).toEqual([
      "http://kuma.internal:3001/api/status-page/homelab",
      "http://kuma.internal:3001/api/status-page/heartbeat/homelab",
    ]);
    expect(statusPage).toEqual({
      title: "Homelab",
      url: "https://status.example.com/status/homelab",
      incidents: [
        {
          id: 4,
          title: "NAS outage",
          content: "Disk replacement in progress",
          style: "danger",
          createdAt: Date.UTC(2026, 9, 17, 8),
          updatedAt: null,
        },
      ],
      maintenances: [{ id: 2, title: "Router firmware", description: null }],
      groups: [
        {
          id: 1,
          name: "Core",
          monitors: [
            {
              id: 10,
              name: "Docs",
              type: "http",
              url: "https://docs.example.com",
              status: "up",
              uptime24h: 100,
              ping: 80,
              lastCheckAt: Date.UTC(2026, 9, 17, 9, 1),
              statusSince: null,
              certificateDaysRemaining: 41,
              tags: [{ name: "web", color: "#2563eb", value: null }],
              heartbeats: [
                { status: "up", time: Date.UTC(2026, 9, 17, 9), ping: 120 },
                { status: "up", time: Date.UTC(2026, 9, 17, 9, 1), ping: 80 },
              ],
            },
            {
              id: 20,
              name: "NAS",
              type: "ping",
              url: null,
              status: "down",
              uptime24h: 87.5,
              ping: null,
              lastCheckAt: Date.UTC(2026, 9, 17, 9, 2),
              statusSince: Date.UTC(2026, 9, 17, 9, 1),
              certificateDaysRemaining: null,
              tags: [],
              heartbeats: [
                { status: "up", time: Date.UTC(2026, 9, 17, 9), ping: 2 },
                { status: "down", time: Date.UTC(2026, 9, 17, 9, 1), ping: null },
                { status: "down", time: Date.UTC(2026, 9, 17, 9, 2), ping: null },
              ],
            },
          ],
        },
      ],
    });
  });

  test("supports the Uptime Kuma 1 response shape and the default slug", async () => {
    vi.setSystemTime(Date.UTC(2024, 0, 1, 12));
    respondWith(
      {
        config: { slug: "default", title: "" },
        incident: { id: 1, style: "info", title: "Planned work", content: null, createdDate: "2024-01-01 10:00:00" },
        maintenanceList: [],
        publicGroupList: [
          {
            id: 1,
            name: "Services",
            monitorList: [
              { id: 1, name: "Pending", type: "http" },
              { id: 2, name: "Maintenance", type: "http" },
              { id: 3, name: "Never checked", type: "http" },
              { id: 4, name: "Last checked last week", type: "http" },
            ],
          },
        ],
      },
      {
        heartbeatList: {
          "1": [beat(2, "2024-01-01 10:00:00")],
          "2": [beat(3, "2024-01-01 10:00:00")],
          "4": [beat(1, "2023-12-24 10:00:00")],
        },
        uptimeList: { "1_24": 0.5, "3_24": 0, "4_24": 0 },
      },
    );

    const statusPage = await createIntegration().getStatusPageAsync();

    expect(requestedUrls()).toContain("http://kuma.internal:3001/api/status-page/default");
    expect(statusPage.title).toBe("default");
    expect(statusPage.incidents).toEqual([
      {
        id: 1,
        title: "Planned work",
        content: null,
        style: "info",
        createdAt: Date.UTC(2024, 0, 1, 10),
        updatedAt: null,
      },
    ]);
    expect(statusPage.groups[0]?.monitors.map(({ name, status, uptime24h }) => ({ name, status, uptime24h }))).toEqual([
      { name: "Pending", status: "pending", uptime24h: 50 },
      { name: "Maintenance", status: "maintenance", uptime24h: null },
      { name: "Never checked", status: "unknown", uptime24h: null },
      { name: "Last checked last week", status: "stale", uptime24h: null },
    ]);
  });

  test("marks monitors with old heartbeats as stale", async () => {
    const everyMinuteUntil = (hour: number, minute: number) =>
      Array.from({ length: 5 }, (_, index) =>
        beat(1, new Date(Date.UTC(2026, 9, 17, hour, minute - 4 + index)).toISOString()),
      );
    respondWith(
      {
        publicGroupList: [
          {
            id: 1,
            name: "Group",
            monitorList: [
              { id: 1, name: "Active" },
              { id: 2, name: "Stopped 35 minutes ago" },
              { id: 3, name: "Single check an hour ago" },
              { id: 4, name: "Checked every two hours" },
              { id: 5, name: "Single check two days ago" },
            ],
          },
        ],
      },
      {
        heartbeatList: {
          "1": everyMinuteUntil(9, 4),
          "2": everyMinuteUntil(8, 30),
          "3": [beat(0, "2026-10-17 08:00:00")],
          "4": [beat(1, "2026-10-17 06:00:00"), beat(1, "2026-10-17 08:00:00")],
          "5": [beat(1, "2026-10-15 09:00:00")],
        },
        uptimeList: { "1_24": 1, "2_24": 0.99, "3_24": 0, "4_24": 1, "5_24": 1 },
      },
    );

    const statusPage = await createIntegration().getStatusPageAsync();

    expect(statusPage.groups[0]?.monitors.map(({ name, status, uptime24h }) => ({ name, status, uptime24h }))).toEqual([
      { name: "Active", status: "up", uptime24h: 100 },
      { name: "Stopped 35 minutes ago", status: "stale", uptime24h: 99 },
      { name: "Single check an hour ago", status: "down", uptime24h: 0 },
      { name: "Checked every two hours", status: "up", uptime24h: 100 },
      { name: "Single check two days ago", status: "stale", uptime24h: null },
    ]);
  });

  test("keeps only the 50 newest heartbeats, oldest first", async () => {
    const heartbeats = Array.from({ length: 100 }, (_, minute) =>
      beat(1, new Date(Date.UTC(2026, 0, 1, 0, minute)).toISOString(), minute),
    );
    respondWith(
      { publicGroupList: [{ id: 1, name: "Group", monitorList: [{ id: 7, name: "Busy" }] }] },
      { heartbeatList: { "7": heartbeats.toReversed() }, uptimeList: {} },
    );

    const statusPage = await createIntegration().getStatusPageAsync();
    const monitor = statusPage.groups[0]?.monitors[0];

    expect(monitor?.heartbeats).toHaveLength(50);
    expect(monitor?.heartbeats[0]?.time).toBe(Date.UTC(2026, 0, 1, 0, 50));
    expect(monitor?.heartbeats.at(-1)?.time).toBe(Date.UTC(2026, 0, 1, 1, 39));
  });
});
