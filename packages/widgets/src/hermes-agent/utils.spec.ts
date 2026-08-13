import { describe, expect, test } from "vitest";

import {
  getDetailsLayout,
  getDetailItemLimit,
  getDetailsTypography,
  getLayoutMode,
  getMetricColumns,
  scaleHermesTypography,
  getTypographyScale,
  getVisibleMetricIds,
} from "./layout";
import {
  HERMES_FONT_CHOICES,
  HERMES_FONT_OPTIONS,
  HERMES_NEUTRAL_THEME,
  HERMES_THEME_PRESETS,
  HERMES_THEME_PRESET_OPTIONS,
  resolveHermesTheme,
} from "./theme-data";
import {
  getCompactStatusKey,
  getJobDisplayState,
  getJobSortPriority,
  getOverflowList,
  sortSkillsByUsage,
  getStatusColor,
  getThemeStatusColor,
} from "./utils";

describe("Hermes Agent widget utilities", () => {
  test("maps current gateway and readiness states to semantic colors", () => {
    expect(getStatusColor("ready")).toBe("green");
    expect(getStatusColor("degraded")).toBe("yellow");
    expect(getStatusColor("draining")).toBe("yellow");
    expect(getStatusColor("auth_error")).toBe("red");
    expect(getStatusColor("startup_failed")).toBe("red");
    expect(getStatusColor("stopped")).toBe("red");

    const cyberpunk = resolveHermesTheme(true, "cyberpunk", "theme");
    expect(getThemeStatusColor(cyberpunk, "ready")).toBe("#00ff88");
    expect(getThemeStatusColor(cyberpunk, "busy")).toBe("#ffd700");
    expect(getThemeStatusColor(cyberpunk, "failed")).toBe("#ff0055");
  });

  test("resolves every current Hermes theme and curated font override", () => {
    expect(HERMES_THEME_PRESET_OPTIONS).toHaveLength(8);
    expect(HERMES_FONT_OPTIONS).toHaveLength(15);

    const midnight = resolveHermesTheme(true, "midnight", "theme");
    expect(midnight.background).toBe("#0a0a1f");
    expect(midnight.fontSans).toContain("Inter");
    expect(midnight.fontMono).toContain("--font-hermes-jetbrains-mono");

    const customFont = resolveHermesTheme(true, "midnight", "space-mono");
    expect(customFont.fontSans).toContain("Space Mono");
    expect(customFont.fontMono).toBe(midnight.fontMono);
    expect(JSON.stringify({ themes: HERMES_THEME_PRESETS, fonts: HERMES_FONT_CHOICES })).not.toContain(
      "fonts.googleapis.com",
    );

    expect(resolveHermesTheme(false, "cyberpunk", "theme")).toBe(HERMES_NEUTRAL_THEME);
    expect(resolveHermesTheme(true, "unknown", "unknown").background).toBe("#041c1c");
  });

  test("maps gateway states to compact label keys", () => {
    expect(getCompactStatusKey("running")).toBe("ok");
    expect(getCompactStatusKey("waiting_for_approval")).toBe("wait");
    expect(getCompactStatusKey("startup_failed")).toBe("error");
    expect(getCompactStatusKey("something_else")).toBeNull();
  });

  test("sorts failed jobs first while paused wins the display state", () => {
    const failed = { failed: true, paused: false };
    const paused = { failed: false, paused: true };
    const failedAndPaused = { failed: true, paused: true };
    const enabled = { failed: false, paused: false };

    expect(getJobSortPriority(failed)).toBe(0);
    expect(getJobSortPriority(failedAndPaused)).toBe(0);
    expect(getJobSortPriority(paused)).toBe(1);
    expect(getJobSortPriority(enabled)).toBe(2);
    expect(getJobDisplayState(failedAndPaused)).toBe("paused");
    expect(getJobDisplayState(failed)).toBe("failed");
  });

  test("reserves the final available list row for the hidden-item count", () => {
    expect(getOverflowList(["a", "b"], 1)).toEqual({
      visibleItems: [],
      remainingCount: 2,
      remainingIsLowerBound: false,
    });
    expect(getOverflowList(["a", "b", "c", "d", "e", "f"], 4)).toEqual({
      visibleItems: ["a", "b", "c"],
      remainingCount: 3,
      remainingIsLowerBound: false,
    });
    expect(getOverflowList(["a", "b", "c", "d"], 4)).toEqual({
      visibleItems: ["a", "b", "c", "d"],
      remainingCount: 0,
      remainingIsLowerBound: false,
    });
  });

  test("uses exact and lower-bound totals for paginated lists", () => {
    expect(getOverflowList(["a", "b", "c", "d", "e"], 4, { totalItems: 12, hasMore: true })).toEqual({
      visibleItems: ["a", "b", "c"],
      remainingCount: 9,
      remainingIsLowerBound: false,
    });
    expect(getOverflowList(["a", "b", "c", "d", "e"], 4, { hasMore: true })).toEqual({
      visibleItems: ["a", "b", "c"],
      remainingCount: 3,
      remainingIsLowerBound: true,
    });
    expect(getOverflowList(["a", "b"], 4, { hasMore: true })).toEqual({
      visibleItems: ["a", "b"],
      remainingCount: 1,
      remainingIsLowerBound: true,
    });
  });

  test("sorts enabled skill rows by usage and uses names as a stable fallback", () => {
    const skills = [
      { name: "unknown", usage: null },
      { name: "beta", usage: 12 },
      { name: "alpha", usage: 12 },
      { name: "unused", usage: 0 },
    ];

    expect(sortSkillsByUsage(skills).map((skill) => skill.name)).toEqual(["alpha", "beta", "unused", "unknown"]);
    expect(skills.map((skill) => skill.name)).toEqual(["unknown", "beta", "alpha", "unused"]);
  });

  test("replaces the unavailable update metric in compact layouts", () => {
    expect(getVisibleMetricIds("micro", true)).toEqual(["version", "update", "jobs", "skills"]);
    expect(getVisibleMetricIds("micro", false)).toEqual(["version", "jobs", "skills", "platforms"]);
    expect(getVisibleMetricIds("showcase", false)).not.toContain("update");
  });

  test("gives the one-row 1x1 and 2x1 tiles dedicated layouts", () => {
    expect(getLayoutMode(99, 99)).toBe("micro");
    expect(getLayoutMode(224, 99)).toBe("mini");
    expect(getLayoutMode(349, 99)).toBe("strip");
    expect(getLayoutMode(160, 160)).toBe("micro");
    expect(getLayoutMode(345, 160)).toBe("mini");
    expect(getLayoutMode(530, 160)).toBe("strip");
    expect(getLayoutMode(600, 180)).toBe("strip");
    expect(getLayoutMode(224, 224)).toBe("standard");
    expect(getLayoutMode(188, 188)).toBe("micro");
    expect(getLayoutMode(188, 358)).toBe("tall");
    expect(getLayoutMode(219, 438)).toBe("tall");
    expect(getLayoutMode(224, 448)).toBe("standard");
    expect(getMetricColumns("micro", 99)).toBe(2);
    expect(getMetricColumns("mini", 224)).toBe(3);
    expect(getMetricColumns("strip", 420)).toBe(3);
    expect(getMetricColumns("strip", 449)).toBe(3);
    expect(getMetricColumns("strip", 467)).toBe(6);
    expect(getMetricColumns("strip", 499)).toBe(6);
    expect(getMetricColumns("strip", 530)).toBe(6);
    expect(getVisibleMetricIds("mini", true)).toEqual(["version", "update", "jobs", "skills", "platforms", "toolsets"]);
    expect(getVisibleMetricIds("tall", true)).toEqual([
      "version",
      "update",
      "jobs",
      "skills",
      "platforms",
      "toolsets",
      "agents",
      "sessions",
    ]);
  });

  test("fits detail sections and rows to standard widget sizes without scrolling", () => {
    expect(getLayoutMode(500, 160)).toBe("strip");
    expect(getDetailsLayout(340, 330)).toEqual({ columns: 1, maxSections: 1, itemLimit: 5 });
    expect(getDetailsLayout(520, 350)).toEqual({ columns: 2, maxSections: 2, itemLimit: 5 });
    expect(getDetailsLayout(520, 880)).toEqual({ columns: 2, maxSections: 4, itemLimit: 15 });
    expect(getDetailsLayout(1050, 700)).toEqual({ columns: 4, maxSections: 4, itemLimit: 23 });
    expect(getDetailsLayout(520, 260)).toBeNull();
    expect(getDetailsLayout(600, 180)).toBeNull();
  });

  test("reserves enough measured panel height for the overflow summary row", () => {
    const typography = getDetailsTypography(730, 4);

    expect(getDetailItemLimit(694.5, typography)).toBe(36);
  });

  test("scales card and detail typography to their available width", () => {
    const compactStrip = getTypographyScale(349, 99, "strip");
    const wideStrip = getTypographyScale(800, 99, "strip");
    const compactShowcase = getTypographyScale(380, 700, "showcase");
    const wideShowcase = getTypographyScale(900, 700, "showcase");
    const shortTall = getTypographyScale(125, 250, "tall");
    const tallTall = getTypographyScale(125, 500, "tall");
    const shortWideStrip = getTypographyScale(735, 103, "strip");
    const tallWideStrip = getTypographyScale(735, 169, "strip");

    expect(wideStrip.title).toBeGreaterThan(compactStrip.title);
    expect(wideStrip.metricValue).toBeGreaterThan(compactStrip.metricValue);
    expect(wideShowcase.title).toBeGreaterThan(compactShowcase.title);
    expect(wideShowcase.metricLabel).toBeGreaterThan(compactShowcase.metricLabel);
    expect(tallTall.metricValue).toBeGreaterThan(shortTall.metricValue);
    expect(tallWideStrip.title).toBeGreaterThan(shortWideStrip.title);
    expect(tallWideStrip.metricLabel).toBeGreaterThan(shortWideStrip.metricLabel);
    expect(tallWideStrip.metricValue).toBeGreaterThan(shortWideStrip.metricValue);

    expect(getDetailsTypography(374, 2).item).toBe(11);
    expect(getDetailsTypography(624, 2).item).toBe(13);
    expect(getDetailsTypography(749, 4).item).toBe(11);

    const largeTypography = scaleHermesTypography(compactShowcase, 1.12);
    expect(largeTypography.title).toBeGreaterThan(compactShowcase.title);
    expect(largeTypography.metricValue).toBeGreaterThan(compactShowcase.metricValue);
  });
});
