import PocketBase from "pocketbase";

import { workshopSubmissionSummarySchema, type WorkshopSubmissionSummary } from "@homarr/workshop/schema";

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
  `${baseUrl}/api/files/submissions/${submissionId}/${encodeURIComponent(filename)}`;

export const signInWithGitHub = async (pb: PocketBase) => {
  const auth = await pb.collection("users").authWithOAuth2({
    provider: "github",
    createData: { displayName: "GitHub user" },
  });
  const meta = auth.meta as Record<string, unknown>;
  const rawUser = meta.rawUser && typeof meta.rawUser === "object" ? (meta.rawUser as Record<string, unknown>) : {};
  const githubUsername = String(meta.username || rawUser.login || "");
  const displayName = String(meta.name || rawUser.name || githubUsername || "GitHub user").slice(0, 100);
  const avatarUrl = String(meta.avatarUrl || meta.avatarURL || rawUser.avatar_url || "");
  const updated = await pb.collection("users").update(auth.record.id, {
    displayName,
    avatarUrl: avatarUrl.startsWith("https://") ? avatarUrl : "",
    githubUsername,
    githubProfileUrl: githubUsername ? `https://github.com/${encodeURIComponent(githubUsername)}` : "",
  });
  pb.authStore.save(auth.token, updated);
  return updated;
};

export type WorkshopSubmission = WorkshopSubmissionSummary & {
  collectionId?: string;
  collectionName?: string;
  content: string;
};

export const parseWorkshopSubmission = (value: unknown): WorkshopSubmission | null => {
  const result = workshopSubmissionSummarySchema.safeParse(value);
  if (!result.success) return null;
  const record = value as Record<string, unknown>;
  return {
    ...result.data,
    collectionId: typeof record.collectionId === "string" ? record.collectionId : undefined,
    collectionName: typeof record.collectionName === "string" ? record.collectionName : undefined,
    content: typeof record.content === "string" ? record.content : "",
  };
};

export interface WorkshopVote {
  id: string;
  submission: string;
  user: string;
  value: 1 | -1;
}

export interface WorkshopComment {
  id: string;
  submission: string;
  author: string;
  content: string;
  created: string;
  updated: string;
  expand?: {
    author?: {
      id: string;
      displayName?: string;
      avatarUrl?: string;
      githubUsername?: string;
      githubProfileUrl?: string;
      isAdmin?: boolean;
    };
  };
}
