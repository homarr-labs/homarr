import { createId } from "@homarr/common";
import { decryptSecret, encryptSecret } from "@homarr/common/server";
import { createRedisClient } from "@homarr/core/infrastructure/redis";
import type { RedisClient } from "@homarr/core/infrastructure/redis";
import { CustomWidgetPreviewSessionService } from "@homarr/custom-widgets/server";
import type {
  CreatePreviewSessionInput,
  CustomWidgetPreviewJournalEntry,
  CustomWidgetPreviewSession,
  PreviewSessionStore,
} from "@homarr/custom-widgets/server";

import { toTrpcError } from "./domain-error";

const SESSION_PREFIX = "custom-widget:preview-session:";
const JOURNAL_PREFIX = "custom-widget:preview-journal:";
const COMPARE_AND_SWAP_SESSION_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if not current then return 0 end
local ok, parsed = pcall(cjson.decode, current)
if not ok or type(parsed) ~= 'table' or tonumber(parsed.revision) ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
return 1
`;

class RedisPreviewSessionStore implements PreviewSessionStore {
  public constructor(private readonly redis: RedisClient) {}

  public async saveSession(id: string, value: unknown, ttlMs: number) {
    await this.redis.set(`${SESSION_PREFIX}${id}`, JSON.stringify(value), "PX", ttlMs);
  }

  public getSession(id: string) {
    return this.redis.get(`${SESSION_PREFIX}${id}`);
  }
  public async compareAndSwapSession(id: string, expectedRevision: number, value: unknown, ttlMs: number) {
    return (
      Number(
        await this.redis.eval(
          COMPARE_AND_SWAP_SESSION_SCRIPT,
          1,
          `${SESSION_PREFIX}${id}`,
          expectedRevision,
          JSON.stringify(value),
          ttlMs,
        ),
      ) === 1
    );
  }
  public async deleteSession(id: string) {
    await this.redis.del(`${SESSION_PREFIX}${id}`);
  }

  public async appendJournal(id: string, value: unknown, maxEntries: number, ttlMs: number) {
    const key = `${JOURNAL_PREFIX}${id}`;
    await this.redis
      .multi()
      .lpush(key, JSON.stringify(value))
      .ltrim(key, 0, maxEntries - 1)
      .pexpire(key, ttlMs)
      .exec();
  }

  public getJournal(id: string, maxEntries: number) {
    return this.redis.lrange(`${JOURNAL_PREFIX}${id}`, 0, maxEntries - 1);
  }
}

let service: CustomWidgetPreviewSessionService | undefined;
function getService() {
  if (service) return service;
  const useLocal = process.env.CI !== undefined || process.env.NODE_ENV === "test";
  service = new CustomWidgetPreviewSessionService({
    createId,
    encrypt: encryptSecret,
    decrypt: (value) => decryptSecret(value as `${string}.${string}`),
    store: useLocal ? undefined : new RedisPreviewSessionStore(createRedisClient()),
  });
  return service;
}

async function call<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    toTrpcError(error);
  }
}

export type { CreatePreviewSessionInput, CustomWidgetPreviewJournalEntry, CustomWidgetPreviewSession };

export const createPreviewSession = (input: CreatePreviewSessionInput) => call(() => getService().create(input));
export const getPreviewSession = (id: string, userId: string) => call(() => getService().get(id, userId));
export const setPreviewSessionLiveActions = (id: string, userId: string, enabled: boolean) =>
  call(() => getService().setLiveActions(id, userId, enabled));
export const appendPreviewJournal = (
  session: CustomWidgetPreviewSession,
  entry: Omit<CustomWidgetPreviewJournalEntry, "id" | "sessionRevision" | "timestamp">,
) => call(() => getService().appendJournal(session, { ...entry, sessionRevision: session.revision }));
export const getPreviewJournal = (id: string, userId: string) => call(() => getService().getJournal(id, userId));
export const getPreviewSessionSecrets = (session: CustomWidgetPreviewSession, sourceId: string) =>
  getService().getSecrets(session, sourceId);
export const setPreviewSessionSecrets = (id: string, userId: string, secrets: CreatePreviewSessionInput["secrets"]) =>
  call(() => getService().setSecrets(id, userId, secrets));
export const configurePreviewSessionSource = (
  id: string,
  userId: string,
  sourceId: string,
  source: CreatePreviewSessionInput["sources"][string],
  secrets: CreatePreviewSessionInput["secrets"],
) => call(() => getService().configureSource(id, userId, sourceId, source, secrets));
