import type { IMediaOrganizerIntegration } from "../../interfaces/media-organizer/media-organizer-integration";
import type { MissingMediaItem, QueuedMediaItem } from "../../interfaces/media-organizer/media-organizer-types";

const missingItems: MissingMediaItem[] = [
  {
    id: 1,
    title: "Dune: Part Two",
    type: "movie",
    year: 2024,
    imageUrl: "https://image.tmdb.org/t/p/w300/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    link: "https://www.imdb.com/title/tt15239678/",
  },
  {
    id: 2,
    title: "The Batman Part II",
    type: "movie",
    year: 2026,
    imageUrl: "https://image.tmdb.org/t/p/w300/74xTEgt7R36Fpooo50r9T25onhq.jpg",
    link: "https://www.imdb.com/title/tt7126948/",
  },
  {
    id: 3,
    title: "The Last of Us",
    type: "episode",
    seasonNumber: 2,
    episodeNumber: 5,
    seriesTitle: "The Last of Us",
    year: 2025,
    imageUrl: "https://image.tmdb.org/t/p/w300/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",
    link: "https://www.imdb.com/title/tt3581920/",
  },
  {
    id: 4,
    title: "Andor",
    type: "episode",
    seasonNumber: 2,
    episodeNumber: 3,
    seriesTitle: "Andor",
    year: 2025,
    imageUrl: "https://image.tmdb.org/t/p/w300/59SVNwLfoMnZPPB6ukW6dlPxAdI.jpg",
    link: "https://www.imdb.com/title/tt9253284/",
  },
  {
    id: 5,
    title: "Gladiator II",
    type: "movie",
    year: 2024,
    imageUrl: "https://image.tmdb.org/t/p/w300/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg",
    link: "https://www.imdb.com/title/tt9218128/",
  },
];

const queuedItems: QueuedMediaItem[] = [
  {
    id: 101,
    title: "Oppenheimer",
    type: "movie",
    status: "downloading",
    timeLeft: "1h 23m",
    percentComplete: 62,
    imageUrl: "https://image.tmdb.org/t/p/w300/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    link: "https://www.imdb.com/title/tt15398776/",
  },
  {
    id: 102,
    title: "Shogun",
    type: "episode",
    seasonNumber: 1,
    episodeNumber: 8,
    seriesTitle: "Shogun",
    status: "downloading",
    timeLeft: "47m",
    percentComplete: 81,
    imageUrl: "https://image.tmdb.org/t/p/w300/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg",
    link: "https://www.imdb.com/title/tt2098771/",
  },
  {
    id: 103,
    title: "The Substance",
    type: "movie",
    status: "queued",
    timeLeft: null,
    percentComplete: 0,
    imageUrl: "https://image.tmdb.org/t/p/w300/lqoMzCcZYEFK729d6qzt349fB4o.jpg",
    link: "https://www.imdb.com/title/tt17526714/",
  },
  {
    id: 104,
    title: "House of the Dragon",
    type: "episode",
    seasonNumber: 2,
    episodeNumber: 7,
    seriesTitle: "House of the Dragon",
    status: "importing",
    timeLeft: "3m",
    percentComplete: 99,
    imageUrl: "https://image.tmdb.org/t/p/w300/z2yahl2uefxDCl0nogcRBstwruJ.jpg",
    link: "https://www.imdb.com/title/tt11198330/",
  },
];

export class MediaOrganizerMockService implements IMediaOrganizerIntegration {
  async getMissingAsync(pageSize = 10) {
    return {
      items: missingItems.slice(0, pageSize),
      totalCount: missingItems.length,
    };
  }

  async getMediaQueueAsync(pageSize = 10) {
    return {
      items: queuedItems.slice(0, pageSize),
      totalCount: queuedItems.length,
    };
  }
}
