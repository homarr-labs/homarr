import { beforeEach, describe, expect, test, vi } from "vitest";

import { auth } from "@homarr/auth/next";
import { getIntegrationsWithPermissionsAsync } from "@homarr/auth/server";
import type { WidgetKind } from "@homarr/definitions";
import { prefetchForKindAsync } from "@homarr/widgets/prefetch";

import { createBoardContentPage } from "./_creator";

const { mockLoggerError } = vi.hoisted(() => ({
  mockLoggerError: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    cache: (callback: unknown) => callback,
  };
});

vi.mock("~/styles/gridstack.scss", () => ({}));

vi.mock("@tanstack/react-query", () => ({
  dehydrate: vi.fn(() => ({})),
  HydrationBoundary: vi.fn(({ children }: { children: unknown }) => children),
}));

vi.mock("@homarr/api/server", () => ({
  getQueryClient: vi.fn(() => ({})),
}));

vi.mock("@homarr/auth/client", () => ({
  IntegrationProvider: vi.fn(({ children }: { children: unknown }) => children),
}));

vi.mock("@homarr/auth/next", () => ({
  auth: vi.fn(),
}));

vi.mock("@homarr/auth/server", () => ({
  getIntegrationsWithPermissionsAsync: vi.fn(),
}));

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({ error: mockLoggerError, debug: vi.fn(), warn: vi.fn() }),
}));

vi.mock("@homarr/core/infrastructure/logs/error", () => ({
  ErrorWithMetadata: class ErrorWithMetadata extends Error {
    constructor(
      message: string,
      public metadata: unknown,
      options?: ErrorOptions,
    ) {
      super(message, options);
    }
  },
}));

vi.mock("@homarr/widgets/prefetch", () => ({
  prefetchForKindAsync: vi.fn(),
}));

vi.mock("@homarr/translation/server", () => ({
  getI18n: vi.fn(() => () => "translated"),
}));

vi.mock("@homarr/common", () => ({
  isNullOrWhitespace: vi.fn(() => true),
}));

vi.mock("~/metadata", () => ({
  createMetaTitle: vi.fn((name: string) => name),
}));

vi.mock("../_layout-creator", () => ({
  createBoardLayout: vi.fn(),
}));

vi.mock("./_dynamic-client", () => ({
  DynamicClientBoard: vi.fn(() => null),
}));

vi.mock("./_header-actions", () => ({
  BoardContentHeaderActions: vi.fn(() => null),
}));

interface Item {
  kind: WidgetKind;
  options: Record<string, unknown>;
  integrationIds: string[];
  layouts: never[];
}

const makeItem = (kind: WidgetKind): Item => ({
  kind,
  options: {},
  integrationIds: [],
  layouts: [] as never[],
});

const makeBoard = (items: Item[] = []) => ({
  id: "board-1",
  name: "Test Board",
  metaTitle: null,
  faviconImageUrl: null,
  items,
  sections: [],
  layouts: [],
});

const mockSession = { user: { id: "user-1" }, expires: "" };
const mockIntegrations = [{ id: "int-1", name: "Test", kind: "adGuardHome", url: "http://localhost", permissions: [] }];

