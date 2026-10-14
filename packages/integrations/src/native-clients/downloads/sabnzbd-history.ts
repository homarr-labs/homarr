import type { SabnzbdHistorySlot } from "../../download-client/sabnzbd/sabnzbd-schema";

export async function getSabnzbdHistorySlotsAsync(input: {
  activeSlots: SabnzbdHistorySlot[];
  historyWindowDays: number;
  fetchPageAsync: (input: { start: number; limit: number }) => Promise<SabnzbdHistorySlot[]>;
  now?: number;
}): Promise<SabnzbdHistorySlot[]> {
  const cutoff = Math.floor((input.now ?? Date.now()) / 1000) - input.historyWindowDays * 24 * 60 * 60;
  const archivedSlots: SabnzbdHistorySlot[] = [];
  for (let page = 0; page < 100; page += 1) {
    const slots = await input.fetchPageAsync({ start: page * 100, limit: 100 });
    archivedSlots.push(...slots);
    if (slots.length < 100 || slots.every((slot) => slot.completed < cutoff)) break;
  }
  const isProcessingSlot = (slot: SabnzbdHistorySlot) => slot.status !== "Completed" && slot.status !== "Failed";
  const seenIds = new Set<string>();
  return [
    ...input.activeSlots.filter(isProcessingSlot),
    ...[...input.activeSlots, ...archivedSlots]
      .filter((slot) => !isProcessingSlot(slot) && slot.completed >= cutoff)
      .toSorted((first, second) => second.completed - first.completed),
  ].filter((slot) => {
    if (seenIds.has(slot.nzo_id)) return false;
    seenIds.add(slot.nzo_id);
    return true;
  });
}
