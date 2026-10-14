import { BlockList, isIP } from "node:net";
import { BaseItemKind } from "@jellyfin/sdk/lib/generated-client/models";
import type { SessionInfoDto as SessionInfo } from "@jellyfin/sdk/lib/generated-client/models";

import type { MediaType } from "../../interfaces/media-releases";
import type { StreamSession } from "../../interfaces/media-server/media-server-types";

const privateAddresses = new BlockList();
privateAddresses.addSubnet("10.0.0.0", 8, "ipv4");
privateAddresses.addSubnet("172.16.0.0", 12, "ipv4");
privateAddresses.addSubnet("192.168.0.0", 16, "ipv4");
privateAddresses.addSubnet("127.0.0.0", 8, "ipv4");
privateAddresses.addSubnet("169.254.0.0", 16, "ipv4");
privateAddresses.addSubnet("fc00::", 7, "ipv6");
privateAddresses.addSubnet("fe80::", 10, "ipv6");
privateAddresses.addAddress("::1", "ipv6");

export function ticksToMs(ticks: number | null | undefined): number | null {
  return ticks == null ? null : Math.round(ticks / 10_000);
}

export function parsePlaybackLocation(remoteEndPoint: string | null | undefined): "lan" | "wan" | null {
  if (!remoteEndPoint) return null;
  let host = remoteEndPoint;
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    if (end !== -1) host = host.slice(1, end);
  } else if (host.split(":").length === 2) host = host.slice(0, host.lastIndexOf(":"));
  let family = isIP(host);
  if (family === 6 && host.toLowerCase().startsWith("::ffff:") && isIP(host.slice(7)) === 4) {
    host = host.slice(7);
    family = 4;
  }
  if (!family) return null;
  return privateAddresses.check(host, family === 4 ? "ipv4" : "ipv6") ? "lan" : "wan";
}

export function playbackKind(kind: BaseItemKind | undefined): NonNullable<StreamSession["currentlyPlaying"]>["type"] {
  switch (kind) {
    case BaseItemKind.Audio:
    case BaseItemKind.MusicVideo:
      return "audio";
    case BaseItemKind.Episode:
    case BaseItemKind.Video:
      return "video";
    case BaseItemKind.Movie:
      return "movie";
    default:
      return "tv";
  }
}

export function mediaReleaseKind(kind: string | undefined): MediaType {
  switch (kind) {
    case "Audio":
    case "AudioBook":
    case "MusicAlbum":
      return "music";
    case "Book":
      return "book";
    case "Episode":
    case "Series":
    case "Season":
      return "tv";
    case "Movie":
      return "movie";
    case "Video":
      return "video";
    default:
      return "unknown";
  }
}

type PlaybackSession = Omit<SessionInfo, "PlayState" | "TranscodingInfo"> & {
  PlayState?:
    | (Omit<NonNullable<SessionInfo["PlayState"]>, "IsPaused" | "PlayMethod"> & {
        IsPaused?: boolean | null;
        PlayMethod?: string | null;
      })
    | null;
  TranscodingInfo?:
    | (Omit<NonNullable<SessionInfo["TranscodingInfo"]>, "IsVideoDirect" | "IsAudioDirect"> & {
        IsVideoDirect?: boolean | null;
        IsAudioDirect?: boolean | null;
      })
    | null;
};

export function playbackSession(session: PlaybackSession, profilePictureUrl: string): StreamSession {
  const item = session.NowPlayingItem;
  const transcode = session.TranscodingInfo;
  let currentlyPlaying: StreamSession["currentlyPlaying"] = null;
  if (item) {
    const streamsBitrate = item.MediaStreams?.reduce((sum, stream) => sum + (stream.BitRate ?? 0), 0);
    const bitrate = transcode?.Bitrate ?? item.MediaSources?.[0]?.Bitrate ?? (streamsBitrate || null);
    const isEpisode = item.Type === BaseItemKind.Episode;
    currentlyPlaying = {
      type: playbackKind(item.Type),
      name: item.SeriesName ?? item.Name ?? "",
      seasonName: item.SeasonName ?? "",
      seasonNumber: isEpisode ? (item.ParentIndexNumber ?? null) : null,
      episodeName: isEpisode ? item.EpisodeTitle : null,
      episodeNumber: isEpisode ? (item.IndexNumber ?? null) : null,
      albumName: item.Album ?? "",
      episodeCount: item.EpisodeCount,
      playback: {
        state: session.PlayState?.IsPaused ? "paused" : "playing",
        positionMs: ticksToMs(session.PlayState?.PositionTicks),
        durationMs: ticksToMs(item.RunTimeTicks),
      },
      location: parsePlaybackLocation(session.RemoteEndPoint),
      metadata: {
        video: {
          resolution: item.Width && item.Height ? { width: item.Width, height: item.Height } : null,
          frameRate: transcode?.Framerate ?? null,
        },
        audio: { channelCount: transcode?.AudioChannels ?? null, codec: transcode?.AudioCodec ?? null },
        transcoding: {
          resolution:
            transcode?.Width && transcode.Height ? { width: transcode.Width, height: transcode.Height } : null,
          target: { audioCodec: transcode?.AudioCodec ?? null, videoCodec: transcode?.VideoCodec ?? null },
          container: transcode?.Container ?? null,
          isVideoDirect: transcode?.IsVideoDirect ?? true,
          isAudioDirect: transcode?.IsAudioDirect ?? true,
          containerChanged: session.PlayState?.PlayMethod === "DirectStream",
        },
        bitrateKbps: bitrate !== null ? Math.round(bitrate / 1000) : null,
      },
    };
  }
  return {
    sessionId: `${session.Id}`,
    sessionName: `${session.Client} (${session.DeviceName})`,
    user: { profilePictureUrl, userId: session.UserId ?? "", username: session.UserName ?? "" },
    currentlyPlaying,
  };
}
