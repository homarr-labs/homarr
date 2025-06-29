import { objectEntries } from "@homarr/common";

import type { IMediaRequestIntegration } from "../../interfaces/media-requests/media-request-integration";
import type { MediaInformation, MediaRequest, RequestStats, RequestUser } from "../../types";
import { MediaAvailability, MediaRequestStatus } from "../../types";

export class MediaRequestMockService implements IMediaRequestIntegration {
  public async getSeriesInformationAsync(mediaType: "movie" | "tv", id: number): Promise<MediaInformation> {
    return await Promise.resolve({
      id,
      overview: `Overview of media ${id}`,
      posterPath: `https://m.media-amazon.com/images/M/MV5BNjgxZGM0OWUtZGY1MS00MWRmLTk2N2ItYjQyZTI1OThlZDliXkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg`,
      seasons:
        mediaType === "tv"
          ? Array.from({ length: 3 }, (_, seasonIndex) => ({
              id: seasonIndex + 1,
              name: `Season ${seasonIndex + 1}`,
              episodeCount: Math.floor(Math.random() * 10) + 1,
              overview: `Overview of season ${seasonIndex + 1} of media ${id}`,
            }))
          : undefined,
    });
  }
  public async requestMediaAsync(_mediaType: "movie" | "tv", _id: number, _seasons?: number[]): Promise<void> {
    await Promise.resolve();
  }
  public async getRequestsAsync(): Promise<MediaRequest[]> {
    const result = await Promise.resolve(
      Array.from({ length: 10 }, (_, index) => MediaRequestMockService.createRequest(index)),
    );

    return result;
  }
  public async getStatsAsync(): Promise<RequestStats> {
    return await Promise.resolve({
      approved: Math.floor(Math.random() * 100),
      available: Math.floor(Math.random() * 100),
      declined: Math.floor(Math.random() * 100),
      movie: Math.floor(Math.random() * 100),
      pending: Math.floor(Math.random() * 100),
      processing: Math.floor(Math.random() * 100),
      total: Math.floor(Math.random() * 1000),
      tv: Math.floor(Math.random() * 100),
    });
  }
  public async getUsersAsync(): Promise<RequestUser[]> {
    return await Promise.resolve(Array.from({ length: 5 }, (_, index) => MediaRequestMockService.createUser(index)));
  }

  public async approveRequestAsync(_requestId: number): Promise<void> {
    await Promise.resolve();
  }
  public async declineRequestAsync(_requestId: number): Promise<void> {
    await Promise.resolve();
  }

  private static createUser(index: number): RequestUser {
    return {
      id: index,
      displayName: `User ${index}`,
      avatar: "https://thispersondoesnotexist.com/",
      requestCount: Math.floor(Math.random() * 100),
      link: `https://example.com/user/${index}`,
    };
  }

  private static createRequest(index: number): MediaRequest {
    return {
      id: index,
      name: `Media Request ${index}`,
      availability: this.randomAvailability(),
      backdropImageUrl:
        "https://m.media-amazon.com/images/M/MV5BNjgxZGM0OWUtZGY1MS00MWRmLTk2N2ItYjQyZTI1OThlZDliXkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
      posterImagePath:
        "https://m.media-amazon.com/images/M/MV5BNjgxZGM0OWUtZGY1MS00MWRmLTk2N2ItYjQyZTI1OThlZDliXkEyXkFqcGc@._V1_QL75_UX190_CR0,0,190,281_.jpg",
      createdAt: new Date(),
      airDate: new Date(Date.now() + (Math.random() - 0.5) * 1000 * 60 * 60 * 24 * 365 * 4),
      status: this.randomStatus(),
      href: `https://example.com/media/${index}`,
      type: Math.random() > 0.5 ? "movie" : "tv",
      requestedBy: {
        avatar: "https://thispersondoesnotexist.com/",
        displayName: `User ${index}`,
        id: index,
        link: `https://example.com/user/${index}`,
      },
    };
  }

  private static randomAvailability(): MediaAvailability {
    const values = objectEntries(MediaAvailability).filter(([key]) => typeof key === "number");
    return values[Math.floor(Math.random() * values.length)]?.[1] ?? MediaAvailability.Available;
  }

  private static randomStatus(): MediaRequestStatus {
    const values = objectEntries(MediaRequestStatus).filter(([key]) => typeof key === "number");
    return values[Math.floor(Math.random() * values.length)]?.[1] ?? MediaRequestStatus.PendingApproval;
  }
}
