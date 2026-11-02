import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";

const executeFile = promisify(execFile);

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export interface ObservedModel {
  messageId: string;
  providerID: string;
  id: string;
  variant: string;
}

export interface SessionEvidence {
  sessionId: string;
  source: "opencode-v2-api";
  responseHashes: { path: string; sha256: string }[];
  observedModels: ObservedModel[];
  issues: string[];
}

export function inspectAssistantModels(value: unknown): { models: ObservedModel[]; issues: string[] } {
  const models: ObservedModel[] = [];
  const issues: string[] = [];
  if (!record(value) || !Array.isArray(value.data)) return { models, issues: ["Missing assistant message metadata"] };
  for (const entry of value.data) {
    if (
      !record(entry) ||
      entry.type !== "assistant" ||
      typeof entry.id !== "string" ||
      !record(entry.model) ||
      typeof entry.model.providerID !== "string" ||
      typeof entry.model.id !== "string" ||
      typeof entry.model.variant !== "string"
    ) {
      issues.push("Incomplete assistant model metadata");
      continue;
    }
    const observed = {
      messageId: entry.id,
      providerID: entry.model.providerID,
      id: entry.model.id,
      variant: entry.model.variant,
    };
    models.push(observed);
    if (observed.providerID !== "openai" || observed.id !== "gpt-6.1-sol" || observed.variant !== "medium")
      issues.push("Observed assistant model does not match the frozen condition");
  }
  return { models, issues };
}

export async function observeSession(sessionId: string): Promise<SessionEvidence> {
  const evidence: SessionEvidence = {
    sessionId,
    source: "opencode-v2-api",
    responseHashes: [],
    observedModels: [],
    issues: [],
  };
  if (!/^ses_[A-Za-z0-9]+$/u.test(sessionId)) return { ...evidence, issues: ["Invalid session identifier"] };
  async function request(path: string): Promise<unknown> {
    const { stdout } = await executeFile("opencode", ["api", "get", path], {
      timeout: 60_000,
      maxBuffer: 32 * 1024 * 1024,
    });
    evidence.responseHashes.push({ path, sha256: createHash("sha256").update(stdout).digest("hex") });
    const value: unknown = JSON.parse(stdout);
    return value;
  }
  try {
    const session = await request(`/api/session/${sessionId}`);
    if (!record(session) || !record(session.data) || session.data.id !== sessionId)
      evidence.issues.push("Server session binding could not be verified");
    let path = `/api/session/${sessionId}/message?type=assistant&order=asc&limit=100`;
    const cursors = new Set<string>();
    for (;;) {
      const page = await request(path);
      const inspected = inspectAssistantModels(page);
      evidence.observedModels.push(...inspected.models);
      evidence.issues.push(...inspected.issues);
      if (!record(page) || !Array.isArray(page.data) || page.data.length === 0) break;
      if (!record(page.cursor) || typeof page.cursor.next !== "string") break;
      if (cursors.has(page.cursor.next)) throw new Error("Repeated metadata cursor");
      cursors.add(page.cursor.next);
      path = `/api/session/${sessionId}/message?type=assistant&limit=100&cursor=${encodeURIComponent(page.cursor.next)}`;
    }
    if (evidence.observedModels.length === 0) evidence.issues.push("No observed assistant model metadata");
  } catch {
    evidence.issues.push("OpenCode server metadata verification failed");
  }
  return evidence;
}
