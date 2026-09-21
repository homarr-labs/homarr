import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createAssistantPromptBundleSnapshot, parseAssistantPromptBundle } from "../../scripts/assistant-prompt-bundle";
import { buildAssistantEvaluationSystemPrompt } from "../../scripts/ai-assistant-evaluation";

const baselineUrl = new URL(
  "../../scripts/prompt-baselines/release-v2-c6da4a4366fa852e8aae67fea7137a21bae7538b.json",
  import.meta.url,
);

describe("assistant prompt bundles", () => {
  it("pins the exact release/v2 staging and policy constants with immutable provenance", () => {
    const bundle = parseAssistantPromptBundle(JSON.parse(readFileSync(baselineUrl, "utf8")) as unknown);
    const snapshot = createAssistantPromptBundleSnapshot({
      bundle,
      source: "candidate-bundle-file",
      sourceFile: "scripts/prompt-baselines/release-v2.json",
    });

    expect(snapshot).toMatchObject({
      id: "release-v2-c6da4a4366fa852e8aae67fea7137a21bae7538b",
      provenance: {
        repository: "homarr-labs/homarr",
        ref: "release/v2",
        commit: "c6da4a4366fa852e8aae67fea7137a21bae7538b",
        sourceFile: "packages/custom-widgets/src/core/ai-prompt.ts",
      },
      stagingInstruction: {
        sha256: "c7a2d3b65836e46d63fdc44a5ba5b4eb5aa8becc4b53c2cb4d35142c6d0db27e",
      },
      assistantPolicy: {
        sha256: "433c928714d06f3c09bf25b7219ca2710a34b3f4652f0e4999bc8de481978b5b",
      },
      sha256: "203482d847485d6974439177805c7be27f04b7b33dc5b2bd4443317942d1f699",
    });
    expect(snapshot.stagingInstruction.text).toHaveLength(174);
    expect(snapshot.assistantPolicy.text).toHaveLength(3_978);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.provenance)).toBe(true);
  });

  it("uses the bundle staging instruction instead of the current built-in staging", () => {
    const prompt = buildAssistantEvaluationSystemPrompt("Candidate policy", 2, "Candidate staging");

    expect(prompt.startsWith("Candidate staging\n\nCandidate policy")).toBe(true);
    expect(prompt).toContain("all 2 requested widget jobs");
  });

  it("rejects a bundle when declared hashes no longer match its content", () => {
    expect(() =>
      parseAssistantPromptBundle({
        schemaVersion: 1,
        stagingInstruction: "Changed staging",
        assistantPolicy: "Policy",
        hashes: { bundleSha256: "stale" },
      }),
    ).toThrow("bundleSha256");
  });
});
