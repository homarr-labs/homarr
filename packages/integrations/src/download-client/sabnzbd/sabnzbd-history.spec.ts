import { describe, expect, it, vi } from "vitest";

import {
  buildSabnzbdHistorySlots,
  fetchSabnzbdArchivedHistorySlotsAsync,
  selectSabnzbdHistorySlots,
} from "./sabnzbd-history";
import type { SabnzbdHistorySlot } from "./sabnzbd-schema";

const NOW = Date.UTC(2026, 7, 1, 12, 0, 0);
const SECOND = 1000;
const DAY = 24 * 60 * 60 * SECOND;

const createSlot = (id: string, completedAt: number): SabnzbdHistorySlot => ({
  category: "default",
  download_time: 10,
  status: "Completed",
  completed: Math.floor(completedAt / SECOND),
  nzo_id: id,
  postproc_time: 5,
  name: id,
  bytes: 1024,
});

describe("buildSabnzbdHistorySlots", () => {
  it("filters by the selected window and sorts newest first", () => {
    const slots = buildSabnzbdHistorySlots({
      activeSlots: [createSlot("active", NOW - 2 * DAY), createSlot("old", NOW - 11 * DAY)],
      archivedSlots: [createSlot("newest", NOW - DAY), createSlot("archive", NOW - 3 * DAY)],
      historyWindowDays: 10,
      now: NOW,
    });

    expect(slots.map((slot) => slot.nzo_id)).toEqual(["newest", "active", "archive"]);
  });

  it("deduplicates matching active and archived jobs by nzo_id", () => {
    const slots = buildSabnzbdHistorySlots({
      activeSlots: [createSlot("duplicate", NOW - DAY)],
      archivedSlots: [createSlot("duplicate", NOW - 2 * DAY), createSlot("archive-only", NOW - 3 * DAY)],
      historyWindowDays: 10,
      now: NOW,
    });

    expect(slots.map((slot) => slot.nzo_id)).toEqual(["duplicate", "archive-only"]);
  });

  it("includes a job completed exactly at the history cutoff", () => {
    const slots = buildSabnzbdHistorySlots({
      activeSlots: [],
      archivedSlots: [createSlot("cutoff", NOW - 10 * DAY), createSlot("outside", NOW - 10 * DAY - SECOND)],
      historyWindowDays: 10,
      now: NOW,
    });

    expect(slots.map((slot) => slot.nzo_id)).toEqual(["cutoff"]);
  });
});

describe("selectSabnzbdHistorySlots", () => {
  it("preserves standard SABnzbd history when archived history is disabled", () => {
    const activeSlots = [createSlot("older", NOW - 30 * DAY), createSlot("newer", NOW - DAY)];

    const slots = selectSabnzbdHistorySlots({
      includeArchivedHistory: false,
      activeSlots,
      archivedSlots: [createSlot("archived", NOW - 2 * DAY)],
      historyWindowDays: 10,
      now: NOW,
    });

    expect(slots).toBe(activeSlots);
    expect(slots.map((slot) => slot.nzo_id)).toEqual(["older", "newer"]);
  });
});

