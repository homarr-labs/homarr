import dayjs from "dayjs";
import frenchLocale from "dayjs/locale/fr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatRelativeTime,
  getCoolifySectionVisibility,
  getCoolifyServerState,
  getResourceTimestamp,
  isCoolifyServerOnline,
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
