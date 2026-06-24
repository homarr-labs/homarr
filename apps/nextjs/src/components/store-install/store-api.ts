export const STORE_URL = process.env.NEXT_PUBLIC_WIDGET_STORE_URL || "https://store.homarr.dev";

export interface StoreSubmission {
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
  items: StoreSubmission[];
}

export const getStoreFileUrl = (submission: StoreSubmission, filename: string) =>
  `${STORE_URL}/api/files/submissions/${submission.id}/${filename}`;

export const fetchStoreSubmissions = async (
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
  const response = await fetch(`${STORE_URL}/api/collections/marketplace/records?${params}`);
  if (!response.ok) throw new Error(`Store request failed (${response.status})`);
  return response.json() as Promise<PBListResponse>;
};
