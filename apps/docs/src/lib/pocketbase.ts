import { WorkshopBackend, type TypedWorkshopPocketBase } from "@homarr/workshop/backend";
import type { WorkshopSubmissionSummary } from "@homarr/workshop/schema";

export type { WorkshopComment, WorkshopVote } from "@homarr/workshop/schema";

const backends = new Map<string, WorkshopBackend>();

export const getWorkshopBackend = (url: string): WorkshopBackend => {
  const normalizedUrl = url.replace(/\/$/u, "");
  const existing = backends.get(normalizedUrl);
  if (existing) return existing;
  const backend = new WorkshopBackend(normalizedUrl);
  backends.set(normalizedUrl, backend);
  return backend;
};

export const getPocketBase = (url: string): TypedWorkshopPocketBase => getWorkshopBackend(url).pocketBase;

export type WorkshopSubmission = WorkshopSubmissionSummary & {
  content: string;
};
