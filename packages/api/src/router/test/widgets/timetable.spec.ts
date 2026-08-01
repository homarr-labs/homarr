import { stringify } from "superjson";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { eq } from "@homarr/db";
import { boards, items, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { timetableRouter } from "../../widgets/timetable";

const mocks = vi.hoisted(() => ({ getTimetable: vi.fn(), searchStations: vi.fn(), lookup: vi.fn() }));

vi.mock("node:dns/promises", () => ({ default: { lookup: mocks.lookup }, lookup: mocks.lookup }));

vi.mock("@homarr/request-handler/timetable", () => ({
  timetableGetTimetableRequestHandler: {
    handler: (input: unknown) => ({
      getDataAsync: async () => {
        mocks.getTimetable(input);
        return { data: { stationId: "station", timestamp: new Date(0), entries: [] } };
      },
    }),
  },
  timetableSearchStationsRequestHandler: {
    handler: (input: unknown) => ({
      getDataAsync: async () => {
        mocks.searchStations(input);
        return { data: [] };
      },
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.lookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
});

const createSession = (userId: string): Session => ({
  user: { id: userId, permissions: [], colorScheme: "light" },
  expires: new Date().toISOString(),
});

const createCaller = (db: Database, session: Session | null) =>
  timetableRouter.createCaller({ db, deviceType: undefined, session });

const createTimetableItemAsync = async (
  db: Database,
  { baseUrl, isPublic = true }: { baseUrl: string; isPublic?: boolean },
) => {
  const ownerId = createId();
  const boardId = createId();
  const itemId = createId();
  await db.insert(users).values({ id: ownerId });
  await db.insert(boards).values({ id: boardId, name: `board-${boardId}`, creatorId: ownerId, isPublic });
  await db.insert(items).values({
    id: itemId,
    boardId,
    kind: "timetable",
    options: stringify({ baseUrl }),
  });
  return { boardId, itemId, ownerId };
};

describe("timetableRouter source authorization", () => {
  it("allows itemless setup only for the fixed default provider", async () => {
    const caller = createCaller(createDb(), null);

    await expect(caller.searchStations({ baseUrl: "https://search.ch", query: "Bern" })).resolves.toEqual([]);
    await expect(caller.searchStations({ baseUrl: "http://127.0.0.1:8080", query: "Bern" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("reports invalid timetable URLs as bad requests", async () => {
    const caller = createCaller(createDb(), null);

    await expect(
      caller.searchStations({ baseUrl: "https://search.ch?redirect=/admin", query: "Bern" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("loads a persisted private endpoint only through a viewable timetable item", async () => {
    const db = createDb();
    const baseUrl = "http://timetable.internal:8080";
    const { itemId } = await createTimetableItemAsync(db, { baseUrl });
    const caller = createCaller(db, null);

    await caller.getTimetable({ baseUrl, itemId, stationId: "station", limit: 10 });
    expect(mocks.getTimetable).toHaveBeenLastCalledWith(expect.objectContaining({ baseUrl }));
    await expect(
      caller.getTimetable({ baseUrl: "http://127.0.0.1:8080", itemId, stationId: "station", limit: 10 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a persisted endpoint when its board is not viewable", async () => {
    const db = createDb();
    const baseUrl = "http://timetable.internal:8080";
    const { itemId } = await createTimetableItemAsync(db, { baseUrl, isPublic: false });

    await expect(
      createCaller(db, null).getTimetable({ baseUrl, itemId, stationId: "station", limit: 10 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("allows board modifiers to search an unsaved public endpoint", async () => {
    const db = createDb();
    const baseUrl = "https://timetable.example.com";
    const { boardId, ownerId } = await createTimetableItemAsync(db, { baseUrl: "https://search.ch", isPublic: false });
    const caller = createCaller(db, createSession(ownerId));

    await caller.searchStations({ baseUrl, boardId, query: "Bern" });
    expect(mocks.lookup).toHaveBeenCalledWith("timetable.example.com", { all: true, verbatim: true });
    expect(mocks.searchStations).toHaveBeenLastCalledWith(
      expect.objectContaining({ baseUrl, pinnedAddresses: [{ address: "8.8.8.8", family: 4 }] }),
    );
  });

  it.each([
    "http://127.0.0.1:8080",
    "http://timetable.internal:8080",
    "http://[::1]:8080",
    "http://[::ffff:127.0.0.1]:8080",
    "http://[fd00::1]:8080",
    "http://[64:ff9b::7f00:1]:8080",
    "http://[2002:7f00:1::]:8080",
  ])("blocks an unsaved private endpoint %s even for board modifiers", async (baseUrl) => {
    const db = createDb();
    const { boardId, ownerId } = await createTimetableItemAsync(db, {
      baseUrl: "https://search.ch",
      isPublic: false,
    });
    const caller = createCaller(db, createSession(ownerId));

    await expect(caller.searchStations({ baseUrl, boardId, query: "Bern" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(mocks.searchStations).not.toHaveBeenCalled();
  });

  it("blocks an RFC 2765 IPv4-translated loopback address", async () => {
    const db = createDb();
    const { boardId, ownerId } = await createTimetableItemAsync(db, {
      baseUrl: "https://search.ch",
      isPublic: false,
    });
    const caller = createCaller(db, createSession(ownerId));

    await expect(
      caller.searchStations({ baseUrl: "http://[::ffff:0:7f00:1]:8080", boardId, query: "Bern" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.searchStations).not.toHaveBeenCalled();
  });

  it("blocks an unsaved public hostname that resolves to a private address", async () => {
    mocks.lookup.mockResolvedValueOnce([{ address: "10.0.0.8", family: 4 }]);
    const db = createDb();
    const { boardId, ownerId } = await createTimetableItemAsync(db, {
      baseUrl: "https://search.ch",
      isPublic: false,
    });
    const caller = createCaller(db, createSession(ownerId));

    await expect(
      caller.searchStations({ baseUrl: "https://timetable.example.com", boardId, query: "Bern" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.searchStations).not.toHaveBeenCalled();
  });

  it("allows the exact saved private endpoint when item and board IDs match", async () => {
    const db = createDb();
    const baseUrl = "http://timetable.internal:8080";
    const { boardId, itemId, ownerId } = await createTimetableItemAsync(db, { baseUrl, isPublic: false });

    await createCaller(db, createSession(ownerId)).searchStations({ baseUrl, boardId, itemId, query: "Bern" });

    expect(mocks.lookup).not.toHaveBeenCalled();
    expect(mocks.searchStations).toHaveBeenLastCalledWith(
      expect.objectContaining({ baseUrl, pinnedAddresses: undefined }),
    );
  });

  it("rejects an item ID that does not belong to the requested board", async () => {
    const db = createDb();
    const first = await createTimetableItemAsync(db, { baseUrl: "http://timetable.internal:8080", isPublic: false });
    const second = await createTimetableItemAsync(db, { baseUrl: "https://search.ch", isPublic: false });

    await expect(
      createCaller(db, createSession(second.ownerId)).searchStations({
        baseUrl: "http://timetable.internal:8080",
        boardId: second.boardId,
        itemId: first.itemId,
        query: "Bern",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.searchStations).not.toHaveBeenCalled();
  });

  it("blocks a changed private endpoint for an existing item", async () => {
    const db = createDb();
    const { boardId, itemId, ownerId } = await createTimetableItemAsync(db, {
      baseUrl: "http://timetable.internal:8080",
      isPublic: false,
    });

    await expect(
      createCaller(db, createSession(ownerId)).searchStations({
        baseUrl: "http://127.0.0.1:8080",
        boardId,
        itemId,
        query: "Bern",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.searchStations).not.toHaveBeenCalled();
  });

  it("allows a changed public endpoint for an existing item and pins its address", async () => {
    const db = createDb();
    const { boardId, itemId, ownerId } = await createTimetableItemAsync(db, {
      baseUrl: "http://timetable.internal:8080",
      isPublic: false,
    });
    const baseUrl = "https://timetable.example.com";

    await createCaller(db, createSession(ownerId)).searchStations({ baseUrl, boardId, itemId, query: "Bern" });

    expect(mocks.searchStations).toHaveBeenLastCalledWith(
      expect.objectContaining({ baseUrl, pinnedAddresses: [{ address: "8.8.8.8", family: 4 }] }),
    );
  });

  it("reports malformed saved widget options as server data corruption", async () => {
    const db = createDb();
    const { itemId } = await createTimetableItemAsync(db, { baseUrl: "https://search.ch" });
    await db.update(items).set({ options: "{" }).where(eq(items.id, itemId));

    await expect(
      createCaller(db, null).getTimetable({
        baseUrl: "https://search.ch",
        itemId,
        stationId: "station",
        limit: 10,
      }),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR", message: "Timetable widget configuration is invalid" });
  });

  it("reports an invalid saved timetable URL as server data corruption", async () => {
    const db = createDb();
    const { itemId } = await createTimetableItemAsync(db, {
      baseUrl: "https://search.ch?redirect=/admin",
    });

    await expect(
      createCaller(db, null).getTimetable({
        baseUrl: "https://search.ch",
        itemId,
        stationId: "station",
        limit: 10,
      }),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR", message: "Timetable widget configuration is invalid" });
  });

  it("does not treat public board view access as configuration access", async () => {
    const db = createDb();
    const baseUrl = "http://timetable.internal:8080";
    const { boardId, itemId } = await createTimetableItemAsync(db, { baseUrl });

    await expect(createCaller(db, null).searchStations({ baseUrl, boardId, query: "Bern" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(createCaller(db, null).searchStations({ baseUrl, itemId, query: "Bern" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
