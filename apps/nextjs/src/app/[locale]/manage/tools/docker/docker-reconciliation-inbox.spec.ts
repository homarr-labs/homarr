import { describe, expect, test } from "vitest";

import {
  dismissDockerReconciliationCandidate,
  filterDockerReconciliationInbox,
  getValidDockerServiceUrl,
} from "./docker-reconciliation-inbox";

const candidates = [
  { candidateKey: "home:new", state: "newRecognized" as const },
  { candidateKey: "home:new-app", state: "newApp" as const },
  { candidateKey: "remote:moved", state: "moved" as const },
  { candidateKey: "home:linked", state: "linked" as const },
  { candidateKey: "home:represented", state: "represented" as const },
];

describe("Docker reconciliation inbox", () => {
  test("separates attention items from represented services", () => {
    expect(
      filterDockerReconciliationInbox(candidates, "attention", []).map(({ candidateKey }) => candidateKey),
    ).toEqual(["home:new", "home:new-app", "remote:moved"]);
    expect(
      filterDockerReconciliationInbox(candidates, "represented", []).map(({ candidateKey }) => candidateKey),
    ).toEqual(["home:linked", "home:represented"]);
  });

  test("dismisses only the endpoint-qualified candidate key and remains idempotent", () => {
    const dismissed = dismissDockerReconciliationCandidate([], "home:new");

    expect(
      filterDockerReconciliationInbox(candidates, "all", dismissed).map(({ candidateKey }) => candidateKey),
    ).not.toContain("home:new");
    expect(filterDockerReconciliationInbox(candidates, "all", dismissed)).toContainEqual({
      candidateKey: "remote:moved",
      state: "moved",
    });
    expect(dismissDockerReconciliationCandidate(dismissed, "home:new")).toBe(dismissed);
  });

  test("accepts only HTTP service URLs", () => {
    expect(getValidDockerServiceUrl("https://service.example.com")).toBe("https://service.example.com/");
    expect(getValidDockerServiceUrl("ftp://service.example.com")).toBeNull();
    expect(getValidDockerServiceUrl("service.example.com")).toBeNull();
  });
});
