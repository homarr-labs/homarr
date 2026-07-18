import { createId } from "@homarr/common";
import { createRedisClient } from "@homarr/core/infrastructure/redis";
import type { RedisClient } from "@homarr/core/infrastructure/redis";
import type { CustomWidgetSecretKind } from "@homarr/custom-widgets/core";

const SECRET_REQUEST_TTL_MS = 10 * 60_000;
const SECRET_REQUEST_PREFIX = "custom-widget:secret-request:";
const SECRET_REQUEST_LOCK_PREFIX = "custom-widget:secret-request-lock:";

export interface CustomWidgetSecretRequest {
  id: string;
  userId: string;
  target: { type: "definition"; id: string } | { type: "preview"; id: string };
  widgetName: string;
  sourceId: string;
  sourceName: string;
  kinds: CustomWidgetSecretKind[];
  expiresAt: number;
  status: "pending" | "completed";
}

const localRequests = new Map<string, CustomWidgetSecretRequest>();
const localLocks = new Set<string>();
let redis: RedisClient | undefined;

function getRedis() {
  if (process.env.CI !== undefined || process.env.NODE_ENV === "test") return undefined;
  redis ??= createRedisClient();
  return redis;
}

async function save(request: CustomWidgetSecretRequest) {
  const ttl = Math.max(1, request.expiresAt - Date.now());
  const client = getRedis();
  if (client) await client.set(`${SECRET_REQUEST_PREFIX}${request.id}`, JSON.stringify(request), "PX", ttl);
  else localRequests.set(request.id, request);
}

export async function createCustomWidgetSecretRequest(
  input: Omit<CustomWidgetSecretRequest, "id" | "expiresAt" | "status">,
) {
  const request: CustomWidgetSecretRequest = {
    ...input,
    id: createId(),
    expiresAt: Date.now() + SECRET_REQUEST_TTL_MS,
    status: "pending",
  };
  await save(request);
  return request;
}

export async function getCustomWidgetSecretRequest(id: string) {
  const client = getRedis();
  const candidate = client ? await client.get(`${SECRET_REQUEST_PREFIX}${id}`) : localRequests.get(id);
  if (!candidate) return null;
  try {
    const request = (typeof candidate === "string" ? JSON.parse(candidate) : candidate) as CustomWidgetSecretRequest;
    if (request.expiresAt <= Date.now()) {
      if (client) await client.del(`${SECRET_REQUEST_PREFIX}${id}`);
      else localRequests.delete(id);
      return null;
    }
    return request;
  } catch {
    return null;
  }
}

export async function getCustomWidgetSecretRequestForUser(id: string, userId: string) {
  const request = await getCustomWidgetSecretRequest(id);
  return request?.userId === userId ? request : null;
}

export async function completeCustomWidgetSecretRequest(id: string) {
  const request = await getCustomWidgetSecretRequest(id);
  if (!request || request.status !== "pending") return null;
  const completed = { ...request, status: "completed" as const };
  await save(completed);
  await releaseCustomWidgetSecretRequest(id);
  return completed;
}

export async function claimCustomWidgetSecretRequest(id: string) {
  const request = await getCustomWidgetSecretRequest(id);
  if (!request || request.status !== "pending") return null;
  const client = getRedis();
  if (client) {
    const claimed = await client.set(`${SECRET_REQUEST_LOCK_PREFIX}${id}`, "1", "PX", 60_000, "NX");
    return claimed === "OK" ? request : null;
  }
  if (localLocks.has(id)) return null;
  localLocks.add(id);
  return request;
}

export async function releaseCustomWidgetSecretRequest(id: string) {
  const client = getRedis();
  if (client) await client.del(`${SECRET_REQUEST_LOCK_PREFIX}${id}`);
  else localLocks.delete(id);
}

export { setPreviewSessionSecrets } from "./preview-sessions";
