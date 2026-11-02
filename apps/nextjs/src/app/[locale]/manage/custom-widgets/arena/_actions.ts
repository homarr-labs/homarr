"use server";

import { readArenaDataset } from "./_dataset";
import { validateReview } from "./_review";
import type { ArenaReveal } from "./_review";

export async function revealArena(input: unknown): Promise<ArenaReveal> {
  const { dataset, pack } = await readArenaDataset();
  const review = validateReview(input, dataset);
  if (!review.revealed) throw new Error("Confirm the end of blind collection before revealing.");
  if (dataset.candidates.some(({ status }) => status === "pending"))
    throw new Error("Generation is still in progress.");
  if (pack.conditions.length !== 5) throw new Error("Reveal unavailable.");
  const scores = new Map(pack.conditions.map(({ id }) => [id, { score: 1000, judgments: 0 }]));
  for (const vote of review.votes) {
    if (vote.choice === "skip") continue;
    const left = scores.get(pack.candidateConditions[vote.leftId] ?? "");
    const right = scores.get(pack.candidateConditions[vote.rightId] ?? "");
    if (!left || !right || left === right) throw new Error("Reveal unavailable.");
    let outcome = 0.5;
    if (vote.choice === "left") outcome = 1;
    if (vote.choice === "right") outcome = 0;
    const expected = 1 / (1 + 10 ** ((right.score - left.score) / 400));
    const delta = 32 * (outcome - expected);
    left.score += delta;
    right.score -= delta;
    left.judgments += 1;
    right.judgments += 1;
  }
  return {
    conditions: pack.conditions
      .map(({ id, name, prompt, sha256 }) => {
        const result = scores.get(id);
        if (!result) throw new Error("Reveal unavailable.");
        return { id, name, prompt, hash: sha256, ...result };
      })
      .toSorted((a, b) => b.score - a.score),
  };
}
