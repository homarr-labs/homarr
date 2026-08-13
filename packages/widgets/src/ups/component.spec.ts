import { describe, expect, it } from "vitest";

import { getUpsDevices } from "./component";

describe("UPS source ownership", () => {
  it("uses integration-scoped keys for overlapping device ids", () => {
    const devices = getUpsDevices([
      {
        integrationId: "ups-a",
        integrationName: "UPS A",
        summaries: [{ id: "same", status: "online" as const }],
      },
      {
        integrationId: "ups-b",
        integrationName: "UPS B",
        summaries: [{ id: "same", status: "online" as const }],
      },
    ]);

    expect(devices.map(({ key, integrationName }) => ({ key, integrationName }))).toEqual([
      { key: "ups-a:same", integrationName: "UPS A" },
      { key: "ups-b:same", integrationName: "UPS B" },
    ]);
  });
});
