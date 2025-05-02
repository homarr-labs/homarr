export interface MediaRequest {
  id: number;
  name: string;
  type: "movie" | "tv";
  backdropImageUrl: string;
  posterImagePath: string;
  href: string;
  createdAt: Date;
  airDate?: Date;
  status: MediaRequestStatus;
  availability: MediaAvailability;
  requestedBy?: Omit<RequestUser, "requestCount">;
}

export interface MediaRequestList {
  integration: {
    id: string;
  };
  medias: MediaRequest[];
}

export interface RequestStats {
  total: number;
  movie: number;
  tv: number;
  pending: number;
  approved: number;
  declined: number;
  processing: number;
  available: number;
}

export interface RequestUser {
  id: number;
  displayName: string;
  avatar: string;
  requestCount: number;
  link: string;
}

export interface MediaRequestStats {
  stats: RequestStats;
  users: RequestUser[];
}

export enum MediaRequestStatus {
  PendingApproval = 1,
  Approved = 2,
  Declined = 3,
  Failed = 4,
  Completed = 5,
}

export enum MediaAvailability {
  Unknown = 1,
  Pending = 2,
  Processing = 3,
  PartiallyAvailable = 4,
  Available = 5,
  Blacklisted = 6,
}
