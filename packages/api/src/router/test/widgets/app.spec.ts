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

const createApp = ({ url }: { url: string }) =>
  ({
    id: createId(),
    iconUrl: "",
    name: "Test App",
    href: url,
  }) satisfies InferInsertModel<typeof apps>;