describe("createBoardContentPage", () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getIntegrationsWithPermissionsAsync).mockResolvedValue(mockIntegrations as never);
    vi.mocked(prefetchForKindAsync).mockResolvedValue(undefined);
  });

  describe("page", () => {
    test("calls getInitialBoard and auth concurrently", async () => {
      const callOrder: string[] = [];

      const getInitialBoard = vi.fn(
        () =>
          new Promise((resolve) => {
            callOrder.push("board-start");
            setTimeout(() => {
              callOrder.push("board-end");
              resolve(makeBoard());
            }, 10);
          }),
      );

      vi.mocked(auth).mockImplementation(
        (() =>
          new Promise((resolve) => {
            callOrder.push("auth-start");
            setTimeout(() => {
              callOrder.push("auth-end");
              resolve(mockSession);
            }, 10);
          })) as never,
      );

      const { page } = createBoardContentPage({ getInitialBoardAsync: getInitialBoard as never });
      await page({ params: Promise.resolve({}) });

      expect(callOrder.indexOf("board-start")).toBeLessThan(callOrder.indexOf("auth-end"));
      expect(callOrder.indexOf("auth-start")).toBeLessThan(callOrder.indexOf("board-end"));
    });

    test("passes session from auth to getIntegrationsWithPermissionsAsync", async () => {
      const getInitialBoard = vi.fn().mockResolvedValue(makeBoard());

      const { page } = createBoardContentPage({ getInitialBoardAsync: getInitialBoard as never });
      await page({ params: Promise.resolve({}) });

      expect(getIntegrationsWithPermissionsAsync).toHaveBeenCalledWith(mockSession);
    });

    test("runs prefetches in parallel with getIntegrationsWithPermissionsAsync", async () => {
      const callOrder: string[] = [];

      const items = [makeItem("clock"), makeItem("weather"), makeItem("clock")];
      const getInitialBoard = vi.fn().mockResolvedValue(makeBoard(items));

      vi.mocked(getIntegrationsWithPermissionsAsync).mockImplementation(
        () =>
          new Promise((resolve) => {
            callOrder.push("integrations-start");
            setTimeout(() => {
              callOrder.push("integrations-end");
              resolve(mockIntegrations as never);
            }, 10);
          }),
      );

      vi.mocked(prefetchForKindAsync).mockImplementation(
        (kind) =>
          new Promise((resolve) => {
            callOrder.push(`prefetch-${kind}-start`);
            setTimeout(() => {
              callOrder.push(`prefetch-${kind}-end`);
              resolve(undefined);
            }, 10);
          }),
      );

      const { page } = createBoardContentPage({ getInitialBoardAsync: getInitialBoard as never });
      await page({ params: Promise.resolve({}) });

      expect(callOrder.indexOf("integrations-start")).toBeLessThan(callOrder.indexOf("prefetch-clock-end"));
      expect(callOrder.indexOf("prefetch-clock-start")).toBeLessThan(callOrder.indexOf("integrations-end"));
      expect(callOrder.indexOf("prefetch-weather-start")).toBeLessThan(callOrder.indexOf("integrations-end"));
    });

    test("groups items by widget kind before prefetching", async () => {
      const items = [makeItem("clock"), makeItem("weather"), makeItem("clock")];
      const getInitialBoard = vi.fn().mockResolvedValue(makeBoard(items));

      const { page } = createBoardContentPage({ getInitialBoardAsync: getInitialBoard as never });
      await page({ params: Promise.resolve({}) });

      expect(prefetchForKindAsync).toHaveBeenCalledTimes(2);
      expect(prefetchForKindAsync).toHaveBeenCalledWith("clock", expect.anything(), [items[0], items[2]]);
      expect(prefetchForKindAsync).toHaveBeenCalledWith("weather", expect.anything(), [items[1]]);
    });

    test("catches prefetch failure without breaking other prefetches", async () => {
      const prefetchError = new Error("prefetch failed");
      const items = [makeItem("clock"), makeItem("weather")];
      const getInitialBoard = vi.fn().mockResolvedValue(makeBoard(items));

      vi.mocked(prefetchForKindAsync).mockImplementation((kind) => {
        if (kind === "clock") {
          return Promise.reject(prefetchError);
        }
        return Promise.resolve(undefined);
      });

      const { page } = createBoardContentPage({ getInitialBoardAsync: getInitialBoard as never });
      await expect(page({ params: Promise.resolve({}) })).resolves.not.toThrow();

      expect(prefetchForKindAsync).toHaveBeenCalledTimes(2);
    });

    test("logs error with metadata when prefetch fails", async () => {
      const prefetchError = new Error("prefetch failed");
      const items = [makeItem("clock")];
      const getInitialBoard = vi.fn().mockResolvedValue(makeBoard(items));

      vi.mocked(prefetchForKindAsync).mockRejectedValue(prefetchError);

      const { page } = createBoardContentPage({ getInitialBoardAsync: getInitialBoard as never });
      await page({ params: Promise.resolve({}) });

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Failed to prefetch widget",
          metadata: { widgetKind: "clock", itemCount: 1 },
        }),
      );
    });

    test("returns integrations even when all prefetches fail", async () => {
      const items = [makeItem("clock"), makeItem("weather")];
      const getInitialBoard = vi.fn().mockResolvedValue(makeBoard(items));

      vi.mocked(prefetchForKindAsync).mockRejectedValue(new Error("fail"));

      const { page } = createBoardContentPage({ getInitialBoardAsync: getInitialBoard as never });
      const result = await page({ params: Promise.resolve({}) });

      expect(getIntegrationsWithPermissionsAsync).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test("works with no items on the board", async () => {
      const getInitialBoard = vi.fn().mockResolvedValue(makeBoard([]));

      const { page } = createBoardContentPage({ getInitialBoardAsync: getInitialBoard as never });
      await expect(page({ params: Promise.resolve({}) })).resolves.not.toThrow();

      expect(prefetchForKindAsync).not.toHaveBeenCalled();
      expect(getIntegrationsWithPermissionsAsync).toHaveBeenCalled();
    });
  });
});
