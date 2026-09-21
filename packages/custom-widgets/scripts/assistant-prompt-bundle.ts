import { createHash } from "node:crypto";

interface AssistantPromptBundleProvenance {
  repository?: string;
  ref?: string;
  commit?: string;
  sourceFile?: string;
}

interface AssistantPromptBundleHashes {
  stagingInstructionSha256?: string;
  assistantPolicySha256?: string;
  bundleSha256?: string;
}

export interface AssistantPromptBundleFile {
  $schema?: string;
  schemaVersion: 1;
  id?: string;
  provenance?: AssistantPromptBundleProvenance;
  stagingInstruction: string;
  assistantPolicy: string;
  hashes?: AssistantPromptBundleHashes;
}

const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

export const getAssistantPromptBundleHash = (bundle: { stagingInstruction: string; assistantPolicy: string }) =>
  sha256(
    JSON.stringify({
      stagingInstruction: bundle.stagingInstruction,
      assistantPolicy: bundle.assistantPolicy,
    }),
  );

const requireNonEmptyString = (value: unknown, field: string) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Assistant prompt bundle field '${field}' must be a non-empty string`);
  }
  return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseOptionalStringRecord = (value: unknown, field: string) => {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error(`Assistant prompt bundle field '${field}' must be an object`);
  for (const [name, entry] of Object.entries(value)) {
    if (typeof entry !== "string") {
      throw new Error(`Assistant prompt bundle field '${field}.${name}' must be a string`);
    }
  }
  return value as Record<string, string>;
};

export function parseAssistantPromptBundle(value: unknown): AssistantPromptBundleFile {
  if (!isRecord(value)) {
    throw new Error("The assistant prompt bundle must be a JSON object");
  }
  const input = value;
  if (input.schemaVersion !== 1) throw new Error("The assistant prompt bundle schemaVersion must be 1");
  const stagingInstruction = requireNonEmptyString(input.stagingInstruction, "stagingInstruction");
  const assistantPolicy = requireNonEmptyString(input.assistantPolicy, "assistantPolicy");
  const provenance = parseOptionalStringRecord(input.provenance, "provenance");
  const hashes = parseOptionalStringRecord(input.hashes, "hashes");
  if (input.id !== undefined) requireNonEmptyString(input.id, "id");
  const actualHashes = {
    stagingInstructionSha256: sha256(stagingInstruction),
    assistantPolicySha256: sha256(assistantPolicy),
    bundleSha256: getAssistantPromptBundleHash({ stagingInstruction, assistantPolicy }),
  };
  for (const [name, expected] of Object.entries(hashes ?? {})) {
    if (!(name in actualHashes)) continue;
    const actual = actualHashes[name as keyof typeof actualHashes];
    if (expected !== actual) throw new Error(`Assistant prompt bundle hash '${name}' does not match its content`);
  }
  return Object.freeze({
    ...(typeof input.$schema === "string" ? { $schema: input.$schema } : {}),
    schemaVersion: 1 as const,
    ...(typeof input.id === "string" ? { id: input.id } : {}),
    ...(provenance ? { provenance: Object.freeze({ ...provenance }) } : {}),
    stagingInstruction,
    assistantPolicy,
    ...(hashes ? { hashes: Object.freeze({ ...hashes }) } : {}),
  });
}

export function createAssistantPromptBundleSnapshot(args: {
  bundle: Pick<AssistantPromptBundleFile, "id" | "provenance" | "stagingInstruction" | "assistantPolicy">;
  source: "built-in" | "candidate-policy-file" | "candidate-bundle-file";
  sourceFile: string | null;
}) {
  const stagingInstruction = Object.freeze({
    text: args.bundle.stagingInstruction,
    sha256: sha256(args.bundle.stagingInstruction),
  });
  const assistantPolicy = Object.freeze({
    text: args.bundle.assistantPolicy,
    sha256: sha256(args.bundle.assistantPolicy),
  });
  const provenance = args.bundle.provenance ? Object.freeze({ ...args.bundle.provenance }) : null;
  return Object.freeze({
    source: args.source,
    sourceFile: args.sourceFile,
    id: args.bundle.id ?? null,
    provenance,
    stagingInstruction,
    assistantPolicy,
    sha256: getAssistantPromptBundleHash(args.bundle),
  });
}
