import { z } from "zod/v4";

import { customJsxRequestSchema, customWidgetSecretKinds, customWidgetSourceSchema } from "../core";
import type { CustomJsxRequest, CustomWidgetSource } from "../core";
import { CustomWidgetDomainError } from "./errors";

const SESSION_TTL_MS = 10 * 60_000;
const MAX_JOURNAL_ENTRIES = 50;

const encryptedSecretSchema = z.object({
  sourceId: z.string(),
  kind: z.enum(customWidgetSecretKinds),
  value: z.string(),
});

const sessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  expiresAt: z.number(),
  sources: z.array(customWidgetSourceSchema),
  secrets: z.array(encryptedSecretSchema),
  requests: z.array(customJsxRequestSchema),
  name: z.string(),
  template: z.string(),
  optionsSchema: z.record(z.string(), z.unknown()),
  defaultOptions: z.record(z.string(), z.unknown()),
  definitionId: z.string().optional(),
  liveActions: z.boolean(),
});
export type CustomWidgetPreviewSession = z.infer<typeof sessionSchema>;

const journalEntrySchema = z.object({
  id: z.string(),
  requestId: z.string(),
  kind: z.enum(["query", "action"]),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  pathTemplate: z.string(),
  status: z.number().nullable(),
  durationMs: z.number().nonnegative(),
  simulated: z.boolean(),
  timestamp: z.number(),
});
export type CustomWidgetPreviewJournalEntry = z.infer<typeof journalEntrySchema>;

export interface CreatePreviewSessionInput {
  userId: string;
  sources: CustomWidgetSource[];
  secrets: Array<{ sourceId: string; kind: (typeof customWidgetSecretKinds)[number]; value: string }>;
  requests: CustomJsxRequest[];
  name: string;
  template: string;
  optionsSchema: Record<string, unknown>;
  defaultOptions: Record<string, unknown>;
  definitionId?: string;
}

export interface PreviewSessionStore {
  saveSession(id: string, value: unknown, ttlMs: number): Promise<void>;
  getSession(id: string): Promise<unknown>;
  deleteSession(id: string): Promise<void>;
  appendJournal(id: string, value: unknown, maxEntries: number, ttlMs: number): Promise<void>;
  getJournal(id: string, maxEntries: number): Promise<unknown[]>;
}

export interface PreviewSessionServiceOptions {
  createId(): string;
  encrypt(value: string): string;
  decrypt(value: string): string;
  now?: () => number;
  store?: PreviewSessionStore;
}

export class CustomWidgetPreviewSessionService {
  private readonly sessions = new Map<string, CustomWidgetPreviewSession>();
  private readonly journals = new Map<string, CustomWidgetPreviewJournalEntry[]>();
  private readonly now: () => number;

  public constructor(private readonly options: PreviewSessionServiceOptions) {
    this.now = options.now ?? Date.now;
  }

  public async create(input: CreatePreviewSessionInput) {
    const sourceIds = new Set(input.sources.map((source) => source.id));
    if (input.secrets.some((secret) => !sourceIds.has(secret.sourceId))) {
      throw new CustomWidgetDomainError({
        code: "BAD_REQUEST",
        message: "A preview secret references an unknown source",
      });
    }
    const session: CustomWidgetPreviewSession = {
      id: this.options.createId(),
      userId: input.userId,
      expiresAt: this.now() + SESSION_TTL_MS,
      sources: input.sources,
      secrets: input.secrets.map((secret) => ({ ...secret, value: this.options.encrypt(secret.value) })),
      requests: input.requests,
      name: input.name,
      template: input.template,
      optionsSchema: input.optionsSchema,
      defaultOptions: input.defaultOptions,
      definitionId: input.definitionId,
      liveActions: false,
    };
    await this.save(session);
    return { id: session.id, expiresAt: session.expiresAt, liveActions: false as const };
  }

  public async get(id: string, userId: string): Promise<CustomWidgetPreviewSession> {
    const candidate = this.options.store ? await this.options.store.getSession(id) : this.sessions.get(id);
    const parsed = sessionSchema.safeParse(parseStoredValue(candidate));
    if (!parsed.success || parsed.data.userId !== userId || parsed.data.expiresAt <= this.now()) {
      if (this.options.store) await this.options.store.deleteSession(id);
      else this.sessions.delete(id);
      throw new CustomWidgetDomainError({ code: "NOT_FOUND", message: "Preview session expired or was not found" });
    }
    return parsed.data;
  }

  public async setLiveActions(id: string, userId: string, enabled: boolean) {
    const session = { ...(await this.get(id, userId)), liveActions: enabled };
    await this.save(session);
    return { id, expiresAt: session.expiresAt, liveActions: enabled };
  }

  public async appendJournal(
    session: CustomWidgetPreviewSession,
    input: Omit<CustomWidgetPreviewJournalEntry, "id" | "timestamp">,
  ): Promise<void> {
    const value = journalEntrySchema.parse({ ...input, id: this.options.createId(), timestamp: this.now() });
    const ttlMs = Math.max(1, session.expiresAt - this.now());
    if (this.options.store) await this.options.store.appendJournal(session.id, value, MAX_JOURNAL_ENTRIES, ttlMs);
    else this.journals.set(session.id, [value, ...(this.journals.get(session.id) ?? [])].slice(0, MAX_JOURNAL_ENTRIES));
  }

  public async getJournal(id: string, userId: string): Promise<CustomWidgetPreviewJournalEntry[]> {
    await this.get(id, userId);
    const entries = this.options.store
      ? await this.options.store.getJournal(id, MAX_JOURNAL_ENTRIES)
      : (this.journals.get(id) ?? []);
    return entries.flatMap((entry) => {
      const parsed = journalEntrySchema.safeParse(parseStoredValue(entry));
      return parsed.success ? [parsed.data] : [];
    });
  }

  public getSecrets(session: CustomWidgetPreviewSession, sourceId: string) {
    return session.secrets
      .filter((secret) => secret.sourceId === sourceId)
      .map((secret) => ({ kind: secret.kind, value: this.options.decrypt(secret.value) }));
  }

  public async setSecrets(
    id: string,
    userId: string,
    secrets: Array<{ sourceId: string; kind: (typeof customWidgetSecretKinds)[number]; value: string }>,
  ) {
    const session = await this.get(id, userId);
    const sourceIds = new Set(session.sources.map((source) => source.id));
    if (secrets.some((secret) => !sourceIds.has(secret.sourceId))) {
      throw new CustomWidgetDomainError({
        code: "BAD_REQUEST",
        message: "A preview secret references an unknown source",
      });
    }
    const replacements = new Set(secrets.map((secret) => `${secret.sourceId}:${secret.kind}`));
    const next = {
      ...session,
      secrets: [
        ...session.secrets.filter((secret) => !replacements.has(`${secret.sourceId}:${secret.kind}`)),
        ...secrets.map((secret) => ({ ...secret, value: this.options.encrypt(secret.value) })),
      ],
    };
    await this.save(next);
    return { id, expiresAt: next.expiresAt };
  }

  private async save(session: CustomWidgetPreviewSession): Promise<void> {
    const ttlMs = Math.max(0, session.expiresAt - this.now());
    if (!ttlMs) throw new CustomWidgetDomainError({ code: "NOT_FOUND", message: "Preview session expired" });
    if (this.options.store) await this.options.store.saveSession(session.id, session, ttlMs);
    else this.sessions.set(session.id, session);
  }
}

function parseStoredValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
