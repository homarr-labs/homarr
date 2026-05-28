import { describe, expect, test } from "vitest";

import { getStatusColor, RUNNING_STATUS } from "./helpers";

describe("getStatusColor", () => {
  test("returns green for the running status", () => {
    expect(getStatusColor(RUNNING_STATUS)).toBe("green");
  });

  test("returns red for a stopped status", () => {
    expect(getStatusColor("stopped")).toBe("red");
  });

  test("returns red for an unknown status", () => {
    expect(getStatusColor("anything-else")).toBe("red");
  });

  test("returns red for an empty status", () => {
    expect(getStatusColor("")).toBe("red");
  });

  test("is case sensitive — uppercase RUNNING is not running", () => {
    expect(getStatusColor("RUNNING")).toBe("red");
  });
});
