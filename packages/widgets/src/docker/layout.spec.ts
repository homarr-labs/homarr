import { describe, expect, test } from "vitest";

import { getDockerColumnVisibility, getDockerFooterVisibility } from "./layout";

const columns = ["name", "state", "host", "cpuUsage", "memoryUsage", "actions"] as const;

describe("getDockerColumnVisibility", () => {
  test("keeps only essential columns in a narrow compact widget", () => {
    expect(getDockerColumnVisibility(columns, 240, false)).toEqual({
      name: true,
      state: false,
      host: false,
      cpuUsage: false,
      memoryUsage: false,
      actions: true,
    });
  });

  test("reveals compact metrics as width becomes available", () => {
    expect(getDockerColumnVisibility(columns, 440, false)).toMatchObject({
      host: false,
      cpuUsage: true,
      memoryUsage: false,
    });
  });

  test("keeps a configured state column when there is no name column for the inline dot", () => {
    expect(getDockerColumnVisibility(["state"], 240, false).state).toBe(true);
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
  test("reveals totals only when they fit", () => {
    expect(getDockerFooterVisibility(300, false)).toEqual({ footer: true, cpu: false, memory: false });
    expect(getDockerFooterVisibility(400, false)).toEqual({ footer: true, cpu: true, memory: false });
  });

  test("keeps every total in advanced mode", () => {
    expect(getDockerFooterVisibility(240, true)).toEqual({ footer: true, cpu: true, memory: true });
  });
});
