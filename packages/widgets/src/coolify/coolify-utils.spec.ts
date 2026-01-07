import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type {
  CoolifyApplicationWithContext,
  CoolifyServer,
  CoolifyServiceWithContext,
} from "@homarr/integrations/types";

import {
  buildServerResourceCounts,
  cleanFqdn,
  createStorageKey,
  createWidgetKey,
  formatRelativeTime,
  getBadgeColor,
  getResourceTimestamp,
  getStatusColor,
  parseStatus,
} from "./coolify-utils";

describe("parseStatus", () => {
  test("should extract status before colon and lowercase it", () => {
    expect(parseStatus("Running:healthy")).toBe("running");
    expect(parseStatus("STOPPED:error")).toBe("stopped");
    expect(parseStatus("Exited:0")).toBe("exited");
  });

  test("should handle status without colon", () => {
    expect(parseStatus("running")).toBe("running");
    expect(parseStatus("STOPPED")).toBe("stopped");
  });

  test("should return 'unknown' for empty string", () => {
    expect(parseStatus("")).toBe("unknown");
  });
});

describe("cleanFqdn", () => {
  test("should return undefined for null/undefined/empty", () => {
    expect(cleanFqdn(null)).toBeUndefined();
    expect(cleanFqdn(undefined)).toBeUndefined();
    expect(cleanFqdn("")).toBeUndefined();
  });

  test("should extract first URL from comma-separated list", () => {
    expect(cleanFqdn("https://app.example.com, https://backup.example.com")).toBe("https://app.example.com");
  });

  test("should remove trailing slash", () => {
    expect(cleanFqdn("https://app.example.com/")).toBe("https://app.example.com");
  });

  test("should preserve path without trailing slash", () => {
    expect(cleanFqdn("https://app.example.com/api/v1")).toBe("https://app.example.com/api/v1");
  });

  test("should return original string for invalid URL", () => {
    expect(cleanFqdn("not-a-url")).toBe("not-a-url");
  });

  test("should handle http protocol", () => {
    expect(cleanFqdn("http://localhost:3000")).toBe("http://localhost:3000");
  });
});

describe("getStatusColor", () => {
  test("should return green for running", () => {
    expect(getStatusColor("running")).toBe("green");
  });

  test("should return red for stopped/exited", () => {
    expect(getStatusColor("stopped")).toBe("red");
    expect(getStatusColor("exited")).toBe("red");
  });

  test("should return yellow for starting/restarting", () => {
    expect(getStatusColor("starting")).toBe("yellow");
    expect(getStatusColor("restarting")).toBe("yellow");
  });

  test("should return gray for unknown status", () => {
    expect(getStatusColor("unknown")).toBe("gray");
    expect(getStatusColor("pending")).toBe("gray");
  });
});

describe("getBadgeColor", () => {
  test("should return gray when total is 0", () => {
    expect(getBadgeColor(0, 0)).toBe("gray");
  });

  test("should return green when all are running", () => {
    expect(getBadgeColor(5, 5)).toBe("green");
    expect(getBadgeColor(1, 1)).toBe("green");
  });

  test("should return yellow when some are running", () => {
    expect(getBadgeColor(3, 5)).toBe("yellow");
    expect(getBadgeColor(1, 10)).toBe("yellow");
  });

  test("should return red when none are running", () => {
    expect(getBadgeColor(0, 5)).toBe("red");
    expect(getBadgeColor(0, 1)).toBe("red");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-07T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("should return undefined for undefined/invalid input", () => {
    expect(formatRelativeTime(undefined)).toBeUndefined();
    expect(formatRelativeTime("invalid-date")).toBeUndefined();
  });

  test("should return 'just now' for recent times", () => {
    expect(formatRelativeTime("2025-01-07T11:59:45Z")).toBe("just now");
  });

  test("should return minutes ago", () => {
    expect(formatRelativeTime("2025-01-07T11:55:00Z")).toBe("5m ago");
    expect(formatRelativeTime("2025-01-07T11:30:00Z")).toBe("30m ago");
  });

  test("should return hours and minutes ago", () => {
    expect(formatRelativeTime("2025-01-07T10:30:00Z")).toBe("1h 30m ago");
    expect(formatRelativeTime("2025-01-07T09:00:00Z")).toBe("3h ago");
  });

  test("should return days and hours ago", () => {
    expect(formatRelativeTime("2025-01-06T10:00:00Z")).toBe("1d 2h ago");
    expect(formatRelativeTime("2025-01-05T12:00:00Z")).toBe("2d ago");
  });
});

describe("getResourceTimestamp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-07T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("should return undefined for running resources", () => {
    const item = { status: "running", updated_at: "2025-01-06T12:00:00Z" };
    expect(getResourceTimestamp(item, "application")).toBeUndefined();
    expect(getResourceTimestamp(item, "service")).toBeUndefined();
  });

  test("should use last_online_at for stopped applications", () => {
    const item = {
      status: "stopped",
      last_online_at: "2025-01-07T11:00:00Z",
      updated_at: "2025-01-07T10:00:00Z",
    };
    expect(getResourceTimestamp(item, "application")).toBe("1h ago");
  });

  test("should use updated_at for services", () => {
    const item = {
      status: "stopped",
      last_online_at: "2025-01-07T11:00:00Z",
      updated_at: "2025-01-07T10:00:00Z",
    };
    expect(getResourceTimestamp(item, "service")).toBe("2h ago");
  });

  test("should fallback to updated_at for applications without last_online_at", () => {
    const item = { status: "exited", updated_at: "2025-01-07T10:00:00Z" };
    expect(getResourceTimestamp(item, "application")).toBe("2h ago");
  });
});

