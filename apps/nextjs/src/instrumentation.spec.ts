// @vitest-environment node

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const registerAsync = async (nodeEnv: string, nextRuntime: string) => {
  const loggerLoaded = vi.fn();
  const tasksStarted = vi.fn();
  const websocketStarted = vi.fn();
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.stubEnv("NEXT_RUNTIME", nextRuntime);
  vi.doMock("@homarr/core/infrastructure/logs", () => {
    loggerLoaded();
    return { createLogger: () => ({ error: vi.fn() }) };
  });
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
  return { loggerLoaded, tasksStarted, websocketStarted };
};

describe("Next instrumentation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock("@homarr/core/infrastructure/logs");
    vi.doUnmock("@homarr/tasks");
    vi.doUnmock("@homarr/websocket");
    vi.unstubAllEnvs();
  });

  test("embeds background services in the production Node runtime", async () => {
    const { loggerLoaded, tasksStarted, websocketStarted } = await registerAsync("production", "nodejs");

    expect(loggerLoaded).toHaveBeenCalledOnce();
    expect(tasksStarted).toHaveBeenCalledOnce();
    expect(websocketStarted).toHaveBeenCalledOnce();
  });

  test("does not embed background services in the development server", async () => {
    const { loggerLoaded, tasksStarted, websocketStarted } = await registerAsync("development", "nodejs");

    expect(loggerLoaded).not.toHaveBeenCalled();
    expect(tasksStarted).not.toHaveBeenCalled();
    expect(websocketStarted).not.toHaveBeenCalled();
  });

  test("does not embed Node services in the edge runtime", async () => {
    const { loggerLoaded, tasksStarted, websocketStarted } = await registerAsync("production", "edge");

    expect(loggerLoaded).not.toHaveBeenCalled();
    expect(tasksStarted).not.toHaveBeenCalled();
    expect(websocketStarted).not.toHaveBeenCalled();
  });

  test("isolates embedded service startup failures", async () => {
    const websocketStarted = vi.fn();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.doMock("@homarr/tasks", () => {
      throw new Error("task startup failed");
    });
    vi.doMock("@homarr/websocket", () => {
      websocketStarted();
      return {};
    });

    const { register } = await import("./instrumentation");

    await expect(register()).resolves.toBeUndefined();
    expect(websocketStarted).toHaveBeenCalledOnce();
  });
});
