import { stringify } from "superjson";
import { describe, expect, it, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { boards, items, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { timetableRouter } from "../../widgets/timetable";

const mocks = vi.hoisted(() => ({ getTimetable: vi.fn(), searchStations: vi.fn() }));

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

  it("allows board modifiers to search an unsaved self-hosted endpoint", async () => {
    const db = createDb();
    const baseUrl = "http://timetable.internal:8080";
    const { boardId, ownerId } = await createTimetableItemAsync(db, { baseUrl: "https://search.ch", isPublic: false });
    const caller = createCaller(db, createSession(ownerId));

    await caller.searchStations({ baseUrl, boardId, query: "Bern" });
    expect(mocks.searchStations).toHaveBeenLastCalledWith(expect.objectContaining({ baseUrl }));
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
