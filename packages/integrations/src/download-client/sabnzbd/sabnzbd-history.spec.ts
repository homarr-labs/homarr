import { describe, expect, test, vi } from "vitest";

import type { SabnzbdHistorySlot } from "./sabnzbd-schema";
import { getSabnzbdHistorySlotsAsync } from "./sabnzbd-history";

const NOW = Date.UTC(2026, 7, 10);

function createSlot(id: string, daysAgo: number): SabnzbdHistorySlot {
  return {
    category: "test",
    download_time: 60,
    status: "Completed",
    completed: Math.floor(NOW / 1000) - daysAgo * 24 * 60 * 60,
    nzo_id: id,
    postproc_time: 30,
    name: id,
    bytes: 1000,
  };
}

describe("getSabnzbdHistorySlotsAsync", () => {
  test("merges active and archived history, filters by window, sorts newest first, and deduplicates", async () => {
    const result = await getSabnzbdHistorySlotsAsync({
      activeSlots: [createSlot("active", 1), createSlot("duplicate", 3)],
      historyWindowDays: 10,
      now: NOW,
      fetchPageAsync: vi
        .fn()
        .mockResolvedValue([createSlot("archived", 2), createSlot("duplicate", 3), createSlot("expired", 11)]),
    });

    expect(result.map((slot) => slot.nzo_id)).toEqual(["active", "archived", "duplicate"]);
  });

  test.each([2, 7, 14, 28])("includes the exact %i-day cutoff", async (historyWindowDays) => {
    const result = await getSabnzbdHistorySlotsAsync({
      activeSlots: [],
      historyWindowDays,
      now: NOW,
      fetchPageAsync: vi
        .fn()
        .mockResolvedValue([createSlot("inside", historyWindowDays), createSlot("outside", historyWindowDays + 1)]),
    });

    expect(result.map((slot) => slot.nzo_id)).toEqual(["inside"]);
  });

  test("requests another page when the archive page is full", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => createSlot(`page-1-${index}`, 1));
    const fetchPageAsync = vi
      .fn()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([createSlot("page-2", 2)]);

    await getSabnzbdHistorySlotsAsync({
      activeSlots: [],
      historyWindowDays: 10,
      now: NOW,
      fetchPageAsync,
    });

    expect(fetchPageAsync).toHaveBeenNthCalledWith(1, { start: 0, limit: 100 });
    expect(fetchPageAsync).toHaveBeenNthCalledWith(2, { start: 100, limit: 100 });
    expect(fetchPageAsync).toHaveBeenCalledTimes(2);
  });

  test("stops after a full page that is entirely outside the selected window", async () => {
    const expiredPage = Array.from({ length: 100 }, (_, index) => createSlot(`expired-${index}`, 11));
    const fetchPageAsync = vi.fn().mockResolvedValue(expiredPage);

    await getSabnzbdHistorySlotsAsync({
      activeSlots: [],
      historyWindowDays: 10,
      now: NOW,
      fetchPageAsync,
    });

    expect(fetchPageAsync).toHaveBeenCalledTimes(1);
  });

  test("stops after a partial archive page", async () => {
    const fetchPageAsync = vi.fn().mockResolvedValue([createSlot("archived", 1)]);

    await getSabnzbdHistorySlotsAsync({
      activeSlots: [],
      historyWindowDays: 10,
      now: NOW,
      fetchPageAsync,
    });

    expect(fetchPageAsync).toHaveBeenCalledTimes(1);
  });
});
