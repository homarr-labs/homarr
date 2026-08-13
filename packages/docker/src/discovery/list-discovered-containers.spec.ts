import { beforeEach, describe, expect, it, vi } from "vitest";

const listContainersA = vi.fn();
const listContainersB = vi.fn();

vi.mock("../singleton", () => ({
  DockerSingleton: {
    getInstances: () => [
      { host: "good", instance: { listContainers: listContainersA } },
      { host: "bad", instance: { listContainers: listContainersB } },
    ],
  },
}));

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({ warn: vi.fn() }),
}));

import { listDiscoveredContainersAsync } from "./list-discovered-containers";

describe("listDiscoveredContainersAsync", () => {
  beforeEach(() => {
    listContainersA.mockReset();
    listContainersB.mockReset();
  });

  it("preserves successful hosts when another Docker host fails", async () => {
    listContainersA.mockResolvedValue([
      {
        Id: "sonarr",
        Labels: {
          "homarr.name": "Sonarr",
          "homarr.group": "Media",
          "homarr.href": "http://sonarr:8989",
        },
      },
    ]);
    listContainersB.mockRejectedValue(new Error("permission denied"));

    const result = await listDiscoveredContainersAsync();

    expect(result.services).toHaveLength(1);
    expect(result.hosts).toEqual([
      expect.objectContaining({ host: "good", status: "success" }),
      {
        host: "bad",
        status: "unavailable",
        reason: "permission denied",
        containers: [],
        services: [],
      },
    ]);
  });

  it("times out a blackholed host without losing another host's result", async () => {
    vi.useFakeTimers();
    try {
      listContainersA.mockResolvedValue([
        {
          Id: "sonarr",
          Labels: {
            "homarr.name": "Sonarr",
            "homarr.group": "Media",
            "homarr.href": "http://sonarr:8989",
          },
        },
      ]);
      listContainersB.mockReturnValue(new Promise(() => undefined));

      const resultPromise = listDiscoveredContainersAsync({}, 25);
      await vi.advanceTimersByTimeAsync(25);
      const result = await resultPromise;

      expect(result.services).toHaveLength(1);
      expect(result.hosts).toEqual([
        expect.objectContaining({ host: "good", status: "success" }),
        expect.objectContaining({ host: "bad", status: "unavailable", reason: "Docker discovery timed out for bad" }),
      ]);
    } finally {
      vi.useRealTimers();
    }
  });
});
