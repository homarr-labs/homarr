import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { createDb } from "@homarr/db/test";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(async (_id: string): Promise<unknown> => undefined),
  list: vi.fn(async (_options: unknown): Promise<unknown> => undefined),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => mocks.logger,
}));

vi.mock("@homarr/workshop/backend", () => ({
  WorkshopBackend: class {
    public get(id: string) {
      return mocks.get(id);
    }

    public list(options: unknown) {
      return mocks.list(options);
    }
  },
}));

import { customWidgetRouter } from "../../custom-widget/custom-widget-router";

const session = {
  user: {
    id: createId(),
    permissions: ["admin"],
    colorScheme: "light",
  },
  expires: new Date(Date.now() + 60_000).toISOString(),
} satisfies Session;

const createCaller = () =>
  customWidgetRouter.createCaller({
    db: createDb(),
    deviceType: undefined,
    session,
  });

const createTokenizedFailure = (apiKey: string) => {
  const tokenizedUrl = `https://workshop.example/api/submissions?access_token=${apiKey}`;
  const error = new Error(`Workshop request failed for ${tokenizedUrl}`);
  error.name = `WorkshopTransportError:${tokenizedUrl}`;
  return error;
};

const expectSafeFailure = (
  error: unknown,
  apiKey: string,
  logMessage: string,
  event: "workshop_widget_lookup_failed" | "workshop_widget_search_failed",
) => {
  expect(error).toMatchObject({
    code: "BAD_GATEWAY",
    message: "Workshop is unavailable",
  });
  expect((error as Error).cause).toBeUndefined();
  expect(String(error)).not.toContain(apiKey);
  expect(String(error)).not.toContain("access_token");
  expect(mocks.logger.error).toHaveBeenCalledWith(logMessage, {
    event,
    errorName: "WorkshopBackendError",
  });
  expect(JSON.stringify(mocks.logger.error.mock.calls)).not.toContain(apiKey);
  expect(JSON.stringify(mocks.logger.error.mock.calls)).not.toContain("access_token");
};

describe("Workshop backend error privacy", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.list.mockReset();
    mocks.logger.error.mockClear();
  });

  test("redacts backend lookup failures from TRPC output and logs", async () => {
    const apiKey = "workshop-lookup-secret";
    mocks.get.mockRejectedValueOnce(createTokenizedFailure(apiKey));

    const error = await createCaller()
      .workshopGet({ submissionId: "submission-id" })
      .then(
        () => undefined,
        (cause: unknown) => cause,
      );

    expectSafeFailure(error, apiKey, "Workshop widget lookup failed", "workshop_widget_lookup_failed");
  });

  test("redacts backend search failures from TRPC output and logs", async () => {
    const apiKey = "workshop-search-secret";
    mocks.list.mockRejectedValueOnce(createTokenizedFailure(apiKey));

    const error = await createCaller()
      .workshopSearch({ query: "weather" })
      .then(
        () => undefined,
        (cause: unknown) => cause,
      );

    expectSafeFailure(error, apiKey, "Workshop widget search failed", "workshop_widget_search_failed");
  });
});
