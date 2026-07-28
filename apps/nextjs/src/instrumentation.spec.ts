// @vitest-environment node

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const registerAsync = async (nodeEnv: string, nextRuntime: string) => {
  const tasksStarted = vi.fn();
  const websocketStarted = vi.fn();
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.stubEnv("NEXT_RUNTIME", nextRuntime);
  vi.doMock("@homarr/tasks", () => {
    tasksStarted();
    return {};
  });
  vi.doMock("@homarr/websocket", () => {
    websocketStarted();
    return {};
  });

  const { register } = await import("./instrumentation");
  await register();
  return { tasksStarted, websocketStarted };
};

describe("Next instrumentation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock("@homarr/tasks");
    vi.doUnmock("@homarr/websocket");
    vi.unstubAllEnvs();
  });

  test("embeds background services in the production Node runtime", async () => {
    const { tasksStarted, websocketStarted } = await registerAsync("production", "nodejs");

    expect(tasksStarted).toHaveBeenCalledOnce();
    expect(websocketStarted).toHaveBeenCalledOnce();
  });

  test("does not embed background services in the development server", async () => {
    const { tasksStarted, websocketStarted } = await registerAsync("development", "nodejs");

    expect(tasksStarted).not.toHaveBeenCalled();
    expect(websocketStarted).not.toHaveBeenCalled();
  });

  test("does not embed Node services in the edge runtime", async () => {
    const { tasksStarted, websocketStarted } = await registerAsync("production", "edge");

    expect(tasksStarted).not.toHaveBeenCalled();
    expect(websocketStarted).not.toHaveBeenCalled();
  });
});
