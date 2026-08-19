// @vitest-environment jsdom

import { act, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { StreamSession } from "@homarr/integrations";

import {
  getMediaServerColumnVisibility,
  getResolutionLabel,
  getSeasonEpisodeParams,
  SessionDetailsPopover,
} from "./component";

vi.mock("@homarr/translation/client", () => ({
  useScopedI18n: () => (key: string) => key,
}));

const session = {
  sessionId: "session-1",
  sessionName: "Living room",
  user: { username: "Alex", profilePictureUrl: null },
  currentlyPlaying: {
    type: "movie",
    name: "Example movie",
    episodeName: null,
    seasonName: null,
    metadata: null,
  },
} as unknown as StreamSession;

function ControlledPopover({ children }: { children: ReactNode }) {
  const [opened, setOpened] = useState(false);
  return (
    <SessionDetailsPopover item={session} opened={opened} onChange={setOpened}>
      {children}
    </SessionDetailsPopover>
  );
}

describe("SessionDetailsPopover", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      media: "",
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
  });

  afterEach(async () => {
    await act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  test("opens and closes anchored session details from the target", async () => {
    await act(() =>
      root.render(
        <MantineProvider env="test">
          <ControlledPopover>Open session</ControlledPopover>
        </MantineProvider>,
      ),
    );

    const target = host.querySelector("button");
    expect(target?.getAttribute("aria-expanded")).toBe("false");

    await act(async () => {
      target?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(target?.getAttribute("aria-expanded")).toBe("true");
    expect(document.body.textContent).toContain("Example movie");

    await act(async () => {
      target?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(target?.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("getMediaServerColumnVisibility", () => {
  test("keeps a stable responsive column model from the zero-sized first render", () => {
    expect(getMediaServerColumnVisibility(0, false)).toEqual({ user: false, status: false });
    expect(getMediaServerColumnVisibility(300, false)).toEqual({ user: true, status: false });
    expect(getMediaServerColumnVisibility(420, false)).toEqual({ user: true, status: false });
    expect(getMediaServerColumnVisibility(540, false)).toEqual({ user: true, status: true });
    expect(getMediaServerColumnVisibility(0, true)).toEqual({ user: true, status: true });
  });
});

describe("getSeasonEpisodeParams", () => {
  test("zero-pads season and episode numbers", () => {
    expect(getSeasonEpisodeParams(4, 12)).toEqual({ season: "04", episode: "12" });
  });

  test("does not pad numbers already two digits or longer", () => {
    expect(getSeasonEpisodeParams(12, 104)).toEqual({ season: "12", episode: "104" });
  });

  test("returns null when either number is missing", () => {
    expect(getSeasonEpisodeParams(undefined, 12)).toBeNull();
    expect(getSeasonEpisodeParams(4, null)).toBeNull();
    expect(getSeasonEpisodeParams(null, undefined)).toBeNull();
  });
});

describe("getResolutionLabel", () => {
  test("labels a standard 16:9 resolution by its exact height", () => {
    expect(getResolutionLabel(1920, 1080)).toBe("1080p");
    expect(getResolutionLabel(1280, 720)).toBe("720p");
  });

  test("classifies a cinemascope source by its width, not its cropped height", () => {
    // A 1920x804 encode (2.35:1, cropped top and bottom) is still a 1080p source.
    expect(getResolutionLabel(1920, 804)).toBe("1080p");
    expect(getResolutionLabel(1280, 640)).toBe("720p");
  });

  test("rounds a near-standard resolution up to its nearest tier", () => {
    expect(getResolutionLabel(1912, 796)).toBe("1080p");
  });

  test("falls back to the raw height when it doesn't clear any known tier", () => {
    expect(getResolutionLabel(100, 100)).toBe("100p");
  });

  test("classifies a portrait video by its width, not its long-axis height", () => {
    // A 1080x1920 portrait phone recording is still a 1080p source, not a 1440p one.
    expect(getResolutionLabel(1080, 1920)).toBe("1080p");
    expect(getResolutionLabel(720, 1280)).toBe("720p");
  });
});
