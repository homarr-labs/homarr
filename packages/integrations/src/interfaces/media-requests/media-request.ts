export interface MediaRequest {
  id: number;
  name: string;
  type: 'movie' | 'tv';
  backdropImageUrl: string;
  posterImagePath: string;
  href: string;
  createdAt: Date;
  airDate: Date;
  status: MediaRequestStatus;
  availability: MediaAvailability;
  requestedBy?: RequestUser;
}

export interface RequestUser {
  id: number;
  username: string;
  profilePictureUrl: string;
  link: string;
}

export enum MediaRequestStatus {
  PendingApproval = 1,
  Approved = 2,
  Declined = 3,
}

export enum MediaAvailability {
  Unknown = 1,
  Pending = 2,
  Processing = 3,
  PartiallyAvailable = 4,
  Available = 5,
}
