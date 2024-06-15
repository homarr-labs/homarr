export interface CalendarEvent {
    name: string;
    subName: string;
    date: Date;
    description?: string;
    thumbnail?: string;
    mediaInformation?: {
        type: 'audio' | 'video' | 'tv' | 'movie';
        seasonNumber?: number;
        episodeNumber?: number;
    },
    links: {
        href: string;
        name: string;
        color: string | undefined;
        isDark: boolean | undefined;
        logo: string;
    }[];
}
