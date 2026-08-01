import { describe, expect, test } from "vitest";

import { getDockerColumnVisibility } from "./layout";

const columns = ["name", "state", "host", "cpuUsage", "memoryUsage", "actions"] as const;

describe("getDockerColumnVisibility", () => {
  test("keeps only essential columns in a narrow compact widget", () => {
    expect(getDockerColumnVisibility(columns, 240, false)).toEqual({
      name: true,
      state: true,
      host: false,
      cpuUsage: false,
      memoryUsage: false,
      actions: true,
    });
  });

  test("reveals compact metrics as width becomes available", () => {
    expect(getDockerColumnVisibility(columns, 380, false)).toMatchObject({
      host: false,
      cpuUsage: true,
      memoryUsage: true,
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
