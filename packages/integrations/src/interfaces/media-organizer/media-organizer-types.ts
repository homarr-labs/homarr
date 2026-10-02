export interface MissingMediaItem {
  id: number;
  title: string;
  type: "movie" | "episode" | "book";
  year?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  seriesTitle?: string;
  imageUrl?: string | null;
  link: string;
}

export interface QueuedMediaItem {
  id: number;
  title: string;
  type: "movie" | "episode" | "book";
  status: string;
  timeLeft: string | null;
  percentComplete: number;
  year?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  seriesTitle?: string;
  imageUrl?: string | null;
  link: string;
}
