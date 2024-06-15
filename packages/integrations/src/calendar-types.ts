export interface CalendarEvent {
    name: string;
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
        color: string;
        isDark: boolean;
        logo: string; // TODO: Allow React Icons here
    }[];
}
