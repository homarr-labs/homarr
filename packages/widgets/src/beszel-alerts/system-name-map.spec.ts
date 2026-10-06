import { describe, expect, test } from "vitest";

import { buildBeszelSystemNameMap, getBeszelSystemName } from "./system-name-map";

describe("Beszel alert system names", () => {
  test("keeps identical system IDs scoped to their integration", () => {
    const systemNames = buildBeszelSystemNameMap([
      { integrationId: "beszel-a", systemNameMap: { shared: "Alpha server" } },
      { integrationId: "beszel-b", systemNameMap: { shared: "Beta server" } },
    ]);

    expect(getBeszelSystemName(systemNames, "beszel-a", "shared")).toBe("Alpha server");
    expect(getBeszelSystemName(systemNames, "beszel-b", "shared")).toBe("Beta server");
  });

  test("falls back to the system ID when no name is available", () => {
    expect(getBeszelSystemName(new Map(), "beszel-a", "unknown")).toBe("unknown");
  });
});
