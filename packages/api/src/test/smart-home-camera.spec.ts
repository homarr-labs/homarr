import { describe, expect, test } from "vitest";

import { integrations } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { smartHomeCameraRouter } from "../smart-home-camera";

describe("Home Assistant live camera access", () => {
  test("refuses a private integration before opening its stream", async () => {
    const db = createDb();
    await db
      .insert(integrations)
      .values({ id: "private-camera", name: "Private cameras", kind: "homeAssistant", url: "http://127.0.0.1:1" });
    const caller = smartHomeCameraRouter.createCaller({ db, session: null, deviceType: undefined });

    await expect(caller.open({ integrationId: "private-camera", entityId: "camera.front_door" })).rejects.toMatchObject(
      { code: "FORBIDDEN" },
    );
  });

  test("rejects non-camera IDs and path injection even for an authorized user", async () => {
    const db = createDb();
    await db
      .insert(integrations)
      .values({ id: "cameras", name: "Cameras", kind: "homeAssistant", url: "http://127.0.0.1:1" });
    const caller = smartHomeCameraRouter.createCaller({
      db,
      deviceType: undefined,
      session: {
        user: { id: "viewer", permissions: ["integration-use-all"], colorScheme: "dark" },
        expires: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    for (const entityId of ["sensor.temperature", "camera.front_door/../../config", "camera.front_door?token=other"]) {
      await expect(caller.open({ integrationId: "cameras", entityId })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
  });
});
