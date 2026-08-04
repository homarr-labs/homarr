// @vitest-environment node

import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { integrations, integrationUserPermissions, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { calendarRouter } from "../../widgets/calendar";

const { getDataAsync, handler } = vi.hoisted(() => {
  const getDataAsync = vi.fn();
  return { getDataAsync, handler: vi.fn(() => ({ getDataAsync })) };
});

vi.mock("@homarr/request-handler/calendar", () => ({
  calendarMonthRequestHandler: { handler },
}));

const createCallerAsync = async () => {
  const db = createDb();
  const userId = createId();
  const integrationId = createId();
  await db.insert(users).values({ id: userId });
  await db.insert(integrations).values({
    id: integrationId,
    kind: "radarr",
    name: "Radarr",
    url: "https://radarr.example.com",
  });
  await db.insert(integrationUserPermissions).values({ integrationId, userId, permission: "use" });
  const session = {
    user: { id: userId, permissions: [], colorScheme: "light" },
    expires: new Date().toISOString(),
  } satisfies Session;
  return { caller: calendarRouter.createCaller({ db, deviceType: undefined, session }), integrationId };
};

const createEvent = (title: string, releaseType?: "digitalRelease" | "physicalRelease") => ({
  title,
  subTitle: null,
  description: null,
  startDate: new Date("2025-05-10T12:00:00.000Z"),
  endDate: null,
  image: null,
  location: null,
  indicatorColor: "blue",
  links: [],
  ...(releaseType ? { metadata: { type: "radarr" as const, releaseType } } : {}),
});

describe("calendarRouter.findAllEvents", () => {
  test("uses human month numbers and filters Radarr release types", async () => {
    const { caller, integrationId } = await createCallerAsync();
    getDataAsync.mockResolvedValueOnce({
      data: [
        createEvent("Digital", "digitalRelease"),
        createEvent("Physical", "physicalRelease"),
        createEvent("Sonarr episode"),
      ],
      timestamp: new Date(),
    });

    const result = await caller.findAllEvents({
      integrationIds: [integrationId],
      year: 2025,
      month: 5,
      releaseType: ["digitalRelease"],
      showUnmonitored: true,
    });

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: integrationId }), {
      year: 2025,
      month: 5,
      releaseType: ["digitalRelease"],
      showUnmonitored: true,
    });
    expect(result[0]?.events.map((event) => event.title)).toEqual(["Digital", "Sonarr episode"]);
  });

  test("rejects zero-based and out-of-range months", async () => {
    const { caller } = await createCallerAsync();
    await expect(
      caller.findAllEvents({
        integrationIds: [],
        year: 2025,
        month: 0,
        releaseType: [],
        showUnmonitored: true,
      }),
    ).rejects.toThrow();
  });

  test("returns an integration-scoped error instead of silently dropping a failed calendar", async () => {
    const { caller, integrationId } = await createCallerAsync();
    getDataAsync.mockRejectedValueOnce(new Error("remote calendar unavailable"));

    await expect(
      caller.findAllEvents({
        integrationIds: [integrationId],
        year: 2025,
        month: 5,
        releaseType: ["inCinemas", "digitalRelease", "physicalRelease"],
        showUnmonitored: true,
      }),
    ).resolves.toEqual([
      {
        events: [],
        integration: { id: integrationId, name: "Radarr", kind: "radarr" },
        error: "Calendar events could not be loaded from this integration.",
      },
    ]);
  });
});
