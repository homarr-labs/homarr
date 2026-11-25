import type { IMediaRequestIntegration } from "../../interfaces/media-requests/media-request-integration";
import type { MediaInformation, MediaRequest, RequestStats, RequestUser } from "../../types";
import { mockMediaReleases } from "./media-releases";

const demoUsers = ["thomas", "sarah", "mike", "emily", "alex"];
const requestedAt = Date.now();
const requestTemplates = [
  { releaseId: "7", userId: 3, status: "pending", availability: "pending" },
  { releaseId: "5", userId: 3, status: "approved", availability: "processing" },
  { releaseId: "6", userId: 4, status: "completed", availability: "available" },
  { releaseId: "2", userId: 1, status: "completed", availability: "available" },
  { releaseId: "4", userId: 2, status: "completed", availability: "available" },
  { releaseId: "1", userId: 0, status: "completed", availability: "available" },
] as const;

const getUsers = (): RequestUser[] =>
  demoUsers.map((displayName, id) => ({
    id,
    displayName,
    avatar: "/images/mock/avatar.jpg",
    requestCount: requestTemplates.filter((request) => request.userId === id).length,
    link: `https://example.com/user/${id}`,
  }));

const getRequests = (): MediaRequest[] =>
  requestTemplates.flatMap((template, id) => {
    const release = mockMediaReleases.find((media) => media.id === template.releaseId);
    const user = getUsers()[template.userId];
    if (!release || !user || (release.type !== "movie" && release.type !== "tv")) return [];
    return [
      {
        id,
        name: release.title,
        type: release.type,
        backdropImageUrl: release.imageUrls.backdrop ?? release.imageUrls.poster ?? "",
        posterImagePath: release.imageUrls.poster ?? "",
        href: release.href ?? "https://www.themoviedb.org",
        createdAt: new Date(requestedAt - (id + 1) * 6 * 60 * 60 * 1000),
        airDate: release.releaseDate,
        status: template.status,
        availability: template.availability,
        requestedBy: user,
      },
    ];
  });

export class MediaRequestMockService implements IMediaRequestIntegration {
  public async getSeriesInformationAsync(mediaType: "movie" | "tv", id: number): Promise<MediaInformation> {
    const request = getRequests().find((entry) => entry.id === id);
    const information = {
      id,
      overview: "Sample library request. The demo does not send requests to a media server.",
      posterPath: request?.posterImagePath ?? "",
    };
    if (mediaType === "tv") {
      return {
        ...information,
        seasons: [
          { id: 1, seasonNumber: 1, name: "Season 1", episodeCount: 10 },
          { id: 2, seasonNumber: 2, name: "Season 2", episodeCount: 10 },
        ],
      };
    }
    return information;
  }

  public async requestMediaAsync(_mediaType: "movie" | "tv", _id: number, _seasons?: number[]): Promise<void> {
    await Promise.resolve();
  }

  public async getRequestsAsync(): Promise<MediaRequest[]> {
    return getRequests();
  }

  public async getStatsAsync(): Promise<RequestStats> {
    const requests = getRequests();
    return {
      total: requests.length,
      movie: requests.filter((request) => request.type === "movie").length,
      tv: requests.filter((request) => request.type === "tv").length,
      pending: requests.filter((request) => request.status === "pending").length,
      approved: requests.filter((request) => request.status === "approved").length,
      declined: requests.filter((request) => request.status === "declined").length,
      processing: requests.filter((request) => request.availability === "processing").length,
      available: requests.filter((request) => request.availability === "available").length,
    };
  }

  public async getUsersAsync(): Promise<RequestUser[]> {
    return getUsers();
  }

  public async approveRequestAsync(_requestId: number): Promise<void> {
    await Promise.resolve();
  }

  public async declineRequestAsync(_requestId: number): Promise<void> {
    await Promise.resolve();
  }
}
