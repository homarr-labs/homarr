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
    return { startupPromise: Promise.resolve() };
  });
  vi.doMock("@homarr/websocket", () => {
    websocketStarted();
    return { startupPromise: Promise.resolve() };
  });

  const { register } = await import("./instrumentation");
  await register();
  if (nodeEnv === "production" && nextRuntime === "nodejs") {
    await vi.waitFor(() => {
      expect(tasksStarted).toHaveBeenCalledOnce();
      expect(websocketStarted).toHaveBeenCalledOnce();
    });
  }
  return { loggerLoaded, tasksStarted, websocketStarted };
};

describe("Next instrumentation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  test("does not block Next readiness on slow cron run-on-start hooks", async () => {
    const neverFinishes = new Promise<void>(() => undefined);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.doMock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => ({ error: vi.fn() }) }));
    vi.doMock("@homarr/tasks", () => ({ startupPromise: neverFinishes }));
    vi.doMock("@homarr/websocket", () => ({ startupPromise: Promise.resolve() }));

    const { register } = await import("./instrumentation");

    await expect(register()).resolves.toBeUndefined();
  });

  test("terminates a ready Node process when cron startup later fails", async () => {
    const websocketStarted = vi.fn();
    const errorLogged = vi.fn();
    let rejectTasks!: (error: Error) => void;
    const exit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.doMock("@homarr/core/infrastructure/logs", () => ({
      createLogger: () => ({ error: errorLogged }),
    }));
    vi.doMock("@homarr/tasks", () => ({
      startupPromise: new Promise<void>((_resolve, reject) => {
        rejectTasks = reject;
      }),
    }));
    vi.doMock("@homarr/websocket", () => {
      websocketStarted();
      return { startupPromise: Promise.resolve() };
    });

    const { register } = await import("./instrumentation");

    await expect(register()).resolves.toBeUndefined();
    rejectTasks(new Error("task startup failed"));
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
    expect(websocketStarted).toHaveBeenCalledOnce();
    expect(errorLogged).toHaveBeenCalledOnce();
  });

  test("fails readiness when the embedded WebSocket listener cannot start", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.doMock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => ({ error: vi.fn() }) }));
    vi.doMock("@homarr/tasks", () => ({ startupPromise: Promise.resolve() }));
    vi.doMock("@homarr/websocket", () => ({ startupPromise: Promise.reject(new Error("port unavailable")) }));

    const { register } = await import("./instrumentation");

    await expect(register()).rejects.toThrow("Failed to start embedded websocket service");
  });
});
