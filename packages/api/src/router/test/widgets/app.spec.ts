import { TRPCError } from "@trpc/server";
import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import type { InferInsertModel } from "@homarr/db";
import { apps } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import * as ping from "@homarr/ping";

import { appRouter } from "../../widgets/app";

// Mock the auth module to return an empty session
vi.mock("@homarr/auth", () => ({ auth: () => ({}) as Session }));
vi.mock("@homarr/ping", () => ({ sendPingRequestAsync: async () => await Promise.resolve(null) }));
vi.mock("../../app/app-access-control", () => ({
  AppAccessControl: vi.fn(
    class {
      canUserSeeAppAsync = async (_: string) => await Promise.resolve(true);
      canUserSeeAppsAsync = async (_: string[]) => await Promise.resolve(true);
    },
  ),
}));

describe("ping should call sendPingRequestAsync with url and return result", () => {
  test("ping with error response should return error and url", async () => {
    // Arrange
    vi.spyOn(ping, "sendPingRequestAsync").mockImplementation(() => Promise.resolve({ error: "error" }));
    const url = "http://localhost";
    const db = createDb();
    const app = createApp({ url });
    await db.insert(apps).values(app);
    const caller = appRouter.createCaller({
      db,
      deviceType: undefined,
      session: null,
    });

    // Act
    const result = await caller.ping({ id: app.id });

    // Assert
    expect(result.url).toBe(url);
    expect("error" in result).toBe(true);
  });

  test("ping with success response should return statusCode and url", async () => {
    // Arrange
    vi.spyOn(ping, "sendPingRequestAsync").mockImplementation(() =>
      Promise.resolve({ statusCode: 200, durationMs: 123 }),
    );
    const url = "http://localhost";
    const db = createDb();
    const app = createApp({ url });
    await db.insert(apps).values(app);
    const caller = appRouter.createCaller({
      db,
      deviceType: undefined,
      session: null,
    });

    // Act
    const result = await caller.ping({ id: app.id });

    // Assert
    expect(result.url).toBe(url);
    expect("statusCode" in result).toBe(true);
  });
});

const createApp = ({ url, pingUrl }: { url: string | null; pingUrl?: string | null }) =>
  ({
    id: createId(),
    iconUrl: "",
    name: "Test App",
    href: url,
    pingUrl: pingUrl ?? null,
  }) satisfies InferInsertModel<typeof apps>;

describe("ping resolution under path-only hrefs", () => {
  test("path-only href without pingUrl throws CONFLICT (no server-side host synthesis)", async () => {
    const sendSpy = vi.spyOn(ping, "sendPingRequestAsync");
    const db = createDb();
    const app = createApp({ url: "/cockpit/" });
    await db.insert(apps).values(app);
    const caller = appRouter.createCaller({ db, deviceType: undefined, session: null });

    await expect(caller.ping({ id: app.id })).rejects.toThrow(TRPCError);
    await expect(caller.ping({ id: app.id })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(sendSpy).not.toHaveBeenCalled();
  });

  test("path-only href with explicit pingUrl uses pingUrl", async () => {
    const expectedUrl = "https://host.docker.internal/cockpit/";
    vi.spyOn(ping, "sendPingRequestAsync").mockResolvedValueOnce({ statusCode: 204, durationMs: 7 });
    const db = createDb();
    const app = createApp({ url: "/cockpit/", pingUrl: expectedUrl });
    await db.insert(apps).values(app);
    const caller = appRouter.createCaller({ db, deviceType: undefined, session: null });

    const result = await caller.ping({ id: app.id });

    expect(result.url).toBe(expectedUrl);
  });

  test("absolute href without pingUrl pings the href", async () => {
    const expectedUrl = "https://docs.halos.fi";
    vi.spyOn(ping, "sendPingRequestAsync").mockResolvedValueOnce({ statusCode: 200, durationMs: 11 });
    const db = createDb();
    const app = createApp({ url: expectedUrl });
    await db.insert(apps).values(app);
    const caller = appRouter.createCaller({ db, deviceType: undefined, session: null });

    const result = await caller.ping({ id: app.id });

    expect(result.url).toBe(expectedUrl);
  });
});
