import { z } from "zod/v4";

import type { ArenaCandidate, ArenaCase, ArenaMatch, ArenaState, ArenaViewport } from "./_arena-contract";

export interface BlindDataset {
  smoke?: boolean;
  hash: string;
  reviewer: string;
  cases: Pick<
    ArenaCase,
    "id" | "title" | "prompt" | "responses" | "emptyResponses" | "defaultOptions" | "manualParams" | "simulation"
  >[];
  candidates: (Pick<ArenaCandidate, "id" | "caseId" | "status"> & {
    definition: Pick<NonNullable<ArenaCandidate["definition"]>, "template" | "requests"> | null;
  })[];
  matches: ArenaMatch[];
}

export const voteSchema = z
  .object({
    matchId: z.string(),
    leftId: z.string(),
    rightId: z.string(),
    choice: z.enum(["left", "right", "tie", "skip"]),
    state: z.enum(["success", "loading", "error", "empty"]),
    viewport: z.enum(["wide", "narrow"]),
  })
  .strict();

export const reviewSchema = z
  .object({
    version: z.literal(1),
    datasetHash: z.string(),
    sessionId: z.string(),
    revealed: z.boolean(),
    votes: z.array(voteSchema).max(120),
    unavailable: z.array(z.string()).max(120),
  })
  .strict();

export type ArenaVote = z.infer<typeof voteSchema>;
export type ArenaReview = z.infer<typeof reviewSchema>;
export interface ArenaReveal {
  conditions: { id: string; name: string; prompt: string; hash: string; score: number; judgments: number }[];
}

export function validateReview(input: unknown, dataset: BlindDataset): ArenaReview {
  const review = reviewSchema.parse(input);
  if (review.datasetHash !== dataset.hash) throw new Error("This review belongs to another dataset.");
  const seen = new Set<string>();
  if (
    new Set(review.unavailable).size !== review.unavailable.length ||
    review.unavailable.some((id) => !dataset.matches.some((match) => match.id === id))
  )
    throw new Error("Invalid unavailable comparisons.");
  for (const vote of review.votes) {
    const match = dataset.matches.find((entry) => entry.id === vote.matchId);
    if (!match || match.leftId !== vote.leftId || match.rightId !== vote.rightId || seen.has(match.id)) {
      throw new Error("The saved review does not match this schedule.");
    }
    if (
      vote.choice !== "skip" &&
      (review.unavailable.includes(match.id) ||
        [match.leftId, match.rightId].some((id) => {
          const candidate = dataset.candidates.find((entry) => entry.id === id);
          return candidate?.status !== "ready" || !candidate.definition;
        }))
    ) {
      throw new Error("Unavailable comparisons cannot be ranked.");
    }
    seen.add(match.id);
  }
  return review;
}

export function answerableMatches(dataset: BlindDataset, unavailable: string[]) {
  return dataset.matches.filter(
    (match) =>
      !unavailable.includes(match.id) &&
      [match.leftId, match.rightId].every((id) => {
        const candidate = dataset.candidates.find((entry) => entry.id === id);
        return candidate?.status === "ready" && candidate.definition !== null;
      }),
  );
}

export function nextMatch(dataset: BlindDataset, votes: ArenaVote[], unavailable: string[] = []) {
  return answerableMatches(dataset, unavailable).find((match) => !votes.some((vote) => vote.matchId === match.id));
}

export function makeVote(
  match: ArenaMatch,
  choice: ArenaVote["choice"],
  state: ArenaState,
  viewport: ArenaViewport,
): ArenaVote {
  return { matchId: match.id, leftId: match.leftId, rightId: match.rightId, choice, state, viewport };
}
