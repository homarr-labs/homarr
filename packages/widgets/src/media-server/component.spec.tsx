// @vitest-environment jsdom

import { act, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { StreamSession } from "@homarr/integrations";

import {
  formatChannelLayout,
  formatCodec,
  formatFrameRate,
  formatPlaybackTime,
  getMediaServerColumnVisibility,
  getResolutionLabel,
  getSeasonEpisodeParams,
  SessionDetailsPopover,
} from "./component";

vi.mock("@homarr/translation/client", () => ({
  useI18n: () => (key: string) => key,
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

  test("shows the stream stats and never prints a null codec", async () => {
    const transcodingSession = {
      sessionId: "session-2",
      sessionName: "Plezy (SHIELD)",
      user: { username: "Alex", profilePictureUrl: null },
      currentlyPlaying: {
        type: "tv",
        name: "Example show",
        episodeName: "Pilot",
        seasonName: "Season 1",
        seasonNumber: 1,
        episodeNumber: 2,
        playback: { state: "playing", positionMs: 600_000, durationMs: 2_400_000 },
        location: "wan",
        metadata: {
          video: { resolution: { width: 1920, height: 1080 }, frameRate: 23.976023 },
          audio: { channelCount: 6, codec: "aac" },
          transcoding: {
            container: "mp4",
            resolution: null,
            target: { audioCodec: null, videoCodec: null },
            isVideoDirect: true,
            isAudioDirect: false,
            containerChanged: true,
          },
          bitrateKbps: 8200,
        },
      },
    } as unknown as StreamSession;

    await act(() =>
      root.render(
        <MantineProvider env="test">
          <SessionDetailsPopover item={transcodingSession} opened onChange={() => undefined}>
            Open session
          </SessionDetailsPopover>
        </MantineProvider>,
      ),
    );

    const text = document.body.textContent;
    expect(text).toContain("Example show");
    expect(text).toContain("1920×1080 (1080p)");
    expect(text).toContain("23.976 fps");
    expect(text).toContain("5.1");
    expect(text).toContain("AAC");
    expect(text).toContain("8.2 Mb/s");
    expect(text).not.toContain("null");
    expect(text).not.toContain("undefined");
  });
});

describe("session detail formatters", () => {
  test("formats playback time with and without hours", () => {
    expect(formatPlaybackTime(0)).toBe("0:00");
    expect(formatPlaybackTime(65_000)).toBe("1:05");
    expect(formatPlaybackTime(3_725_000)).toBe("1:02:05");
    expect(formatPlaybackTime(null)).toBeNull();
    expect(formatPlaybackTime(-1)).toBeNull();
  });

  test("names common channel layouts", () => {
    expect(formatChannelLayout(2)).toBe("2.0");
    expect(formatChannelLayout(6)).toBe("5.1");
    expect(formatChannelLayout(8)).toBe("7.1");
    expect(formatChannelLayout(null)).toBeNull();
    expect(formatChannelLayout(0)).toBeNull();
  });

  test("trims frame rates and ignores missing values", () => {
    expect(formatFrameRate(23.976023)).toBe("23.976 fps");
    expect(formatFrameRate(25)).toBe("25 fps");
    expect(formatFrameRate(null)).toBeNull();
    expect(formatFrameRate(0)).toBeNull();
  });

  test("upper-cases codecs and ignores empty ones", () => {
    expect(formatCodec("hevc")).toBe("HEVC");
    expect(formatCodec(null)).toBeNull();
    expect(formatCodec("")).toBeNull();
  });
});

describe("getMediaServerColumnVisibility", () => {
  test("keeps every compact column visible at every width", () => {
    expect(getMediaServerColumnVisibility(0, false)).toEqual({ user: true, status: true });
    expect(getMediaServerColumnVisibility(300, false)).toEqual({ user: true, status: true });
    expect(getMediaServerColumnVisibility(420, false)).toEqual({ user: true, status: true });
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
