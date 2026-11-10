import { describe, expect, test } from "vitest";

import { normalizeEntity } from "../src/homeassistant/homeassistant-normalize";

describe("normalizeEntity", () => {
  test("keeps display attributes and drops credentials, pictures and locations", () => {
    const entity = normalizeEntity(
      {
        entityId: "camera.front_door",
        state: "streaming",
        lastChanged: 1,
        lastUpdated: 2,
        attributes: {
          friendly_name: "Front door",
          icon: "mdi:cctv",
          access_token: "secret-camera-token",
          entity_picture: "/api/camera_proxy/camera.front_door?token=secret-camera-token",
          latitude: 48.85,
          longitude: 2.35,
          supported_features: 3,
        },
      },
      { areaId: "outside" },
    );

    expect(entity).toEqual({
      id: "camera.front_door",
      domain: "camera",
      name: "Front door",
      areaId: "outside",
      state: "streaming",
      icon: "mdi:cctv",
      deviceClass: null,
      stateClass: null,
      unit: null,
      lastChanged: 1,
      lastUpdated: 2,
      attributes: { supportedFeatures: 3 },
    });
    expect(JSON.stringify(entity)).not.toContain("secret-camera-token");
  });
});
