// @vitest-environment node

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const backendModules = ["@homarr/core/infrastructure/logs", "@homarr/tasks", "@homarr/websocket", "@homarr/db"];

describe("Next instrumentation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    for (const module of backendModules) vi.doUnmock(module);
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test.each([
    ["production", "nodejs"],
    ["development", "nodejs"],
    ["production", "edge"],
  ])("does not load backend services in the %s %s frontend", async (nodeEnv, nextRuntime) => {
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.stubEnv("NEXT_RUNTIME", nextRuntime);
    const backendLoaded = vi.fn();
    for (const module of backendModules) {
      vi.doMock(module, () => {
        backendLoaded(module);
        throw new Error("Backend services are unavailable to the frontend process");
      });
    }
    const exit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const { register } = await import("./instrumentation");

    await register();

    expect(backendLoaded).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });
});
