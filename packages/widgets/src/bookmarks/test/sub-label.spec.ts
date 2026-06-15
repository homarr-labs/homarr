import { describe, expect, test } from "vitest";

import { getHrefSubLabel } from "../sub-label";

describe("getHrefSubLabel", () => {
  test.each([[null], [undefined], [""]])("returns undefined for %s", (input) => {
    expect(getHrefSubLabel(input)).toBeUndefined();
  });

  test.each([
    ["https://docs.halos.fi", "docs.halos.fi"],
    ["https://docs.halos.fi/path", "docs.halos.fi"],
    ["http://example.com:8080/x", "example.com"],
  ])("returns hostname for absolute %s", (input, expected) => {
    expect(getHrefSubLabel(input)).toBe(expected);
  });

  test.each([
    ["/cockpit/", "/cockpit"],
    ["/cockpit", "/cockpit"],
    ["/signalk-server/@signalk/freeboard-sk/", "/signalk-server/@signalk/freeboard-sk"],
    ["/x", "/x"],
  ])("returns trimmed path for path-only %s", (input, expected) => {
    expect(getHrefSubLabel(input)).toBe(expected);
  });
});
