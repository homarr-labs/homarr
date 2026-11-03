import dayjs from "dayjs";
import frenchLocale from "dayjs/locale/fr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CoolifyInstanceInfo } from "@homarr/integrations/types";

import {
  formatRelativeTime,
  getCoolifyAttentionItems,
  getCoolifySectionVisibility,
  getCoolifyServerState,
  getResourceTimestamp,
  isCoolifyServerOnline,
  parseStatus,
} from "./coolify-utils";

describe("Coolify time formatting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T12:00:00Z"));
    dayjs.locale(frenchLocale);
  });

  afterEach(() => {
    dayjs.locale("en");
    vi.useRealTimers();
  });

  it("uses the active Day.js locale for past and future timestamps", () => {
    expect(formatRelativeTime("2026-08-02T11:00:00Z")).toBe("il y a une heure");
    expect(formatRelativeTime("2026-08-02T13:00:00Z")).toBe("dans une heure");
  });

  it("omits missing, invalid, and currently running timestamps", () => {
    expect(formatRelativeTime(undefined)).toBeUndefined();
    expect(formatRelativeTime("invalid")).toBeUndefined();
    expect(getResourceTimestamp({ status: "running", updated_at: "2026-08-02T11:00:00Z" }, "service")).toBeUndefined();
  });
});

describe("Coolify attention overview", () => {
  const info = {
    version: "4.0.0",
    servers: [
      { uuid: "offline", name: "Offline server", is_reachable: false },
      { uuid: "unusable", name: "Unusable server", is_reachable: true, is_usable: false },
      { uuid: "online", name: "Online server", is_reachable: true },
    ],
    applications: [
      {
        uuid: "unhealthy",
        name: "Unhealthy app",
        status: "running:unhealthy",
        projectUuid: "project",
        environmentUuid: "environment",
      },
      { uuid: "running", name: "Running app", status: "running:healthy" },
    ],
    services: [{ uuid: "restarting", name: "Restarting service", status: "restarting" }],
  } as CoolifyInstanceInfo;

  it("shows unhealthy and offline resources before transitioning resources", () => {
    expect(parseStatus("running:unhealthy")).toBe("unhealthy");
    expect(getCoolifyAttentionItems(info, { showServers: true, showApplications: true, showServices: true })).toEqual([
      { kind: "server", uuid: "offline", name: "Offline server", status: "offline" },
      { kind: "server", uuid: "unusable", name: "Unusable server", status: "unusable" },
      {
        kind: "application",
        uuid: "unhealthy",
        name: "Unhealthy app",
        status: "unhealthy",
        projectUuid: "project",
        environmentUuid: "environment",
      },
      {
        kind: "service",
        uuid: "restarting",
        name: "Restarting service",
        status: "restarting",
        projectUuid: undefined,
        environmentUuid: undefined,
      },
    ]);
  });

  it("honors compact section visibility", () => {
    expect(
      getCoolifyAttentionItems(info, { showServers: false, showApplications: true, showServices: false }),
    ).toHaveLength(1);
  });

  it("normalizes unexpected API statuses to an unknown state", () => {
    expect(parseStatus("degraded")).toBe("unknown");
  });
});

describe("Coolify advanced display", () => {
  it("forces every non-sensitive section without changing compact settings", () => {
    const options = { showServers: false, showApplications: true, showServices: false };

    expect(getCoolifySectionVisibility(options, "compact")).toEqual(options);
    expect(getCoolifySectionVisibility(options, "advanced")).toEqual({
      showServers: true,
      showApplications: true,
      showServices: true,
    });
  });

  it("uses top-level server state before the settings fallback", () => {
    const server = {
      id: null,
      uuid: "server-1",
      name: "Build server",
      ip: null,
      is_reachable: false,
      is_usable: null,
      settings: {
        server_id: null,
        is_build_server: null,
        is_reachable: true,
        is_usable: true,
      },
    };

    expect(getCoolifyServerState(server, "is_reachable")).toBe(false);
    expect(getCoolifyServerState(server, "is_usable")).toBe(true);
  });

  it("does not count unknown reachability as online", () => {
    const server = {
      id: null,
      uuid: "server-unknown",
      name: "Unknown server",
      ip: null,
      is_reachable: null,
      is_usable: null,
      settings: null,
    };

    expect(getCoolifyServerState(server, "is_reachable")).toBeUndefined();
    expect(isCoolifyServerOnline(server)).toBe(false);
  });
});
