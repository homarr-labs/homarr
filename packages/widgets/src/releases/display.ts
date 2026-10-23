import { isDateWithin } from "@homarr/common";

import type { EntryKind, ReleaseEntry, ReleaseEntryErrorCode } from "./release-entry";
import type { ReleaseSectionKey } from "./release-options";

export interface IssueGroup {
  key: string;
  code: ReleaseEntryErrorCode;
  providerName?: string;
  entries: ReleaseEntry[];
}

export interface ChangelogDigest {
  snippet?: string;
  changes: number;
}

export interface SectionEntries {
  entries: ReleaseEntry[];
  issues: IssueGroup[];
}

export interface ReleaseWindows {
  newReleaseWithin: string;
  staleReleaseWithin: string;
}

export const sectionByKind: Record<EntryKind, ReleaseSectionKey> = {
  new: "new",
  outdated: "attention",
  error: "attention",
  upToDate: "upToDate",
  quiet: "quiet",
};

const normalizeRelativeDate = (relativeDate: string) => {
  if (/^\d+m$/.test(relativeDate)) return relativeDate.toUpperCase();
  if (/^\d+[HDWY]$/.test(relativeDate)) return relativeDate.toLowerCase();
  return relativeDate;
};

const isWithin = (date: Date, relativeDate: string) => {
  const normalized = normalizeRelativeDate(relativeDate);
  return /^[1-9]\d*[hdwMy]$/.test(normalized) && isDateWithin(date, normalized);
};

export const hasOutdatedIntegration = (entry: Pick<ReleaseEntry, "integrations">) =>
  entry.integrations.some((integration) => integration.isUpToDate === false);

export const getEntryKind = (
  release: Pick<ReleaseEntry, "isViewed" | "integrations"> & { publishedAt: Date },
  windows: ReleaseWindows,
): Exclude<EntryKind, "error"> => {
  if (!release.isViewed && isWithin(release.publishedAt, windows.newReleaseWithin)) return "new";
  if (hasOutdatedIntegration(release)) return "outdated";
  if (windows.staleReleaseWithin !== "never" && !isWithin(release.publishedAt, windows.staleReleaseWithin)) {
    return "quiet";
  }
  return "upToDate";
};

const byRecency = (left: ReleaseEntry, right: ReleaseEntry) =>
  (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0);

const groupIssues = (entries: ReleaseEntry[]) => {
  const issues = new Map<string, IssueGroup>();
  for (const entry of entries) {
    if (entry.kind !== "error") continue;
    const key = `${entry.provider?.kind ?? "none"}:${entry.error.code}`;
    const group = issues.get(key) ?? { key, code: entry.error.code, providerName: entry.provider?.name, entries: [] };
    group.entries.push(entry);
    issues.set(key, group);
  }
  return [...issues.values()];
};

export const groupEntries = (
  entries: ReleaseEntry[],
  visibleSections: readonly ReleaseSectionKey[],
): Record<ReleaseSectionKey, SectionEntries> => {
  const visible = entries.filter((entry) => visibleSections.includes(sectionByKind[entry.kind]));
  const rowsIn = (section: ReleaseSectionKey) =>
    visible.filter((entry) => entry.kind !== "error" && sectionByKind[entry.kind] === section).toSorted(byRecency);

  return {
    new: { entries: rowsIn("new"), issues: [] },
    attention: { entries: rowsIn("attention"), issues: groupIssues(visible) },
    upToDate: { entries: rowsIn("upToDate"), issues: [] },
    quiet: { entries: rowsIn("quiet"), issues: [] },
  };
};

export const countIssueEntries = (issues: IssueGroup[]) =>
  issues.reduce((total, group) => total + group.entries.length, 0);

export const getLatestEntry = (entries: ReleaseEntry[]) =>
  entries.filter((entry) => entry.publishedAt).toSorted(byRecency)[0];

const ignoredChangelogLine = /^(what'?s changed|changelog|release notes|full changelog|https?:)/i;

export const summarizeChangelog = (notes: string | undefined): ChangelogDigest => {
  if (!notes) return { changes: 0 };
  const lines = notes.split(/\r?\n/);
  const changes = lines.filter((line) => /^\s*[-*+]\s+\S/.test(line)).length;
  const readable = lines
    .map((line) =>
      line
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\s+by @[\w-]+(?:\[bot\])? in https?:\/\/\S+/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\[![A-Z]+\]/g, "")
        .replace(/:[a-z][a-z0-9_+-]*:/g, "")
        .replace(/^\s*(#{1,6}|[-*+]|\d+\.|>)\s*/, "")
        .replace(/[*_`~]/g, "")
        .replace(/\s{2,}/g, " ")
        .trim(),
    )
    .filter((line) => line.length > 3 && !ignoredChangelogLine.test(line));
  return { snippet: readable.slice(0, 3).join(" · ") || undefined, changes };
};
