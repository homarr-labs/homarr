export interface CalendarEvent {
    name: string;
    date: Date;
    description?: string;
    thumbnail?: URL;
    mediaInformation?: {
        type: 'audio' | 'video' | 'tv' | 'movie';
        season?: number;
        episode?: number;
    }
}
