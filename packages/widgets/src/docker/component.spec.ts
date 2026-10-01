import { describe, expect, test } from "vitest";

import { parseColumnOrder, parseColumnWidths } from "../common/use-persisted-table-layout";
import { matchesContainerFilter, parseContainerAliases } from "./component";

const columnAccessors = ["name", "state", "host", "cpuUsage", "memoryUsage", "actions"];

describe("Docker table column layout options", () => {
  test("ignores malformed column layout JSON", () => {
    expect(parseColumnOrder("{", columnAccessors)).toEqual([]);
    expect(parseColumnWidths("[]", columnAccessors)).toEqual({});
  });

  test("removes stale and duplicate column accessors", () => {
    expect(
      parseColumnOrder(JSON.stringify(["memoryUsage", "removed", "name", "memoryUsage"]), columnAccessors),
    ).toEqual(["memoryUsage", "name"]);
  });

  test("keeps only finite positive widths for known columns", () => {
    expect(
      parseColumnWidths(
        JSON.stringify({
          name: 180,
          state: -1,
          host: "120px",
          removed: 100,
          actions: null,
        }),
        columnAccessors,
      ),
    ).toEqual({ name: 180 });
  });
});

describe("Docker container name filter", () => {
  test("shows everything when the filter is empty", () => {
    expect(matchesContainerFilter("jellyfin", [], false)).toBe(true);
    expect(matchesContainerFilter("jellyfin", [], true)).toBe(true);
  });

  test("blacklist mode hides listed containers", () => {
    expect(matchesContainerFilter("jellyfin-postgres", ["jellyfin-postgres"], false)).toBe(false);
    expect(matchesContainerFilter("jellyfin", ["jellyfin-postgres"], false)).toBe(true);
  });

  test("whitelist mode only shows listed containers", () => {
    expect(matchesContainerFilter("jellyfin", ["jellyfin"], true)).toBe(true);
    expect(matchesContainerFilter("jellyfin-postgres", ["jellyfin"], true)).toBe(false);
  });
});

describe("Docker container aliases", () => {
  test("returns an empty map for no aliases", () => {
    expect(parseContainerAliases([])).toEqual(new Map());
  });

  test("maps original name to alias and trims whitespace", () => {
    expect(parseContainerAliases(["ix-jellyfin-jellyfin-1 = Jellyfin"])).toEqual(
      new Map([["ix-jellyfin-jellyfin-1", "Jellyfin"]]),
    );
  });

  test("ignores entries without a usable original name or alias", () => {
    expect(parseContainerAliases(["=alias", "original=", "noequalsign"])).toEqual(new Map());
  });

  test("last entry wins when the same container is aliased twice", () => {
    expect(parseContainerAliases(["jellyfin=First", "jellyfin=Second"])).toEqual(new Map([["jellyfin", "Second"]]));
  });
});
