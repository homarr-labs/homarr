import { describe, expect, test } from "vitest";

import { partitionHealthMonitoringIntegrations } from "./integration-selection";

describe("partitionHealthMonitoringIntegrations", () => {
  test("preserves every Proxmox integration", () => {
    expect(
      partitionHealthMonitoringIntegrations([
        { id: "proxmox-a", kind: "proxmox" },
        { id: "proxmox-b", kind: "proxmox" },
        { id: "system", kind: "glances" },
      ]),
    ).toEqual({
      clusterIntegrationIds: ["proxmox-a", "proxmox-b"],
      systemIntegrationIds: ["system"],
    });
  });

  test("keeps mock integrations in both views", () => {
    expect(partitionHealthMonitoringIntegrations([{ id: "mock", kind: "mock" }])).toEqual({
      clusterIntegrationIds: ["mock"],
      systemIntegrationIds: ["mock"],
    });
  });
});
