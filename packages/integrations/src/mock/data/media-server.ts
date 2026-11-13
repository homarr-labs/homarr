import type { IMediaServerIntegration } from "../../interfaces/media-server/media-server-integration";
import type { CurrentSessionsInput, StreamSession } from "../../interfaces/media-server/media-server-types";

const directPlayMetadata = (width: number, height: number, bitrateKbps: number) => ({
  video: { resolution: { width, height }, frameRate: 24 },
  audio: { channelCount: 6, codec: "AAC" },
  transcoding: {
    container: "mkv",
    resolution: { width, height },
    target: { audioCodec: "aac", videoCodec: "h264" },
    isVideoDirect: true,
    isAudioDirect: true,
    containerChanged: false,
  },
  bitrateKbps,
});

const sessions: StreamSession[] = [
  {
    sessionId: "s-0",
    sessionName: "Living Room TV",
    user: { userId: "u-0", username: "thomas", profilePictureUrl: null },
    currentlyPlaying: {
      type: "movie",
      name: "Big Buck Bunny",
      seasonName: undefined,
      episodeName: null,
      albumName: null,
      episodeCount: null,
      playback: { state: "playing", positionMs: 120_000, durationMs: 596_000 },
      location: "lan",
      metadata: directPlayMetadata(1920, 1080, 8000),
    },
  },
  {
    sessionId: "s-1",
    sessionName: "Bedroom Chromecast",
    user: { userId: "u-1", username: "sarah", profilePictureUrl: null },
    currentlyPlaying: {
      type: "video",
      name: "Breaking Bad",
      seasonName: "Season 5",
      seasonNumber: 5,
      episodeName: "Ozymandias",
      episodeNumber: 14,
      albumName: null,
      episodeCount: null,
      playback: { state: "paused", positionMs: 1_284_000, durationMs: 2_820_000 },
      location: "lan",
      metadata: directPlayMetadata(1920, 1080, 6500),
    },
  },
  {
    sessionId: "s-2",
    sessionName: "Office Desktop",
    user: { userId: "u-2", username: "mike", profilePictureUrl: null },
    currentlyPlaying: {
      type: "movie",
      name: "The Dark Knight",
      seasonName: undefined,
      episodeName: null,
      albumName: null,
      episodeCount: null,
      playback: { state: "playing", positionMs: 2_340_000, durationMs: 9_120_000 },
      location: "lan",
      metadata: directPlayMetadata(3840, 2160, 24000),
    },
  },
  {
    sessionId: "s-3",
    sessionName: "iPad",
    user: { userId: "u-3", username: "emily", profilePictureUrl: null },
    currentlyPlaying: {
      type: "video",
      name: "Severance",
      seasonName: "Season 1",
      seasonNumber: 1,
      episodeName: "The We We Are",
      episodeNumber: 9,
      albumName: null,
      episodeCount: null,
      playback: { state: "playing", positionMs: 1_560_000, durationMs: 2_460_000 },
      location: "wan",
      metadata: {
        ...directPlayMetadata(1920, 1080, 4000),
        transcoding: {
          container: "mp4",
          resolution: { width: 1280, height: 720 },
          target: { audioCodec: "aac", videoCodec: "h264" },
          isVideoDirect: false,
          isAudioDirect: true,
          containerChanged: true,
        },
      },
    },
  },
  {
    sessionId: "s-4",
    sessionName: "Mobile",
    user: { userId: "u-4", username: "alex", profilePictureUrl: null },
    currentlyPlaying: {
      type: "audio",
      name: "Get Lucky",
      seasonName: undefined,
      episodeName: null,
      albumName: "Random Access Memories",
      episodeCount: null,
      playback: { state: "playing", positionMs: 96_000, durationMs: 369_000 },
      location: "wan",
      metadata: {
        video: { resolution: null, frameRate: null },
        audio: { channelCount: 2, codec: "FLAC" },
        transcoding: {
          container: "flac",
          resolution: null,
          target: { audioCodec: "flac", videoCodec: null },
          isVideoDirect: true,
          isAudioDirect: true,
          containerChanged: false,
        },
        bitrateKbps: 950,
      },
    },
  },
  {
    sessionId: "s-5",
    sessionName: "Guest Room",
    user: { userId: "u-5", username: "guest", profilePictureUrl: null },
    currentlyPlaying: {
      type: "movie",
      name: "Oppenheimer",
      seasonName: undefined,
      episodeName: null,
      albumName: null,
      episodeCount: null,
      playback: { state: "paused", positionMs: 4_020_000, durationMs: 10_860_000 },
      location: "lan",
      metadata: directPlayMetadata(3840, 2160, 32000),
    },
  },
];

export class MediaServerMockService implements IMediaServerIntegration {
  public async getCurrentSessionsAsync(_options: CurrentSessionsInput): Promise<StreamSession[]> {
    return await Promise.resolve(sessions);
  }
}
