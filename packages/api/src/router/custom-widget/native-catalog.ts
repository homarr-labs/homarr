import { z } from "zod/v4";

const id = z.string().min(1).max(512);
const empty = z.object({});

/** Explicit service contracts; authored code never chooses a procedure path. */
export const nativeCapabilities = {
  "beszel.systems": { kind: "query", integration: "beszel", input: empty },
  "beszel.history": {
    kind: "query",
    integration: "beszel",
    input: z.object({
      systemId: id,
      timePeriod: z.enum(["1m", "1h", "12h", "24h", "1w", "30d"]).default("1h"),
      includeDocker: z.boolean().default(true),
    }),
  },
  "beszel.alerts": {
    kind: "query",
    integration: "beszel",
    input: z.object({
      includeHistory: z.boolean().default(true),
      maxHistoryItems: z.number().int().min(1).max(100).default(10),
    }),
  },
  "beszel.live": { kind: "query", integration: "beszel", input: z.object({ systemId: id }) },
  "calendar.events": {
    kind: "query",
    integration: "calendar",
    input: z.object({
      year: z.number().int().min(1970).max(9999),
      month: z.number().int().min(1).max(12),
      releaseType: z
        .array(z.enum(["inCinemas", "digitalRelease", "physicalRelease"]))
        .default(["inCinemas", "digitalRelease", "physicalRelease"]),
      showUnmonitored: z.boolean().default(false),
    }),
  },
  "media.requests": {
    kind: "query",
    integration: "mediaRequest",
    input: z.object({
      statuses: z
        .array(z.enum(["approved", "completed", "declined", "failed", "pending"]))
        .min(1)
        .default(["pending", "approved", "declined", "failed", "completed"]),
      recentDays: z.number().int().min(0).max(365).default(30),
    }),
  },
  "media.stats": { kind: "query", integration: "mediaRequest", input: empty },
  "media.respond": {
    kind: "action",
    integration: "mediaRequest",
    input: z.object({ requestId: z.number().int(), answer: z.enum(["approve", "decline"]) }),
  },
  "smartHome.state": { kind: "query", integration: "homeAssistant", input: z.object({ entityId: id }) },
  "smartHome.details": { kind: "query", integration: "homeAssistant", input: z.object({ entityId: id }) },
  "smartHome.switch": { kind: "action", integration: "homeAssistant", input: z.object({ entityId: id }) },
  "smartHome.automation": { kind: "action", integration: "homeAssistant", input: z.object({ automationId: id }) },
  "docker.containers": {
    kind: "query",
    integration: null,
    input: z.object({ endpointIds: z.array(id).max(100).optional() }),
  },
  "docker.start": { kind: "action", integration: null, input: z.object({ endpointId: id, containerId: id }) },
  "docker.stop": { kind: "action", integration: null, input: z.object({ endpointId: id, containerId: id }) },
  "docker.restart": { kind: "action", integration: null, input: z.object({ endpointId: id, containerId: id }) },
} as const;

export type NativeCapabilityId = keyof typeof nativeCapabilities;
export function isNativeCapabilityId(value: string): value is NativeCapabilityId {
  return Object.hasOwn(nativeCapabilities, value);
}
