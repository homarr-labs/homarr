import { describe, expect, test } from "vitest";

import { supportsSmartHomeAction } from "../src/interfaces/smart-home/smart-home-capabilities";
import { SmartHomeMockService } from "../src/mock/data/smart-home";
import { applySmartHomeAction } from "../src/interfaces/smart-home/smart-home-optimistic";

describe("Home Assistant TV controls", () => {
  test("only offers power actions advertised by the TV", () => {
    const television = { domain: "media_player", state: "off", attributes: { supportedFeatures: 128 } };

    expect(supportsSmartHomeAction(television, { type: "turnOn" })).toBe(true);
    expect(supportsSmartHomeAction(television, { type: "turnOff" })).toBe(false);
    expect(supportsSmartHomeAction({ ...television, attributes: {} }, { type: "turnOn" })).toBe(false);
  });

  test("selecting a TV input is reflected in the next snapshot", async () => {
    const integration = new SmartHomeMockService();
    await integration.executeActionAsync("media_player.living_room_tv", { type: "selectSource", value: "HDMI 1" });

    const snapshot = await integration.getSnapshotAsync({ entityIds: ["media_player.living_room_tv"] });
    expect(snapshot.entities[0]?.attributes.mediaSource).toBe("HDMI 1");
  });

  test("turning a TV on does not claim that playback has started", async () => {
    const integration = new SmartHomeMockService();
    const snapshot = await integration.getSnapshotAsync({ entityIds: ["media_player.living_room_tv"] });
    const television = snapshot.entities[0];
    if (!television) throw new Error("The TV is missing from the snapshot");
    expect(applySmartHomeAction({ ...television, state: "off" }, { type: "turnOn" }).state).toBe("idle");
  });
});