describe("fetchSabnzbdArchivedHistorySlotsAsync", () => {
  it("advances through archive pages until SAB returns a partial page", async () => {
    const pages = new Map<number, SabnzbdHistorySlot[]>([
      [0, [createSlot("one", NOW - DAY), createSlot("two", NOW - 2 * DAY)]],
      [2, [createSlot("three", NOW - 3 * DAY)]],
    ]);

    const fetchPageAsync = vi.fn(async ({ start }: { start: number }) => pages.get(start) ?? []);

    const slots = await fetchSabnzbdArchivedHistorySlotsAsync({
      fetchPageAsync,
      historyWindowDays: 10,
      pageSize: 2,
      now: NOW,
    });

    expect(fetchPageAsync.mock.calls.map(([input]) => input.start)).toEqual([0, 2]);
    expect(slots.map((slot) => slot.nzo_id)).toEqual(["one", "two", "three"]);
  });

  it("stops once a sorted page crosses the selected history window", async () => {
    const fetchPageAsync = vi.fn(async ({ start }: { start: number }) => {
      if (start === 0) {
        return [createSlot("one", NOW - DAY), createSlot("two", NOW - 2 * DAY)];
      }

      if (start === 2) {
        return [createSlot("three", NOW - 9 * DAY), createSlot("old", NOW - 11 * DAY)];
      }

      throw new Error("A page beyond the history cutoff was requested");
    });

    const slots = await fetchSabnzbdArchivedHistorySlotsAsync({
      fetchPageAsync,
      historyWindowDays: 10,
      pageSize: 2,
      now: NOW,
    });

    expect(fetchPageAsync).toHaveBeenCalledTimes(2);
    expect(slots.map((slot) => slot.nzo_id)).toEqual(["one", "two", "three"]);
  });

  it("continues after an unsorted page instead of assuming later pages are older", async () => {
    const fetchPageAsync = vi.fn(async ({ start }: { start: number }) => {
      if (start === 0) {
        return [createSlot("old", NOW - 11 * DAY), createSlot("recent", NOW - DAY)];
      }

      return [];
    });

    const slots = await fetchSabnzbdArchivedHistorySlotsAsync({
      fetchPageAsync,
      historyWindowDays: 10,
      pageSize: 2,
      now: NOW,
    });

    expect(fetchPageAsync).toHaveBeenCalledTimes(2);
    expect(slots.map((slot) => slot.nzo_id)).toEqual(["recent"]);
  });

  it("stops safely when SAB repeats the same full page", async () => {
    const repeatedPage = [createSlot("one", NOW - DAY), createSlot("two", NOW - 2 * DAY)];
    const fetchPageAsync = vi.fn(async () => repeatedPage);

    const slots = await fetchSabnzbdArchivedHistorySlotsAsync({
      fetchPageAsync,
      historyWindowDays: 10,
      pageSize: 2,
      now: NOW,
    });

    expect(fetchPageAsync).toHaveBeenCalledTimes(2);
    expect(slots.map((slot) => slot.nzo_id)).toEqual(["one", "two"]);
  });

  it("stops safely when SAB cycles between previously seen pages", async () => {
    const firstPage = [createSlot("one", NOW - DAY), createSlot("two", NOW - 2 * DAY)];
    const secondPage = [createSlot("three", NOW - 3 * DAY), createSlot("four", NOW - 4 * DAY)];

    const fetchPageAsync = vi.fn(async ({ start }: { start: number }) => {
      if (start === 0) {
        return firstPage;
      }

      if (start === 2) {
        return secondPage;
      }

      return firstPage;
    });

    const slots = await fetchSabnzbdArchivedHistorySlotsAsync({
      fetchPageAsync,
      historyWindowDays: 10,
      pageSize: 2,
      now: NOW,
    });

    expect(fetchPageAsync).toHaveBeenCalledTimes(3);
    expect(slots.map((slot) => slot.nzo_id)).toEqual(["one", "two", "three", "four"]);
  });

  it("stops after the archive pagination safety limit", async () => {
    const fetchPageAsync = vi.fn(async ({ start }: { start: number }) => [createSlot(`slot-${start}`, NOW - DAY)]);

    const slots = await fetchSabnzbdArchivedHistorySlotsAsync({
      fetchPageAsync,
      historyWindowDays: 10,
      pageSize: 1,
      now: NOW,
    });

    expect(fetchPageAsync).toHaveBeenCalledTimes(500);
    expect(slots).toHaveLength(500);
    expect(slots[0]?.nzo_id).toBe("slot-0");
    expect(slots[499]?.nzo_id).toBe("slot-499");
  });

  it("rejects an invalid archive page size", async () => {
    await expect(
      fetchSabnzbdArchivedHistorySlotsAsync({
        fetchPageAsync: async () => [],
        historyWindowDays: 10,
        pageSize: 0,
        now: NOW,
      }),
    ).rejects.toThrow("SABnzbd archive page size must be a positive integer");
  });
});
