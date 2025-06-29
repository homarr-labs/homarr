import type { ICalendarIntegration } from "../../interfaces/calendar/calendar-integration";
import type { CalendarEvent } from "../../interfaces/calendar/calendar-types";

export class CalendarMockService implements ICalendarIntegration {
  public async getCalendarEventsAsync(start: Date, end: Date, _includeUnmonitored: boolean): Promise<CalendarEvent[]> {
    const result = [homarrMeetup(start, end), titanicRelease(start, end), seriesRelease(start, end)];
    return await Promise.resolve(result);
  }
}

const homarrMeetup = (start: Date, end: Date): CalendarEvent => ({
  name: "Homarr Meetup",
  subName: "",
  description: "Yearly meetup of the Homarr community",
  date: randomDateBetween(start, end),
  links: [
    {
      href: "https://homarr.dev",
      name: "Homarr",
      logo: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/homarr.svg",
      color: "#000000",
      notificationColor: "#fa5252",
      isDark: true,
    },
  ],
});

const titanicRelease = (start: Date, end: Date): CalendarEvent => ({
  name: "Titanic",
  subName: "A classic movie",
  description: "A tragic love story set on the ill-fated RMS Titanic.",
  date: randomDateBetween(start, end),
  thumbnail: "/images/mock/titanic-poster.jpg",
  mediaInformation: {
    type: "movie",
  },
  links: [
    {
      href: "https://www.imdb.com/title/tt0120338/",
      name: "IMDb",
      color: "#f5c518",
      isDark: false,
      logo: "/images/apps/imdb.svg",
      notificationColor: "cyan",
    },
  ],
});

const seriesRelease = (start: Date, end: Date): CalendarEvent => ({
  name: "The Mandalorian",
  subName: "A Star Wars Series",
  description: "A lone bounty hunter in the outer reaches of the galaxy.",
  date: randomDateBetween(start, end),
  thumbnail: "/images/mock/the-mandalorian-poster.jpg",
  mediaInformation: {
    type: "tv",
    seasonNumber: 1,
    episodeNumber: 1,
  },
  links: [
    {
      href: "https://www.imdb.com/title/tt8111088/",
      name: "IMDb",
      color: "#f5c518",
      isDark: false,
      logo: "/images/apps/imdb.svg",
      notificationColor: "blue",
    },
  ],
});

function randomDateBetween(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
