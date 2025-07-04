export const radarrReleaseTypes = ["inCinemas", "digitalRelease", "physicalRelease"] as const;
export type RadarrReleaseType = (typeof radarrReleaseTypes)[number];

export interface CalendarEvent {
  name: string;
  subName: string;
  date: Date;
  dates?: { type: RadarrReleaseType; date: Date }[];
  description?: string;
  thumbnail?: string;
  mediaInformation?: {
    type: "audio" | "video" | "tv" | "movie";
    seasonNumber?: number;
    episodeNumber?: number;
  };
  links: {
    href: string;
    name: string;
    color: string | undefined;
    notificationColor?: string | undefined;
    isDark: boolean | undefined;
    logo: string;
  }[];
}
