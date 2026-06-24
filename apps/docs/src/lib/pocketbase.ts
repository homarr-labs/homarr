import PocketBase from "pocketbase";

let client: PocketBase | undefined;
let clientUrl: string | undefined;

export const getPocketBase = (url: string): PocketBase => {
  if (!client || clientUrl !== url) {
    client = new PocketBase(url);
    clientUrl = url;
  }
  return client;
};

export const getSubmissionFileUrl = (baseUrl: string, submissionId: string, filename: string) =>
  `${baseUrl}/api/files/submissions/${submissionId}/${filename}`;

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
  commentCount: number;
  version: number;
  changelog: string;
  author: string;
  authorName: string;
  created: string;
}

export interface StoreVote {
  id: string;
  submission: string;
  user: string;
  value: 1 | -1;
}

export interface StoreComment {
  id: string;
  submission: string;
  author: string;
  content: string;
  created: string;
  updated: string;
  expand?: { author?: { id: string; name?: string; username?: string } };
}
