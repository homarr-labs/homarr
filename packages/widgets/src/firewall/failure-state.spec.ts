import { describe, expect, it } from "vitest";

import { hasTotalFirewallFailure } from "./component";

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
      hasTotalFirewallFailure([failedQuery, failedQuery, failedQuery, { ...failedQuery, data: [{ error: undefined }] }]),
    ).toBe(false);
  });

  it("lets an error-only persisted cache recover while it refetches", () => {
    expect(hasTotalFirewallFailure([failedQuery, failedQuery, { ...failedQuery, isFetching: true }, failedQuery])).toBe(
      false,
    );
  });
});
