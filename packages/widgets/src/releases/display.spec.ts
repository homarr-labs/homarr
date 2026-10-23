import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  countIssueEntries,
  getEntryKind,
  getLatestEntry,
  groupEntries,
  hasOutdatedIntegration,
  sectionByKind,
  summarizeChangelog,
} from "./display";
import type { ReleaseWindows } from "./display";
import type { EntryKind, ReleaseEntry, ReleaseEntryErrorCode } from "./release-entry";
import { releaseSectionKeys } from "./release-options";
import type { ReleasesRepositoryIntegration } from "./releases-repository";

const now = new Date("2026-10-23T12:00:00Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);
const daysAgo = (days: number) => hoursAgo(days * 24);

const defaultWindows: ReleaseWindows = { newReleaseWithin: "1w", staleReleaseWithin: "6M" };

const integration = (isUpToDate: boolean | undefined): ReleasesRepositoryIntegration => ({
  id: `sonarr-${String(isUpToDate)}`,
  kind: "sonarr",
  name: "Sonarr",
  version: "4.0.0",
  isUpToDate,
});

const github = { kind: "github", name: "GitHub", iconUrl: "" } as const;
const dockerHub = { kind: "dockerHub", name: "Docker Hub", iconUrl: "" } as const;

type EntryOverrides = Partial<Pick<ReleaseEntry, "publishedAt" | "integrations" | "provider" | "isViewed">>;

const createEntry = (
  name: string,
  kind: Exclude<EntryKind, "error">,
  overrides: EntryOverrides = {},
): ReleaseEntry => ({
  id: name,
  name,
  identifier: `owner/${name}`,
  isViewed: false,
  integrations: [],
  kind,
  ...overrides,
});

const createErrorEntry = (name: string, code: ReleaseEntryErrorCode, overrides: EntryOverrides = {}): ReleaseEntry => ({
  id: name,
  name,
  identifier: `owner/${name}`,
  isViewed: false,
  integrations: [],
  kind: "error",
  error: { code },
  ...overrides,
});

const ids = (entries: ReleaseEntry[]) => entries.map((entry) => entry.id);

const kindOf = (
  publishedAt: Date,
  { isViewed = false, integrations = [] as ReleasesRepositoryIntegration[], windows = defaultWindows } = {},
) => getEntryKind({ publishedAt, isViewed, integrations }, windows);

const snippetOf = (notes: string) => summarizeChangelog(notes).snippet;

describe("getEntryKind", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("is new while the release is inside the new window and not viewed", () => {
    expect(kindOf(daysAgo(2))).toBe("new");
  });

  test("is up to date once the new release is viewed", () => {
    expect(kindOf(daysAgo(2), { isViewed: true })).toBe("upToDate");
  });

  test("is up to date once the release leaves the new window", () => {
    expect(kindOf(daysAgo(10))).toBe("upToDate");
  });

  test.each([
    { publishedAt: hoursAgo(23), expected: "new" },
    { publishedAt: hoursAgo(25), expected: "upToDate" },
  ])("respects a one day new window for a release published at $publishedAt", ({ publishedAt, expected }) => {
    expect(kindOf(publishedAt, { windows: { ...defaultWindows, newReleaseWithin: "1d" } })).toBe(expected);
  });

  test("is never new when the new window is never", () => {
    expect(kindOf(hoursAgo(1), { windows: { ...defaultWindows, newReleaseWithin: "never" } })).toBe("upToDate");
  });

  test("is quiet when the release is older than the quiet window", () => {
    expect(kindOf(daysAgo(200))).toBe("quiet");
  });

  test("is never quiet when the quiet window is never", () => {
    expect(kindOf(daysAgo(5 * 365), { windows: { ...defaultWindows, staleReleaseWithin: "never" } })).toBe("upToDate");
  });

  test("stays new while a linked integration runs an older version", () => {
    expect(kindOf(daysAgo(2), { integrations: [integration(false)] })).toBe("new");
  });

  test.each([
    { name: "viewed", publishedAt: daysAgo(2), isViewed: true },
    { name: "out of the new window", publishedAt: daysAgo(10), isViewed: false },
    { name: "quiet", publishedAt: daysAgo(400), isViewed: false },
  ])("is outdated when $name and a linked integration runs an older version", ({ publishedAt, isViewed }) => {
    expect(kindOf(publishedAt, { isViewed, integrations: [integration(true), integration(false)] })).toBe("outdated");
  });

  test.each([true, undefined])("is not outdated when the integration status is %s", (isUpToDate) => {
    expect(kindOf(daysAgo(10), { integrations: [integration(isUpToDate)] })).toBe("upToDate");
  });
});

