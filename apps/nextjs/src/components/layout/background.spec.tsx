import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { BoardBackgroundVideo, useOptionalBackgroundProps } from "./background";

const board = vi.hoisted(() => ({
  current: {
    backgroundImageUrl: null as string | null,
    backgroundImageSize: "cover",
    backgroundImageRepeat: "no-repeat",
    backgroundImageAttachment: "fixed",
  },
}));

const pathname = vi.hoisted(() => ({ current: "/boards/home" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

vi.mock("@homarr/boards/context", () => ({
  useOptionalBoard: () => board.current,
}));

vi.mock("@mantine/hooks", () => ({
  useReducedMotion: () => false,
}));

const BackgroundProbe = () => {
  const props = useOptionalBackgroundProps();
  return createElement(
    "div",
    {
      "data-bg": props.bg ?? "",
      "data-size": props.bgsz ?? "",
      "data-attachment": props.bga ?? "",
    },
    createElement(BoardBackgroundVideo),
  );
};

const headResponse = (contentType: string, status = 200) =>
  new Response(null, { status, headers: { "content-type": contentType } });

describe("board background", () => {
  let container: HTMLDivElement;
  let root: Root;
  let resolveHead: (response: Response) => void;
  let rejectHead: (error: unknown) => void;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    board.current = {
      backgroundImageUrl: "/api/user-medias/background",
      backgroundImageSize: "cover",
      backgroundImageRepeat: "no-repeat",
      backgroundImageAttachment: "fixed",
    };
    pathname.current = "/boards/home";
    resolveHead = () => {};
    rejectHead = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve, reject) => {
            resolveHead = resolve;
            rejectHead = reject;
          }),
      ),
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  const renderBackground = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    act(() => {
      root.render(createElement(QueryClientProvider, { client: queryClient }, createElement(BackgroundProbe)));
    });
  };

  const backgroundUrl = () => container.querySelector("[data-bg]")?.getAttribute("data-bg");
  const video = () => container.querySelector("video");

  test("paints an extensionless image before the content-type probe resolves", async () => {
    renderBackground();

    expect(backgroundUrl()).toBe("url(/api/user-medias/background)");
    expect(container.querySelector("[data-size]")?.getAttribute("data-size")).toBe("cover");
    expect(container.querySelector("[data-attachment]")?.getAttribute("data-attachment")).toBe("fixed");
    expect(video()).toBeNull();
    expect(fetch).toHaveBeenCalledWith("/api/user-medias/background", expect.objectContaining({ method: "HEAD" }));

    await act(async () => {
      resolveHead(headResponse("image/jpeg"));
    });

    expect(backgroundUrl()).toBe("url(/api/user-medias/background)");
    expect(video()).toBeNull();
  });

  test("swaps an extensionless upload to video only after HEAD reports video/*", async () => {
    board.current.backgroundImageUrl = "/api/user-medias/clip";
    renderBackground();

    expect(backgroundUrl()).toBe("url(/api/user-medias/clip)");
    expect(video()).toBeNull();

    await act(async () => {
      resolveHead(headResponse("video/webm; charset=binary"));
    });

    await vi.waitFor(() => {
      expect(backgroundUrl()).toBe("");
      expect(video()?.getAttribute("src")).toBe("/api/user-medias/clip");
      expect(video()?.muted).toBe(true);
      expect(video()?.loop).toBe(true);
    });
  });

  test.each(["mp4", "webm", "ogg"])("renders a .%s background as video without waiting for HEAD", async (format) => {
    board.current.backgroundImageUrl = `https://cdn.example/background.${format}?token=1`;
    renderBackground();
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(backgroundUrl()).toBe("");
    expect(video()?.getAttribute("src")).toBe(`https://cdn.example/background.${format}?token=1`);
  });

  test("keeps the image background when the probe fails", async () => {
    renderBackground();

    await act(async () => {
      rejectHead(new Error("network down"));
    });

    expect(backgroundUrl()).toBe("url(/api/user-medias/background)");
    expect(video()).toBeNull();
  });

  test("does not apply the shell background outside the board page", () => {
    pathname.current = "/boards/home/settings";
    renderBackground();

    expect(backgroundUrl()).toBe("");
    expect(video()).toBeNull();
  });
});
