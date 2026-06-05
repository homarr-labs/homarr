import type { IMediaReleasesIntegration, MediaRelease } from "../../interfaces/media-releases";

export class MediaReleasesMockService implements IMediaReleasesIntegration {
  public async getMediaReleasesAsync(): Promise<MediaRelease[]> {
    return await Promise.resolve(mockMediaReleases);
  }
}

export const mockMediaReleases: MediaRelease[] = [
  {
    id: "1",
    type: "movie",
    title: "Inception",
    subtitle: "A mind-bending thriller",
    description:
      "A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea into the mind of a CEO.",
    releaseDate: new Date("2010-07-16"),
    imageUrls: {
      poster: "https://image.tmdb.org/t/p/w300/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg",
      backdrop: "https://image.tmdb.org/t/p/w780/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
    },
    producer: "Warner Bros.",
    price: 14.99,
    rating: "8.8/10",
    tags: ["Sci-Fi", "Thriller"],
    href: "https://www.themoviedb.org/movie/27205-inception",
    length: 148,
  },
  {
    id: "2",
    type: "tv",
    title: "Breaking Bad",
    subtitle: "S5E14 - Ozymandias",
    description: "When Walter White's secret is revealed, he must face the consequences of his actions.",
    releaseDate: new Date("2013-09-15"),
    imageUrls: {
      poster: "https://image.tmdb.org/t/p/w300/ztkUQFLlC19CCMYHW73GM9hBNRh.jpg",
      backdrop: "https://image.tmdb.org/t/p/w780/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
    },
    producer: "AMC",
    rating: "9.5/10",
    tags: ["Crime", "Drama"],
    href: "https://www.themoviedb.org/tv/1396-breaking-bad",
  },
  {
    id: "3",
    type: "music",
    title: "Random Access Memories",
    subtitle: "Daft Punk",
    description: "The fourth studio album by French electronic music duo Daft Punk.",
    releaseDate: new Date("2013-05-17"),
    imageUrls: {
      poster: "https://image.tmdb.org/t/p/w300/mIfBmEBqA1ddSMFyMAvACvOQ6cL.jpg",
      backdrop: "https://image.tmdb.org/t/p/w780/mIfBmEBqA1ddSMFyMAvACvOQ6cL.jpg",
    },
    producer: "Columbia Records",
    price: 9.99,
    rating: "8.5/10",
    tags: ["Electronic", "Funk"],
    href: "https://www.daftpunk.com",
  },
  {
    id: "4",
    type: "movie",
    title: "The Dark Knight",
    subtitle: "Theatrical Release",
    description:
      "Batman raises the stakes in his war on crime. With the help of Lt. Gordon and DA Harvey Dent, Batman sets out to dismantle organized crime.",
    releaseDate: new Date("2008-07-18"),
    imageUrls: {
      poster: "https://image.tmdb.org/t/p/w300/qJ2tW6WMUDux911BTUgMe1nV8Is.jpg",
      backdrop: "https://image.tmdb.org/t/p/w780/nMKdUUepR0i5zn0y1T4CsSB5ez.jpg",
    },
    producer: "Warner Bros.",
    price: 12.99,
    rating: "9.0/10",
    tags: ["Action", "Crime", "Drama"],
    href: "https://www.themoviedb.org/movie/155-the-dark-knight",
    length: 152,
  },
  {
    id: "5",
    type: "movie",
    title: "Interstellar",
    subtitle: "Digital Release",
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    releaseDate: new Date("2014-11-07"),
    imageUrls: {
      poster: "https://image.tmdb.org/t/p/w300/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
      backdrop: "https://image.tmdb.org/t/p/w780/xJHokMbljXjADYdit5fK1DVfjko.jpg",
    },
    producer: "Paramount",
    price: 14.99,
    rating: "8.7/10",
    tags: ["Sci-Fi", "Adventure"],
    href: "https://www.themoviedb.org/movie/157336-interstellar",
    length: 169,
  },
  {
    id: "6",
    type: "tv",
    title: "Severance",
    subtitle: "S2E1 - Premiere",
    description:
      "Mark leads a team of office workers whose memories are surgically divided between work and personal lives.",
    releaseDate: new Date("2025-01-17"),
    imageUrls: {
      poster: "https://image.tmdb.org/t/p/w300/pJAtR4gMFnalHCmT9cByPFgkZ6B.jpg",
      backdrop: "https://image.tmdb.org/t/p/w780/gvaAaDUbF41Z1NLuJsHPRHkv1Ie.jpg",
    },
    producer: "Apple TV+",
    rating: "8.7/10",
    tags: ["Thriller", "Sci-Fi"],
    href: "https://www.themoviedb.org/tv/95396-severance",
  },
  {
    id: "7",
    type: "movie",
    title: "Dune: Part Two",
    subtitle: "Theatrical Release",
    description:
      "Paul Atreides unites with the Fremen to seek revenge against the conspirators who destroyed his family.",
    releaseDate: new Date("2024-03-01"),
    imageUrls: {
      poster: "https://image.tmdb.org/t/p/w300/8b8R8l88Qje9dn9OE8PY05Nez7.jpg",
      backdrop: "https://image.tmdb.org/t/p/w780/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    },
    producer: "Warner Bros.",
    price: 19.99,
    rating: "8.5/10",
    tags: ["Sci-Fi", "Adventure"],
    href: "https://www.themoviedb.org/movie/693134-dune-part-two",
    length: 166,
  },
];