describe("hasOutdatedIntegration", () => {
  test.each([
    { integrations: [], expected: false },
    { integrations: [integration(true), integration(undefined)], expected: false },
    { integrations: [integration(true), integration(false)], expected: true },
  ])("is $expected for $integrations.length integrations", ({ integrations, expected }) => {
    expect(hasOutdatedIntegration({ integrations })).toBe(expected);
  });
});

describe("sectionByKind", () => {
  test("lists outdated and failing repositories under needs attention", () => {
    expect(sectionByKind).toEqual({
      new: "new",
      outdated: "attention",
      error: "attention",
      upToDate: "upToDate",
      quiet: "quiet",
    });
  });
});

describe("groupEntries", () => {
  test("puts every entry in the section of its kind", () => {
    const entries = [
      createEntry("fresh", "new", { publishedAt: daysAgo(1) }),
      createEntry("behind", "outdated", { publishedAt: daysAgo(20), integrations: [integration(false)] }),
      createErrorEntry("broken", "notFound", { provider: github }),
      createEntry("current", "upToDate", { publishedAt: daysAgo(30) }),
      createEntry("dormant", "quiet", { publishedAt: daysAgo(400) }),
    ];

    const grouped = groupEntries(entries, releaseSectionKeys);

    expect(ids(grouped.new.entries)).toEqual(["fresh"]);
    expect(ids(grouped.attention.entries)).toEqual(["behind"]);
    expect(grouped.attention.issues.map((group) => ids(group.entries))).toEqual([["broken"]]);
    expect(ids(grouped.upToDate.entries)).toEqual(["current"]);
    expect(ids(grouped.quiet.entries)).toEqual(["dormant"]);
    expect(grouped.new.issues).toEqual([]);
    expect(grouped.upToDate.issues).toEqual([]);
    expect(grouped.quiet.issues).toEqual([]);
  });

  test("lists a failing repository as an issue even when its integration is outdated", () => {
    const entries = [
      createErrorEntry("broken", "rateLimited", { provider: github, integrations: [integration(false)] }),
    ];

    const grouped = groupEntries(entries, releaseSectionKeys);

    expect(grouped.attention.entries).toEqual([]);
    expect(countIssueEntries(grouped.attention.issues)).toBe(1);
  });

  test("sorts each section by the most recent release first", () => {
    const entries = [
      createEntry("older", "upToDate", { publishedAt: daysAgo(40) }),
      createEntry("unknown", "upToDate"),
      createEntry("newest", "upToDate", { publishedAt: daysAgo(8) }),
      createEntry("middle", "upToDate", { publishedAt: daysAgo(20) }),
      createEntry("outdated-old", "outdated", { publishedAt: daysAgo(90) }),
      createEntry("outdated-recent", "outdated", { publishedAt: daysAgo(9) }),
    ];

    const grouped = groupEntries(entries, releaseSectionKeys);

    expect(ids(grouped.upToDate.entries)).toEqual(["newest", "middle", "older", "unknown"]);
    expect(ids(grouped.attention.entries)).toEqual(["outdated-recent", "outdated-old"]);
  });

  test("groups failing repositories by provider and error", () => {
    const entries = [
      createErrorEntry("a", "rateLimited", { provider: github }),
      createErrorEntry("b", "notFound", { provider: github }),
      createErrorEntry("c", "rateLimited", { provider: github }),
      createErrorEntry("d", "rateLimited", { provider: dockerHub }),
      createErrorEntry("e", "noProviderSelected"),
      createErrorEntry("f", "noProviderSelected"),
    ];

    const { issues } = groupEntries(entries, releaseSectionKeys).attention;

    expect(
      issues.map(({ key, code, providerName, entries: members }) => ({ key, code, providerName, ids: ids(members) })),
    ).toEqual([
      { key: "github:rateLimited", code: "rateLimited", providerName: "GitHub", ids: ["a", "c"] },
      { key: "github:notFound", code: "notFound", providerName: "GitHub", ids: ["b"] },
      { key: "dockerHub:rateLimited", code: "rateLimited", providerName: "Docker Hub", ids: ["d"] },
      { key: "none:noProviderSelected", code: "noProviderSelected", providerName: undefined, ids: ["e", "f"] },
    ]);
    expect(countIssueEntries(issues)).toBe(6);
  });

  test("leaves hidden sections empty", () => {
    const entries = [
      createEntry("fresh", "new", { publishedAt: daysAgo(1) }),
      createEntry("behind", "outdated", { publishedAt: daysAgo(20) }),
      createErrorEntry("broken", "notFound", { provider: github }),
      createEntry("current", "upToDate", { publishedAt: daysAgo(30) }),
      createEntry("dormant", "quiet", { publishedAt: daysAgo(400) }),
    ];

    const grouped = groupEntries(entries, ["new", "upToDate"]);

    expect(ids(grouped.new.entries)).toEqual(["fresh"]);
    expect(ids(grouped.upToDate.entries)).toEqual(["current"]);
    expect(grouped.attention).toEqual({ entries: [], issues: [] });
    expect(grouped.quiet).toEqual({ entries: [], issues: [] });
  });
});

