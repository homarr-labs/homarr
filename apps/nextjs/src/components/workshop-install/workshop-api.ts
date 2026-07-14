export const WORKSHOP_API_URL = process.env.NEXT_PUBLIC_WORKSHOP_API_URL || "https://workshop.homarr.dev";

export interface WorkshopSubmission {
  id: string;
  collectionId: string;
  collectionName: string;
  type: "css" | "widget";
  title: string;
  description: string;
  schemaVersion: string;
  content: string;
  screenshots: string[];
  upvotes: number;
  downvotes: number;
  version: number;
  author: string;
  authorName: string;
  commentCount: number;
  created: string;
}

interface PBListResponse {
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
  items: WorkshopSubmission[];
}

export const getWorkshopFileUrl = (submission: WorkshopSubmission, filename: string) =>
  `${WORKSHOP_API_URL}/api/files/submissions/${submission.id}/${encodeURIComponent(filename)}`;

export const fetchWorkshopSubmissions = async (
  type: "css" | "widget",
  page = 1,
  perPage = 50,
): Promise<PBListResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
    sort: "-upvotes",
    filter: `(type='${type}')`,
  });
  const response = await fetch(`${WORKSHOP_API_URL}/api/collections/marketplace/records?${params}`);
  if (!response.ok) throw new Error(`Workshop request failed (${response.status})`);
  return response.json() as Promise<PBListResponse>;
};
