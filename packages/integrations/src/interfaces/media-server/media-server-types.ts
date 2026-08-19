export interface StreamSession {
  sessionId: string;
  sessionName: string;
  user: {
    userId: string;
    username: string;
    profilePictureUrl: string | null;
  };
  currentlyPlaying: {
    type: "audio" | "video" | "tv" | "movie";
    name: string;
    seasonName: string | undefined;
    seasonNumber?: number | null;
    episodeName?: string | null;
    episodeNumber?: number | null;
    albumName?: string | null;
    episodeCount?: number | null;
    playback: {
      state: "playing" | "paused" | "buffering" | null;
      positionMs: number | null;
      durationMs: number | null;
    };
    location: "lan" | "wan" | null;
    metadata: {
      video: {
        resolution: {
          width: number;
          height: number;
        } | null;
        frameRate: number | null;
      };
      audio: {
        channelCount: number | null;
        codec: string | null;
      };
      transcoding: {
        container: string | null;
        resolution: {
          width: number;
          height: number;
        } | null;
        target: {
          audioCodec: string | null;
          videoCodec: string | null;
        };
        isVideoDirect: boolean;
        isAudioDirect: boolean;
        containerChanged: boolean;
      };
      bitrateKbps: number | null;
    } | null;
  } | null;
}

export interface CurrentSessionsInput {
  showOnlyPlaying: boolean;
}