describe("getLatestEntry", () => {
  test("returns the most recently published entry", () => {
    const entries = [
      createErrorEntry("broken", "notFound"),
      createEntry("older", "upToDate", { publishedAt: daysAgo(30) }),
      createEntry("newest", "quiet", { publishedAt: daysAgo(3) }),
    ];

    expect(getLatestEntry(entries)?.id).toBe("newest");
  });

  test("is undefined when nothing was published", () => {
    expect(getLatestEntry([createErrorEntry("broken", "notFound")])).toBeUndefined();
  });
});

describe("summarizeChangelog", () => {
  test.each([undefined, ""])("has no snippet and no changes for %j", (notes) => {
    expect(summarizeChangelog(notes)).toEqual({ changes: 0 });
  });

  test("summarizes a GitHub generated changelog", () => {
    const notes = [
      "## What's Changed",
      "### :sparkles: Features",
      "* Add OIDC login by @octo-cat in https://github.com/homarr-labs/homarr/pull/1",
      "* Support [Podman](https://podman.io) sockets by @renovate[bot] in https://github.com/homarr-labs/homarr/pull/2",
      "- Fix ![icon](https://example.com/icon.png) icon alignment",
      "",
      "**Full Changelog**: https://github.com/homarr-labs/homarr/compare/v1.0.0...v1.1.0",
    ].join("\n");

    expect(summarizeChangelog(notes)).toEqual({
      snippet: "Features · Add OIDC login · Support Podman sockets",
      changes: 3,
    });
  });

  test("keeps the text of links and drops their targets", () => {
    expect(snippetOf("Read the [migration guide](https://homarr.dev/docs/migration) first")).toBe(
      "Read the migration guide first",
    );
  });

  test("drops images", () => {
    expect(snippetOf("![screenshot](https://example.com/shot.png) Added a dark mode")).toBe("Added a dark mode");
  });

  test("drops bare links", () => {
    expect(snippetOf("Docs moved to https://homarr.dev/docs today")).toBe("Docs moved to today");
  });

  test("replaces HTML tags with spaces", () => {
    expect(snippetOf('<img src="logo.png" /><b>Breaking:</b>drop<br/>Node 18')).toBe("Breaking: drop Node 18");
  });

  test("drops the author and pull request of generated entries", () => {
    expect(snippetOf("- Bump zod by @dependabot[bot] in https://github.com/o/r/pull/3")).toBe("Bump zod");
  });

  test("drops emoji shortcodes", () => {
    expect(snippetOf(":bug: Fix a crash on startup :tada:")).toBe("Fix a crash on startup");
  });

  test("drops alert markers and keeps comparison operators", () => {
    expect(snippetOf("> [!NOTE]\n> Requires Node >= 20")).toBe("Requires Node >= 20");
  });

  test.each([
    ["# Highlights", "Highlights"],
    ["###### Small heading", "Small heading"],
    ["- Dash item", "Dash item"],
    ["* Star item", "Star item"],
    ["+ Plus item", "Plus item"],
    ["12. Numbered item", "Numbered item"],
    ["> Quoted text", "Quoted text"],
    ["Use `bun` **now** or _later_ ~~never~~", "Use bun now or later never"],
  ])("strips markdown from %j", (notes, expected) => {
    expect(snippetOf(notes)).toBe(expected);
  });

  test.each(["Changelog", "Release notes", "What's changed", "Whats changed", "Full changelog: v1...v2"])(
    "ignores the boilerplate line %j",
    (notes) => {
      expect(snippetOf(notes)).toBeUndefined();
    },
  );

  test("ignores lines that are too short to be useful", () => {
    expect(snippetOf("- ok\n- Fix the build")).toBe("Fix the build");
  });

  test("keeps only the first three readable lines", () => {
    expect(snippetOf("One line\nTwo lines\nThree lines\nFour lines")).toBe("One line · Two lines · Three lines");
  });

  test("counts bullet list items as changes", () => {
    const notes = ["- First", "* Second", "+ Third", "  - Nested", "1. Ordered", "---", "-", "Plain text"].join("\n");

    expect(summarizeChangelog(notes).changes).toBe(4);
  });
});