describe("buildServerResourceCounts", () => {
  test("should return empty map for empty inputs", () => {
    const result = buildServerResourceCounts([], [], []);
    expect(result.size).toBe(0);
  });

  test("should initialize servers with zero counts", () => {
    const servers: CoolifyServer[] = [
      { id: 1, uuid: "s1", name: "Server 1", settings: { server_id: 1 } },
      { id: 2, uuid: "s2", name: "Server 2", settings: { server_id: 2 } },
    ] as CoolifyServer[];

    const result = buildServerResourceCounts(servers, [], []);

    expect(result.get(1)).toEqual({ apps: 0, services: 0 });
    expect(result.get(2)).toEqual({ apps: 0, services: 0 });
  });

  test("should count applications per server", () => {
    const servers: CoolifyServer[] = [
      { id: 1, uuid: "s1", name: "Server 1", settings: { server_id: 1 } },
    ] as CoolifyServer[];
    const apps: CoolifyApplicationWithContext[] = [
      { uuid: "a1", name: "App 1", server_id: 1 },
      { uuid: "a2", name: "App 2", server_id: 1 },
      { uuid: "a3", name: "App 3", server_id: 1 },
    ] as CoolifyApplicationWithContext[];

    const result = buildServerResourceCounts(servers, apps, []);

    expect(result.get(1)).toEqual({ apps: 3, services: 0 });
  });

  test("should count services per server", () => {
    const servers: CoolifyServer[] = [
      { id: 1, uuid: "s1", name: "Server 1", settings: { server_id: 1 } },
    ] as CoolifyServer[];
    const services: CoolifyServiceWithContext[] = [
      { uuid: "svc1", name: "Service 1", server_id: 1 },
      { uuid: "svc2", name: "Service 2", server_id: 1 },
    ] as CoolifyServiceWithContext[];

    const result = buildServerResourceCounts(servers, [], services);

    expect(result.get(1)).toEqual({ apps: 0, services: 2 });
  });

  test("should handle multiple servers with mixed resources", () => {
    const servers: CoolifyServer[] = [
      { id: 1, uuid: "s1", name: "Server 1", settings: { server_id: 1 } },
      { id: 2, uuid: "s2", name: "Server 2", settings: { server_id: 2 } },
    ] as CoolifyServer[];
    const apps: CoolifyApplicationWithContext[] = [
      { uuid: "a1", name: "App 1", server_id: 1 },
      { uuid: "a2", name: "App 2", server_id: 2 },
      { uuid: "a3", name: "App 3", server_id: 2 },
    ] as CoolifyApplicationWithContext[];
    const services: CoolifyServiceWithContext[] = [
      { uuid: "svc1", name: "Service 1", server_id: 1 },
      { uuid: "svc2", name: "Service 2", server_id: 2 },
    ] as CoolifyServiceWithContext[];

    const result = buildServerResourceCounts(servers, apps, services);

    expect(result.get(1)).toEqual({ apps: 1, services: 1 });
    expect(result.get(2)).toEqual({ apps: 2, services: 1 });
  });
});

describe("createWidgetKey", () => {
  test("should create key from single integration", () => {
    expect(createWidgetKey(["abc123"])).toBe("abc123");
  });

  test("should create sorted key from multiple integrations", () => {
    expect(createWidgetKey(["xyz", "abc", "mno"])).toBe("abc-mno-xyz");
  });

  test("should produce same key regardless of input order", () => {
    const key1 = createWidgetKey(["a", "b", "c"]);
    const key2 = createWidgetKey(["c", "a", "b"]);
    const key3 = createWidgetKey(["b", "c", "a"]);

    expect(key1).toBe(key2);
    expect(key2).toBe(key3);
  });

  test("should not mutate original array", () => {
    const ids = ["z", "a", "m"];
    createWidgetKey(ids);
    expect(ids).toEqual(["z", "a", "m"]);
  });
});

describe("createStorageKey", () => {
  test("should create key for single-instance widget", () => {
    const widgetKey = "abc123";
    expect(createStorageKey(widgetKey, "abc123", "sections")).toBe("coolify-sections-abc123");
    expect(createStorageKey(widgetKey, "abc123", "show-ip")).toBe("coolify-show-ip-abc123");
  });

  test("should create unique key for multi-instance widget cards", () => {
    const widgetKey = "abc-xyz";
    expect(createStorageKey(widgetKey, "abc", "sections")).toBe("coolify-sections-abc-xyz-abc");
    expect(createStorageKey(widgetKey, "xyz", "sections")).toBe("coolify-sections-abc-xyz-xyz");
  });

  test("should isolate state between widgets with different integrations", () => {
    const singleWidgetKey = "abc";
    const multiWidgetKey = "abc-xyz";

    const singleKey = createStorageKey(singleWidgetKey, "abc", "sections");
    const multiKey = createStorageKey(multiWidgetKey, "abc", "sections");

    expect(singleKey).not.toBe(multiKey);
  });

  test("should produce different keys for different integration cards in same widget", () => {
    const widgetKey = "abc-xyz";

    const key1 = createStorageKey(widgetKey, "abc", "sections");
    const key2 = createStorageKey(widgetKey, "xyz", "sections");

    expect(key1).not.toBe(key2);
  });
});
