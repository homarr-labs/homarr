import { describe, expect, test } from "vitest";

import { parseColumnOrder, parseColumnWidths } from "../common/use-persisted-table-layout";
import { beszelTableMetricOptionKeys, getBeszelTableVisibleMetricKeys } from "./display";

const columnAccessors = ["name", "cpu", "memory", "disk", "temp"];

describe("Beszel table column layout options", () => {
  test("ignores malformed column layout JSON", () => {
    expect(parseColumnOrder("{", columnAccessors)).toEqual([]);
    expect(parseColumnWidths("[]", columnAccessors)).toEqual({});
  });

  test("removes stale and duplicate column accessors", () => {
    expect(parseColumnOrder(JSON.stringify(["memory", "removed", "cpu", "memory"]), columnAccessors)).toEqual([
      "memory",
      "cpu",
    ]);
  });

  test("keeps only finite positive widths for known columns", () => {
    expect(
      parseColumnWidths(
        JSON.stringify({
          cpu: 140,
          memory: -1,
          disk: "160px",
          removed: 100,
          temp: null,
        }),
        columnAccessors,
      ),
    ).toEqual({ cpu: 140 });
  });
});

describe("Beszel table metric visibility", () => {
  const enabledOptions = Object.fromEntries(beszelTableMetricOptionKeys.map((key) => [key, true])) as Record<
    (typeof beszelTableMetricOptionKeys)[number],
    boolean
  >;

  test("keeps the compact width budget", () => {
    expect([...getBeszelTableVisibleMetricKeys(enabledOptions, 350, false)]).toEqual(["showCpu"]);
    expect(getBeszelTableVisibleMetricKeys(enabledOptions, 600, false).size).toBe(4);
  });

  test("shows every metric in advanced mode regardless of visibility options", () => {
    const disabledOptions = Object.fromEntries(
      beszelTableMetricOptionKeys.map((key) => [key, false]),
    ) as typeof enabledOptions;

    expect([...getBeszelTableVisibleMetricKeys(disabledOptions, 200, true)]).toEqual(beszelTableMetricOptionKeys);
  });
});
