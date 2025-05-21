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
    episodeName?: string | null;
    albumName?: string | null;
    episodeCount?: number | null;
  } | null;
}

export interface CurrentSessionsInput {
  showOnlyPlaying: boolean;
}
