// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { WidgetComponentProps } from "../definition";
import ImmichServerStatsWidget from "./server-stats/component";
import { definition as albumCarouselDefinition } from "./album-carousel";

const mocks = vi.hoisted(() => ({
  getAlbums: vi.fn(() => ({ data: [], isPending: false, isError: false })),
}));

vi.mock("@trpc/react-query", () => ({
  getQueryKey: (procedure: { path: string[] }, input: unknown) => [procedure.path, { input, type: "query" }],
}));

vi.mock("@homarr/api/client", () => ({
  clientApi: {
    widget: {
      immich: {
        getAlbums: { path: ["widget", "immich", "getAlbums"], useQuery: mocks.getAlbums },
        getServerStats: {
          path: ["widget", "immich", "getServerStats"],
          useQuery: () => ({ data: undefined }),
        },
      },
    },
  },
}));

vi.mock("@homarr/translation/client", () => ({
  useCurrentIntlLocale: () => "en",
  useI18n: () => (key: string) => key,
}));

describe("Immich album queries", () => {
  let host: HTMLDivElement | undefined;
  let root: ReturnType<typeof createRoot> | undefined;

  beforeEach(() => vi.clearAllMocks());

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    host?.remove();
    vi.unstubAllGlobals();
  });

  test("server stats requests a bounded album response", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);

    await act(async () =>
      root?.render(
        createElement(
          MantineProvider,
          null,
          createElement(ImmichServerStatsWidget, {
            integrationIds: ["immich-id"],
            options: { showUsers: true, showPhotos: true, showVideos: true, showStorage: true },
            displayMode: "advanced",
            width: 800,
            height: 600,
            isEditMode: false,
            boardId: "board-id",
            itemId: "item-id",
            setOptions: vi.fn(),
          } satisfies WidgetComponentProps<"immich-serverStats">),
        ),
      ),
    );

    expect(mocks.getAlbums).toHaveBeenCalledWith(
      { integrationId: "immich-id", limit: 50 },
      expect.objectContaining({ enabled: true }),
    );
  });

  test("album carousel keeps requesting every album for its selector", () => {
    const options = albumCarouselDefinition.createOptions();

    options.albumId.useOptions(["immich-id"]);

    expect(mocks.getAlbums).toHaveBeenCalledWith(
      { integrationId: "immich-id" },
      expect.objectContaining({ enabled: true }),
    );
  });
});
