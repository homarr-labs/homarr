import { describe, expect, test } from "vitest";

import { getDockerColumnVisibility, getDockerFooterVisibility } from "./layout";

const columns = ["name", "state", "host", "cpuUsage", "memoryUsage", "actions"] as const;

describe("getDockerColumnVisibility", () => {
  test("keeps every configured column in a narrow compact widget", () => {
    expect(getDockerColumnVisibility(columns, 240, false)).toEqual({
      name: true,
      state: true,
      host: true,
      cpuUsage: true,
      memoryUsage: true,
      actions: true,
    });
  });

  test("honors the configured compact column set at every width", () => {
    expect(getDockerColumnVisibility(["name", "memoryUsage"], 200, false)).toEqual({
      name: true,
      state: false,
      host: false,
      cpuUsage: false,
      memoryUsage: true,
      actions: false,
    });
    expect(getDockerColumnVisibility(["name", "memoryUsage"], 800, false)).toEqual({
      name: true,
      state: false,
      host: false,
      cpuUsage: false,
      memoryUsage: true,
      actions: false,
    });
  });

  test("uses every expert column in advanced mode", () => {
    expect(getDockerColumnVisibility([], 240, true)).toEqual({
      name: true,
      state: true,
      host: true,
      cpuUsage: true,
      memoryUsage: true,
      actions: true,
    });
  });
});

describe("getDockerFooterVisibility", () => {
  test("shows the full compact footer above its threshold", () => {
    expect(getDockerFooterVisibility(256, false)).toEqual({ footer: false, cpu: false, memory: false });
    expect(getDockerFooterVisibility(257, false)).toEqual({ footer: true, cpu: true, memory: true });
  });

  test("keeps every total in advanced mode", () => {
    expect(getDockerFooterVisibility(240, true)).toEqual({ footer: true, cpu: true, memory: true });
  });
});
