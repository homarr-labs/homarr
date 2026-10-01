import type { WorkshopSubmission, WorkshopVote } from "@site/src/lib/pocketbase";

import { track } from "@/lib/analytics";

export const downloadSubmissionJson = (submission: WorkshopSubmission) => {
  track("Workshop Item Downloaded", { item_id: submission.id, item_type: submission.type, method: "file" });
  const url = URL.createObjectURL(new Blob([submission.content], { type: "application/json" }));
  Object.assign(document.createElement("a"), {
    href: url,
    download: `${submission.title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}.json`,
  }).click();
  URL.revokeObjectURL(url);
};

interface WorkshopVoteBackend {
  vote(submissionId: string, value: 1 | -1): Promise<WorkshopVote | null>;
  get(submissionId: string): Promise<WorkshopSubmission>;
  listVotesForCurrentUser(): Promise<WorkshopVote[]>;
}

export const voteAndReconcile = async (backend: WorkshopVoteBackend, submissionId: string, value: 1 | -1) => {
  await backend.vote(submissionId, value);
  const [submission, votes] = await Promise.all([backend.get(submissionId), backend.listVotesForCurrentUser()]);
  const cast = votes.find((vote) => vote.submission === submissionId);
  track("Workshop Vote Cast", {
    item_id: submissionId,
    direction: cast ? (cast.value === 1 ? "upvote" : "downvote") : "removed",
  });
  return { submission, votes };
};

export const clampScreenshotIndex = (index: number, screenshotCount: number) =>
  Math.min(Math.max(0, index), Math.max(0, screenshotCount - 1));
