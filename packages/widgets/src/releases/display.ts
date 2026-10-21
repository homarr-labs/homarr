import type { ReleaseEntry, ReleaseEntryErrorCode } from "./release-entry";
import type { ReleaseSectionKey } from "./release-options";

export type EntryKind = "unseen" | "seen" | "stale" | "error";

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

export interface GroupedEntries {
  unseen: ReleaseEntry[];
  upToDate: ReleaseEntry[];
  quiet: ReleaseEntry[];
  issues: IssueGroup[];
}

export const sectionKindByKey: Record<ReleaseSectionKey, EntryKind> = {
  new: "unseen",
  attention: "error",
  upToDate: "seen",
  quiet: "stale",
};

export const getEntryKind = (entry: ReleaseEntry): EntryKind => {
  if (entry.status === "error") return "error";
  if (entry.status === "new" && !entry.isViewed) return "unseen";
  if (entry.status === "stale") return "stale";
  return "seen";
};

export const getSectionKey = (kind: EntryKind): ReleaseSectionKey =>
  (Object.keys(sectionKindByKey) as ReleaseSectionKey[]).find((key) => sectionKindByKey[key] === kind) ?? "upToDate";

const byRecency = (left: ReleaseEntry, right: ReleaseEntry) =>
  (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0);

export const groupEntries = (entries: ReleaseEntry[]): GroupedEntries => {
  const unseen: ReleaseEntry[] = [];
  const upToDate: ReleaseEntry[] = [];
  const quiet: ReleaseEntry[] = [];
  const issues = new Map<string, IssueGroup>();

  for (const entry of entries) {
    const kind = getEntryKind(entry);
    if (kind === "unseen") unseen.push(entry);
    else if (kind === "seen") upToDate.push(entry);
    else if (kind === "stale") quiet.push(entry);
    else {
      const code = entry.error?.code ?? "unexpected";
      const key = `${entry.provider?.kind ?? "none"}:${code}`;
      const group = issues.get(key) ?? { key, code, providerName: entry.provider?.name, entries: [] };
      group.entries.push(entry);
      issues.set(key, group);
    }
  }

  return {
    unseen: unseen.toSorted(byRecency),
    upToDate: upToDate.toSorted(byRecency),
    quiet: quiet.toSorted(byRecency),
    issues: [...issues.values()],
  };
};

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
        .replace(/<[^>]+>/g, "")
        .replace(/\[![A-Z]+\]/g, "")
        .replace(/:[a-z][a-z0-9_+-]*:/g, "")
        .replace(/^\s*(#{1,6}|[-*+]|\d+\.|>)\s*/, "")
        .replace(/[*_`~]/g, "")
        .trim(),
    )
    .filter((line) => line.length > 3 && !ignoredChangelogLine.test(line));
  return { snippet: readable.slice(0, 3).join(" · ") || undefined, changes };
};
