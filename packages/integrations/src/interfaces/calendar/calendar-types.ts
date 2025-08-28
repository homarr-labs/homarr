export const radarrReleaseTypes = ["inCinemas", "digitalRelease", "physicalRelease"] as const;
export type RadarrReleaseType = (typeof radarrReleaseTypes)[number];

export interface MediaMetadata {
  type: "audio" | "video" | "tv" | "movie";
  seasonNumber?: number;
  episodeNumber?: number;
  thumbnail?: string;
}


export interface ICalMetadata {
  type: 'event'
  startDate: Date;
  endDate: Date;
  color: string;
  attendees: string[];
  duration: string;
  location: string;
  organizer: string;
  calendarName?: string;
  timezone?: string;
}

export type Metadata = MediaMetadata | ICalMetadata;

export const isMediaMetadata = (metadata?: Metadata): metadata is MediaMetadata => {
  return metadata !== undefined && (metadata.type === 'audio' || metadata.type === 'movie' || metadata.type === 'tv' || metadata.type === 'video')
}

export interface CalendarEvent {
  name: string;
  subName: string;
  date: Date;
  dates?: { type: RadarrReleaseType; date: Date }[];
  metadata?: Metadata
  description?: string;
  links: {
    href: string;
    name: string;
    color: string | undefined;
    notificationColor?: string | undefined;
    isDark: boolean | undefined;
    logo: string;
  }[];
}
