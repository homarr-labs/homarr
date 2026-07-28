import { createId } from "@homarr/common";
import { createRedisClient } from "@homarr/core/infrastructure/redis";
import type { RedisClient } from "@homarr/core/infrastructure/redis";
import type { CustomWidgetSecretKind } from "@homarr/custom-widgets/core";
import type { CustomWidgetSource } from "@homarr/custom-widgets/core";

import { useProcessLocalCustomWidgetState } from "../../custom-widget-state-mode";

const CONFIGURATION_REQUEST_TTL_MS = 10 * 60_000;
const CONFIGURATION_REQUEST_PREFIX = "custom-widget:configuration-request:";
const CONFIGURATION_REQUEST_LOCK_PREFIX = "custom-widget:configuration-request-lock:";

export interface CustomWidgetConfigurationRequest {
  id: string;
  userId: string;
  target: { type: "definition"; id: string } | { type: "preview"; id: string };
  widgetName: string;
  sourceId: string;
  sourceName: string;
  source: CustomWidgetSource;
  kinds: CustomWidgetSecretKind[];
  expiresAt: number;
  status: "pending" | "completed";
}

const localRequests = new Map<string, CustomWidgetConfigurationRequest>();
const localLocks = new Set<string>();
let redis: RedisClient | undefined;

function getRedis() {
  if (useProcessLocalCustomWidgetState()) return undefined;
  redis ??= createRedisClient();
  return redis;
}

async function save(request: CustomWidgetConfigurationRequest) {
  const ttl = Math.max(1, request.expiresAt - Date.now());
  const client = getRedis();
  if (client) await client.set(`${CONFIGURATION_REQUEST_PREFIX}${request.id}`, JSON.stringify(request), "PX", ttl);
  else localRequests.set(request.id, request);
}

export async function createCustomWidgetConfigurationRequest(
  input: Omit<CustomWidgetConfigurationRequest, "id" | "expiresAt" | "status">,
) {
  const request: CustomWidgetConfigurationRequest = {
    ...input,
    id: createId(),
    expiresAt: Date.now() + CONFIGURATION_REQUEST_TTL_MS,
    status: "pending",
  };
  await save(request);
  return request;
}

export async function getCustomWidgetConfigurationRequest(id: string) {
  const client = getRedis();
  const candidate = client ? await client.get(`${CONFIGURATION_REQUEST_PREFIX}${id}`) : localRequests.get(id);
  if (!candidate) return null;
  try {
    const request = (
      typeof candidate === "string" ? JSON.parse(candidate) : candidate
    ) as CustomWidgetConfigurationRequest;
    if (request.expiresAt <= Date.now()) {
      if (client) await client.del(`${CONFIGURATION_REQUEST_PREFIX}${id}`);
      else localRequests.delete(id);
      return null;
    }
    return request;
  } catch {
    return null;
  }
}

export async function getCustomWidgetConfigurationRequestForUser(id: string, userId: string) {
  const request = await getCustomWidgetConfigurationRequest(id);
  return request?.userId === userId ? request : null;
}

export async function completeCustomWidgetConfigurationRequest(id: string) {
  const request = await getCustomWidgetConfigurationRequest(id);
  if (!request || request.status !== "pending") return null;
  const completed = { ...request, status: "completed" as const };
  await save(completed);
  await releaseCustomWidgetConfigurationRequest(id);
  return completed;
}

export async function claimCustomWidgetConfigurationRequest(id: string) {
  const request = await getCustomWidgetConfigurationRequest(id);
  if (!request || request.status !== "pending") return null;
  const client = getRedis();
  if (client) {
    const claimed = await client.set(`${CONFIGURATION_REQUEST_LOCK_PREFIX}${id}`, "1", "PX", 60_000, "NX");
    return claimed === "OK" ? request : null;
  }
  if (localLocks.has(id)) return null;
  localLocks.add(id);
  return request;
}

export async function releaseCustomWidgetConfigurationRequest(id: string) {
  const client = getRedis();
  if (client) await client.del(`${CONFIGURATION_REQUEST_LOCK_PREFIX}${id}`);
  else localLocks.delete(id);
}

export { setPreviewSessionSecrets } from "./preview-sessions";
