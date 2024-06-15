export interface CalendarEvent {
    name: string;
    subName: string;
    date: Date;
    description?: string;
    thumbnail?: URL;
    mediaInformation?: {
        type: 'audio' | 'video' | 'tv' | 'movie';
        seasonNumber?: number;
        episodeNumber?: number;
    },
    links: {
        href: URL;
        name: string;
        color: string | undefined;
        isDark: boolean | undefined;
        logo: string; // TODO: Allow React Icons here
    }[];
}
