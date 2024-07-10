export interface MediaRequest {
  name: string;
  type: 'movie' | 'tv';
  backdropImageUrl: string;
  posterImagePath: string;
  href: string;
  createdAt: Date;
  status: MediaRequestStatus;
  requestedBy?: {
    id: number;
    username?: string;
    profilePictureUrl: string;
    link: string;
  }
}

export enum MediaRequestStatus {
  PendingApproval = 1,
  Approved = 2,
  Declined = 3,
}
