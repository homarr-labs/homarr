import { describe, expect, it } from "vitest";

import { toSafeEntityDetails } from "./smart-home-entity-state";

describe("toSafeEntityDetails", () => {
  it("keeps display attributes and removes sensitive Home Assistant metadata", () => {
    const details = toSafeEntityDetails({
      entity_id: "camera.front_door",
      state: "streaming",
      last_changed: new Date("2026-01-01T00:00:00Z"),
      last_updated: new Date("2026-01-01T00:00:01Z"),
      attributes: {
        friendly_name: "Front door",
        icon: "mdi:camera",
        access_token: "secret-camera-token",
        latitude: 48.85,
      },
    });

    expect(details.attributes).toEqual({ friendly_name: "Front door", icon: "mdi:camera" });
    expect(details.attributes).not.toHaveProperty("access_token");
    expect(details.attributes).not.toHaveProperty("latitude");
  });
});
