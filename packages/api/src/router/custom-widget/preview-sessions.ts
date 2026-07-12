import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { decryptSecret, encryptSecret } from "@homarr/common/server";
import { createRedisClient } from "@homarr/core/infrastructure/redis";
import type { RedisClient } from "@homarr/core/infrastructure/redis";
import {
  customJsxNetworkScopes,
  customJsxRequestSchema,
  customWidgetAuthTypes,
  customWidgetSecretKinds,
} from "@homarr/validation/custom-widget";
import type { CustomJsxNetworkScope, CustomJsxRequest, CustomWidgetAuthType } from "@homarr/validation/custom-widget";

const PREVIEW_SESSION_TTL_MS = 5 * 60_000;
const PREVIEW_SESSION_PREFIX = "custom-widget:preview-session:";
const PREVIEW_JOURNAL_PREFIX = "custom-widget:preview-journal:";
const MAX_PREVIEW_JOURNAL_ENTRIES = 50;

const storedPreviewSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  expiresAt: z.number(),
  baseUrl: z.string(),
  authType: z.enum(customWidgetAuthTypes),
  headerName: z.string().nullable(),
  secrets: z.array(z.object({ kind: z.enum(customWidgetSecretKinds), value: z.string() })),
  networkScope: z.enum(customJsxNetworkScopes),
  requests: z.array(customJsxRequestSchema),
  definitionId: z.string().optional(),
  liveActions: z.boolean(),
});

export type CustomWidgetPreviewSession = z.infer<typeof storedPreviewSessionSchema>;

const previewJournalEntrySchema = z.object({
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
export type CustomWidgetPreviewJournalEntry = z.infer<typeof previewJournalEntrySchema>;

export interface CreatePreviewSessionInput {
  userId: string;
  baseUrl: string;
  authType: CustomWidgetAuthType;
  headerName?: string;
  secrets: Array<{ kind: (typeof customWidgetSecretKinds)[number]; value: string }>;
  networkScope: CustomJsxNetworkScope;
  requests: CustomJsxRequest[];
  definitionId?: string;
}

let redisClient: RedisClient | null | undefined;
const localSessions = new Map<string, CustomWidgetPreviewSession>();
const localJournals = new Map<string, CustomWidgetPreviewJournalEntry[]>();

const getRedisClient = () => {
  if (process.env.CI !== undefined || process.env.NODE_ENV === "test") return null;
  redisClient ??= createRedisClient();
  return redisClient;
};

const sessionKey = (id: string) => `${PREVIEW_SESSION_PREFIX}${id}`;
const journalKey = (id: string) => `${PREVIEW_JOURNAL_PREFIX}${id}`;

const saveSession = async (session: CustomWidgetPreviewSession) => {
  const ttlMs = Math.max(0, session.expiresAt - Date.now());
  if (ttlMs === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Preview session expired" });
  const redis = getRedisClient();
  if (!redis) {
    localSessions.set(session.id, session);
    return;
  }
  await redis.set(sessionKey(session.id), JSON.stringify(session), "PX", ttlMs);
};

export const createPreviewSession = async (input: CreatePreviewSessionInput) => {
  const session: CustomWidgetPreviewSession = {
    id: createId(),
    userId: input.userId,
    expiresAt: Date.now() + PREVIEW_SESSION_TTL_MS,
    baseUrl: input.baseUrl,
    authType: input.authType,
    headerName: input.headerName ?? null,
    secrets: input.secrets.map((secret) => ({ kind: secret.kind, value: encryptSecret(secret.value) })),
    networkScope: input.networkScope,
    requests: input.requests,
    definitionId: input.definitionId,
    liveActions: false,
  };
  await saveSession(session);
  return { id: session.id, expiresAt: session.expiresAt, liveActions: false as const };
};

export const getPreviewSession = async (id: string, userId: string): Promise<CustomWidgetPreviewSession> => {
  const redis = getRedisClient();
  const raw = redis ? await redis.get(sessionKey(id)) : localSessions.get(id);
  let candidate: unknown = raw;
  if (typeof raw === "string") {
    try {
      candidate = JSON.parse(raw) as unknown;
    } catch {
      candidate = null;
    }
  }
  const parsed = storedPreviewSessionSchema.safeParse(candidate);
  if (!parsed.success || parsed.data.userId !== userId || parsed.data.expiresAt <= Date.now()) {
    if (!redis) localSessions.delete(id);
    throw new TRPCError({ code: "NOT_FOUND", message: "Preview session expired or was not found" });
  }
  return parsed.data;
};

export const setPreviewSessionLiveActions = async (id: string, userId: string, enabled: boolean) => {
  const session = await getPreviewSession(id, userId);
  const updated = { ...session, liveActions: enabled };
  await saveSession(updated);
  return { id, expiresAt: updated.expiresAt, liveActions: enabled };
};

export const appendPreviewJournal = async (
  session: CustomWidgetPreviewSession,
  entry: Omit<CustomWidgetPreviewJournalEntry, "id" | "timestamp">,
) => {
  const value = previewJournalEntrySchema.parse({ ...entry, id: createId(), timestamp: Date.now() });
  const redis = getRedisClient();
  if (!redis) {
    localJournals.set(
      session.id,
      [value, ...(localJournals.get(session.id) ?? [])].slice(0, MAX_PREVIEW_JOURNAL_ENTRIES),
    );
    return;
  }
  const ttlMs = Math.max(1, session.expiresAt - Date.now());
  await redis
    .multi()
    .lpush(journalKey(session.id), JSON.stringify(value))
    .ltrim(journalKey(session.id), 0, MAX_PREVIEW_JOURNAL_ENTRIES - 1)
    .pexpire(journalKey(session.id), ttlMs)
    .exec();
};

export const getPreviewJournal = async (id: string, userId: string) => {
  await getPreviewSession(id, userId);
  const redis = getRedisClient();
  const entries = redis
    ? await redis.lrange(journalKey(id), 0, MAX_PREVIEW_JOURNAL_ENTRIES - 1)
    : (localJournals.get(id) ?? []);
  return entries.flatMap((entry) => {
    let candidate: unknown = entry;
    if (typeof entry === "string") {
      try {
        candidate = JSON.parse(entry) as unknown;
      } catch {
        return [];
      }
    }
    const parsed = previewJournalEntrySchema.safeParse(candidate);
    return parsed.success ? [parsed.data] : [];
  });
};

export const getPreviewSessionSecrets = (session: CustomWidgetPreviewSession) =>
  session.secrets.map((secret) => ({
    kind: secret.kind,
    value: decryptSecret(secret.value as `${string}.${string}`),
  }));
