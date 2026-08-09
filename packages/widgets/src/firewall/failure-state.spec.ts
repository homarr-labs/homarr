import { describe, expect, it } from "vitest";

import { hasFirewallPartialFailure, hasTotalFirewallFailure } from "./component";

const failedQuery = {
  isPending: false,
  isFetching: false,
  isError: false,
  data: [{ error: "offline" }],
};

describe("firewall failure state", () => {
  it("rejects only after every dimension fails", () => {
    expect(hasTotalFirewallFailure([failedQuery, failedQuery, failedQuery, failedQuery])).toBe(true);
    expect(
      hasTotalFirewallFailure([
        failedQuery,
        failedQuery,
        failedQuery,
        { ...failedQuery, data: [{ error: undefined }] },
      ]),
    ).toBe(false);
  });

  it("lets an error-only persisted cache recover while it refetches", () => {
    expect(hasTotalFirewallFailure([failedQuery, failedQuery, { ...failedQuery, isFetching: true }, failedQuery])).toBe(
      false,
    );
  });

  it("preserves stale cached data when a query-wide refetch fails", () => {
    const staleQuery = {
      ...failedQuery,
      isError: true,
      data: [{ integration: { id: "firewall-1" }, error: undefined }],
    };

    expect(hasTotalFirewallFailure([staleQuery, failedQuery, failedQuery, failedQuery])).toBe(false);
  });

  it("surfaces query-wide and integration-specific partial failures", () => {
    const successfulQuery = {
      isPending: false,
      isFetching: false,
      isError: false,
      data: [{ integration: { id: "firewall-1" }, error: undefined }],
    };

    expect(hasFirewallPartialFailure("firewall-1", [successfulQuery])).toBe(false);
    expect(hasFirewallPartialFailure("firewall-1", [{ ...successfulQuery, isError: true }])).toBe(true);
    expect(
      hasFirewallPartialFailure("firewall-1", [
        { ...successfulQuery, data: [{ integration: { id: "firewall-1" }, error: "offline" }] },
      ]),
    ).toBe(true);
  });
});
