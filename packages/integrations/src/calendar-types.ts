export interface CalendarEvent {
    name: string;
    description?: string;
    thumbnail?: URL;
    mediaInformation?: {
        type: 'audio' | 'video' | 'tv' | 'movie';
        season?: number;
        episode?: number;
    }
}
