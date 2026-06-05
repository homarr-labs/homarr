import type { IMediaServerIntegration } from "../../interfaces/media-server/media-server-integration";
import type { CurrentSessionsInput, StreamSession } from "../../interfaces/media-server/media-server-types";

const sessions: StreamSession[] = [
  {
    sessionId: "s-0",
    sessionName: "Living Room TV",
    user: { userId: "u-0", username: "thomas", profilePictureUrl: null },
    currentlyPlaying: {
      type: "movie",
      name: "Interstellar",
      seasonName: undefined,
      episodeName: null,
      albumName: null,
      episodeCount: null,
      metadata: null,
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
      episodeName: "Ozymandias",
      albumName: null,
      episodeCount: null,
      metadata: null,
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
      metadata: null,
    },
  },
  {
    sessionId: "s-3",
    sessionName: "iPad",
    user: { userId: "u-3", username: "emily", profilePictureUrl: null },
    currentlyPlaying: {
      type: "video",
      name: "Severance",
      seasonName: "Season 2",
      episodeName: "The We We Are",
      albumName: null,
      episodeCount: null,
      metadata: null,
    },
  },
  {
    sessionId: "s-4",
    sessionName: "Mobile",
    user: { userId: "u-4", username: "alex", profilePictureUrl: null },
    currentlyPlaying: {
      type: "audio",
      name: "Daft Punk",
      seasonName: undefined,
      episodeName: null,
      albumName: "Random Access Memories",
      episodeCount: null,
      metadata: null,
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
      metadata: null,
    },
  },
];

export class MediaServerMockService implements IMediaServerIntegration {
  public async getCurrentSessionsAsync(_options: CurrentSessionsInput): Promise<StreamSession[]> {
    return await Promise.resolve(sessions);
  }
}
