import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import type { LoggerMessage } from "@homarr/redis";

import { logRouter } from "../log";

const mocks = vi.hoisted(() => ({
  getRecentAsync: vi.fn(),
  subscribeAsync: vi.fn(),
}));

vi.mock("@homarr/redis", () => ({
  loggingChannel: {
    getRecentAsync: mocks.getRecentAsync,
    subscribeAsync: mocks.subscribeAsync,
  },
}));

const session = {
  user: {
    id: "log-viewer",
    permissions: ["other-view-logs"],
    colorScheme: "light",
  },
  expires: new Date(0).toISOString(),
} satisfies Session;

const createMessage = (id: string, timestamp: number): LoggerMessage => ({
  id,
  timestamp: new Date(timestamp),
  level: "info",
  message: id,
});

describe("log.subscribe", () => {
  test("emits history before buffered live messages without duplicates", async () => {
    const historyDeferred = Promise.withResolvers<LoggerMessage[]>();
    let onMessage: ((message: LoggerMessage) => void) | undefined;
    const unsubscribe = vi.fn();

    mocks.subscribeAsync.mockImplementation(async (callback: (message: LoggerMessage) => void) => {
      onMessage = callback;
      return unsubscribe;
    });
    mocks.getRecentAsync.mockReturnValue(historyDeferred.promise);

    const caller = logRouter.createCaller({
      db: null as never,
      deviceType: undefined,
      session,
    });
    const subscription = await caller.subscribe({ levels: ["info"] });
    const events: object[] = [];
    const observer = subscription.subscribe({
      next(event) {
        events.push(event);
      },
    });

    await vi.waitFor(() => expect(mocks.getRecentAsync).toHaveBeenCalledOnce());

    const retainedMessage = createMessage("retained", 1);
    const liveMessage = createMessage("live", 2);
    onMessage?.(retainedMessage);
    onMessage?.(liveMessage);
    historyDeferred.resolve([retainedMessage]);

    await vi.waitFor(() =>
      expect(events).toEqual([
        { type: "history", messages: [retainedMessage] },
        { type: "message", message: liveMessage },
      ]),
    );

    observer.unsubscribe();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
