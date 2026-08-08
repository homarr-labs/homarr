import { describe, expect, it, vi } from "vitest";

import type { WorkshopSubmission, WorkshopVote } from "@site/src/lib/pocketbase";

import { clampScreenshotIndex, voteAndReconcile } from "./workshop-utils";

describe("Workshop state reconciliation", () => {
  it("reloads both the submission counts and authenticated vote after voting", async () => {
    const submission = { id: "submission-1", upvotes: 8, downvotes: 2 } as WorkshopSubmission;
    const vote = { id: "vote-1", submission: "submission-1", value: 1 } as WorkshopVote;
    const backend = {
      vote: vi.fn().mockResolvedValue(vote),
      get: vi.fn().mockResolvedValue(submission),
      listVotesForCurrentUser: vi.fn().mockResolvedValue([vote]),
    };

    await expect(voteAndReconcile(backend, submission.id, 1)).resolves.toEqual({ submission, votes: [vote] });
    expect(backend.vote).toHaveBeenCalledWith(submission.id, 1);
    expect(backend.get).toHaveBeenCalledWith(submission.id);
    expect(backend.listVotesForCurrentUser).toHaveBeenCalledOnce();
  });

  it("clamps a selected screenshot when the gallery shrinks", () => {
    expect(clampScreenshotIndex(3, 2)).toBe(1);
    expect(clampScreenshotIndex(2, 0)).toBe(0);
  });
});
