import type { SabnzbdHistorySlot } from "./sabnzbd-schema";

const SECONDS_PER_DAY = 24 * 60 * 60;
const ARCHIVED_HISTORY_PAGE_SIZE = 100;
const MAX_ARCHIVED_HISTORY_PAGES = 100;

interface GetSabnzbdHistorySlotsInput {
  activeSlots: SabnzbdHistorySlot[];
  historyWindowDays: number;
  fetchPageAsync: (input: { start: number; limit: number }) => Promise<SabnzbdHistorySlot[]>;
  now?: number;
}

export async function getSabnzbdHistorySlotsAsync({
  activeSlots,
  historyWindowDays,
  fetchPageAsync,
  now = Date.now(),
}: GetSabnzbdHistorySlotsInput): Promise<SabnzbdHistorySlot[]> {
  const cutoff = Math.floor(now / 1000) - historyWindowDays * SECONDS_PER_DAY;
  const archivedSlots: SabnzbdHistorySlot[] = [];

  for (let page = 0; page < MAX_ARCHIVED_HISTORY_PAGES; page += 1) {
    const slots = await fetchPageAsync({
      start: page * ARCHIVED_HISTORY_PAGE_SIZE,
      limit: ARCHIVED_HISTORY_PAGE_SIZE,
    });

    archivedSlots.push(...slots);

    if (slots.length < ARCHIVED_HISTORY_PAGE_SIZE || slots.every((slot) => slot.completed < cutoff)) {
      break;
    }
  }

  const seenIds = new Set<string>();

  return [...activeSlots, ...archivedSlots]
    .filter((slot) => slot.completed >= cutoff)
    .toSorted((first, second) => second.completed - first.completed)
    .filter((slot) => {
      if (seenIds.has(slot.nzo_id)) return false;
      seenIds.add(slot.nzo_id);
      return true;
    });
}
