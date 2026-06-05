import type { ICalendarIntegration } from "../../interfaces/calendar/calendar-integration";
import type { CalendarEvent } from "../../interfaces/calendar/calendar-types";

interface EventTemplate {
  title: string;
  subTitle: string;
  description: string;
  dayOffset: number;
  hours: number;
  image: CalendarEvent["image"];
  indicatorColor: string;
  metadata?: CalendarEvent["metadata"];
  location?: string;
  links: CalendarEvent["links"];
}

const eventTemplates: EventTemplate[] = [
  {
    title: "The Mandalorian",
    subTitle: "Season 4",
    description: "A lone bounty hunter in the outer reaches of the galaxy.",
    dayOffset: 0,
    hours: 20,
    image: {
      src: "https://image.tmdb.org/t/p/w300/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg",
      aspectRatio: { width: 7, height: 12 },
      badge: { content: "S4/E3", color: "red" },
    },
    indicatorColor: "blue",
    links: [
      {
        href: "https://www.imdb.com/title/tt8111088/",
        name: "IMDb",
        color: "#f5c518",
        isDark: false,
        logo: "/images/apps/imdb.svg",
      },
    ],
  },
  {
    title: "Silo",
    subTitle: "Season 2",
    description: "In a ruined and toxic future, thousands live in a giant underground silo.",
    dayOffset: 3,
    hours: 21,
    image: {
      src: "https://image.tmdb.org/t/p/w300/2xSzAuKMhERTcPA19SpFQtVrMC0.jpg",
      aspectRatio: { width: 7, height: 12 },
      badge: { content: "S2/E8", color: "teal" },
    },
    indicatorColor: "teal",
    links: [
      {
        href: "https://www.imdb.com/title/tt14688458/",
        name: "IMDb",
        color: "#f5c518",
        isDark: false,
        logo: "/images/apps/imdb.svg",
      },
    ],
  },
  {
    title: "Dune: Part Two",
    subTitle: "Digital Release",
    description: "Paul Atreides unites with the Fremen to seek revenge against the conspirators.",
    dayOffset: 5,
    hours: 0,
    image: {
      src: "https://image.tmdb.org/t/p/w300/8b8R8l88Qje9dn9OE8PY05Nez7.jpg",
      aspectRatio: { width: 7, height: 12 },
    },
    metadata: { type: "radarr", releaseType: "digitalRelease" },
    indicatorColor: "cyan",
    links: [
      {
        href: "https://www.imdb.com/title/tt15239678/",
        name: "IMDb",
        color: "#f5c518",
        isDark: false,
        logo: "/images/apps/imdb.svg",
      },
    ],
  },
  {
    title: "Severance",
    subTitle: "Season 2",
    description: "Mark leads a team of office workers whose memories are surgically divided.",
    dayOffset: 7,
    hours: 22,
    image: {
      src: "https://image.tmdb.org/t/p/w300/pJAtR4gMFnalHCmT9cByPFgkZ6B.jpg",
      aspectRatio: { width: 7, height: 12 },
      badge: { content: "S2/E5", color: "violet" },
    },
    indicatorColor: "violet",
    links: [],
  },
  {
    title: "Oppenheimer",
    subTitle: "Physical Release",
    description: "The story of the development of the atomic bomb.",
    dayOffset: 10,
    hours: 0,
    image: {
      src: "https://image.tmdb.org/t/p/w300/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
      aspectRatio: { width: 7, height: 12 },
    },
    metadata: { type: "radarr", releaseType: "physicalRelease" },
    indicatorColor: "orange",
    links: [
      {
        href: "https://www.imdb.com/title/tt15398776/",
        name: "IMDb",
        color: "#f5c518",
        isDark: false,
        logo: "/images/apps/imdb.svg",
      },
    ],
  },
  {
    title: "Homarr Meetup",
    subTitle: "",
    description: "Yearly meetup of the Homarr community",
    dayOffset: 14,
    hours: 14,
    location: "Mountains",
    image: null,
    indicatorColor: "#fa5252",
    links: [
      {
        href: "https://homarr.dev",
        name: "Homarr",
        logo: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/homarr.svg",
        color: "#000000",
        isDark: true,
      },
    ],
  },
  {
    title: "The Bear",
    subTitle: "Season 3",
    description: "A young chef fights to transform a sandwich shop.",
    dayOffset: 18,
    hours: 3,
    image: {
      src: "https://image.tmdb.org/t/p/w300/sHFlYJhNbmpMOkr7JKGxFAnMPFm.jpg",
      aspectRatio: { width: 7, height: 12 },
      badge: { content: "S3/E1", color: "yellow" },
    },
    indicatorColor: "yellow",
    links: [],
  },
  {
    title: "Foundation",
    subTitle: "Season 3",
    description: "A band of exiles discovers that the only way to save the Galactic Empire is to defy it.",
    dayOffset: 21,
    hours: 20,
    image: {
      src: "https://image.tmdb.org/t/p/w300/wSByZTwCPVYAjlqcVCBTCLZchkC.jpg",
      aspectRatio: { width: 7, height: 12 },
      badge: { content: "S3/E1", color: "indigo" },
    },
    indicatorColor: "indigo",
    links: [],
  },
  {
    title: "Blade Runner 2099",
    subTitle: "Premiere",
    description: "A new chapter in the Blade Runner universe.",
    dayOffset: 25,
    hours: 21,
    image: {
      src: "https://image.tmdb.org/t/p/w300/63UMsIFOlCSz3uCPKtbgOdUr4pE.jpg",
      aspectRatio: { width: 7, height: 12 },
    },
    metadata: { type: "radarr", releaseType: "digitalRelease" },
    indicatorColor: "grape",
    links: [],
  },
];

const buildEventsForRange = (start: Date, end: Date): CalendarEvent[] => {
  const rangeStart = new Date(start);
  rangeStart.setDate(rangeStart.getDate() - 3);

  return eventTemplates
    .map((tpl) => {
      const startDate = new Date(rangeStart);
      startDate.setDate(startDate.getDate() + tpl.dayOffset);
      startDate.setHours(tpl.hours, 0, 0, 0);

      return {
        title: tpl.title,
        subTitle: tpl.subTitle,
        description: tpl.description,
        startDate,
        endDate: tpl.location ? new Date(startDate.getTime() + 2 * 60 * 60 * 1000) : null,
        image: tpl.image,
        location: tpl.location ?? null,
        indicatorColor: tpl.indicatorColor,
        links: tpl.links,
        ...(tpl.metadata ? { metadata: tpl.metadata } : {}),
      };
    })
    .filter((event) => event.startDate >= start && event.startDate <= end);
};

export class CalendarMockService implements ICalendarIntegration {
  public async getCalendarEventsAsync(start: Date, end: Date, _includeUnmonitored: boolean): Promise<CalendarEvent[]> {
    return await Promise.resolve(buildEventsForRange(start, end));
  }
}
