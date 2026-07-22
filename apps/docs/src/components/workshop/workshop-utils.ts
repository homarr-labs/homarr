import type { WorkshopSubmission, WorkshopVote } from "@site/src/lib/pocketbase";

export const downloadSubmissionJson = (submission: WorkshopSubmission) => {
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
  return { submission, votes };
};

export const clampScreenshotIndex = (index: number, screenshotCount: number) =>
  Math.min(Math.max(0, index), Math.max(0, screenshotCount - 1));
