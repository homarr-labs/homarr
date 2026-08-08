import type { SabnzbdHistorySlot } from "./sabnzbd-schema";

const SECONDS_PER_DAY = 24 * 60 * 60;
const MAX_ARCHIVED_HISTORY_PAGES = 500;

interface BuildSabnzbdHistoryInput {
  activeSlots: SabnzbdHistorySlot[];
  archivedSlots: SabnzbdHistorySlot[];
  historyWindowDays: number;
  now?: number;
}

interface SelectSabnzbdHistoryInput extends BuildSabnzbdHistoryInput {
  includeArchivedHistory: boolean;
}

interface FetchSabnzbdArchivedHistoryPageInput {
  start: number;
  limit: number;
}

interface FetchSabnzbdArchivedHistoryInput {
  fetchPageAsync: (input: FetchSabnzbdArchivedHistoryPageInput) => Promise<SabnzbdHistorySlot[]>;
  historyWindowDays: number;
  pageSize: number;
  now?: number;
}

const getHistoryCutoff = (historyWindowDays: number, now: number): number =>
  Math.floor(now / 1000) - historyWindowDays * SECONDS_PER_DAY;

const isSortedNewestFirst = (slots: SabnzbdHistorySlot[]): boolean =>
  slots.every((slot, index) => index === 0 || (slots[index - 1]?.completed ?? slot.completed) >= slot.completed);

const getPageSignature = (slots: SabnzbdHistorySlot[]): string => slots.map((slot) => slot.nzo_id).join("\0");

export const fetchSabnzbdArchivedHistorySlotsAsync = async ({
  fetchPageAsync,
  historyWindowDays,
  pageSize,
  now = Date.now(),
}: FetchSabnzbdArchivedHistoryInput): Promise<SabnzbdHistorySlot[]> => {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error("SABnzbd archive page size must be a positive integer");
  }

  const historyCutoff = getHistoryCutoff(historyWindowDays, now);
  const archivedSlots: SabnzbdHistorySlot[] = [];
  const seenPageSignatures = new Set<string>();
  let start = 0;
  let pagesFetched = 0;

  while (pagesFetched < MAX_ARCHIVED_HISTORY_PAGES) {
    const pageSlots = await fetchPageAsync({
      start,
      limit: pageSize,
    });
    pagesFetched += 1;

    if (pageSlots.length === 0) {
      break;
    }

    const pageSignature = getPageSignature(pageSlots);

    if (seenPageSignatures.has(pageSignature)) {
      break;
    }

    seenPageSignatures.add(pageSignature);

    archivedSlots.push(...pageSlots.filter((slot) => slot.completed >= historyCutoff));

    if (pageSlots.length < pageSize) {
      break;
    }

    const oldestSlot = pageSlots[pageSlots.length - 1];

    if (oldestSlot !== undefined && isSortedNewestFirst(pageSlots) && oldestSlot.completed < historyCutoff) {
      break;
    }

    start += pageSlots.length;
  }

  return archivedSlots;
};

export const buildSabnzbdHistorySlots = ({
  activeSlots,
  archivedSlots,
  historyWindowDays,
  now = Date.now(),
}: BuildSabnzbdHistoryInput): SabnzbdHistorySlot[] => {
  const historyCutoff = getHistoryCutoff(historyWindowDays, now);
  const seenIds = new Set<string>();

  return [...activeSlots, ...archivedSlots]
    .filter((slot) => slot.completed >= historyCutoff)
    .toSorted((first, second) => second.completed - first.completed)
    .filter((slot) => {
      if (seenIds.has(slot.nzo_id)) {
        return false;
      }

      seenIds.add(slot.nzo_id);
      return true;
    });
};

export const selectSabnzbdHistorySlots = ({
  includeArchivedHistory,
  activeSlots,
  archivedSlots,
  historyWindowDays,
  now,
}: SelectSabnzbdHistoryInput): SabnzbdHistorySlot[] => {
  if (!includeArchivedHistory) {
    return activeSlots;
  }

  return buildSabnzbdHistorySlots({
    activeSlots,
    archivedSlots,
    historyWindowDays,
    now,
  });
};
