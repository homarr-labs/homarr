import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import dayjs from "dayjs";
import WebSocket from "ws";
import type { RawData } from "ws";
import { z } from "zod/v4";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createWidgetOptionsChannel } from "@homarr/redis";

import { createCachedRequestHandler } from "./lib/cached-request-handler";

const SOCKJS_SNAPSHOT_TIMEOUT_MS = 2500;

export interface ArchiveTeamWarriorItem {
  id: string;
  name: string;
  status: "running" | "completed" | "failed" | "canceled" | "unknown";
  project?: string | null;
  startTime?: number;
}

export interface ArchiveTeamWarriorBandwidth {
  received?: number;
  sent?: number;
  receiving?: number;
  sending?: number;
  session_id?: string;
}

export interface ArchiveTeamWarriorProject {
  id?: string;
  title: string;
}

export interface ArchiveTeamWarriorStatus {
  status: string;
  runnerStatus?: string;
  project?: ArchiveTeamWarriorProject | null;
  selectedProject: string | null;
  broadcastMessage: string | null;
  bandwidth?: ArchiveTeamWarriorBandwidth | null;
  items: ArchiveTeamWarriorItem[];
  counts: { running: number; completed: number; failed: number; canceled: number };
  updatedAt: string;
}

interface WarriorSnapshotState {
  status: string;
  runnerStatus?: string;
  selectedProject: string | null;
  broadcastMessage: string | null;
  project: ArchiveTeamWarriorStatus["project"];
  bandwidth: ArchiveTeamWarriorStatus["bandwidth"];
  items: Map<string, ArchiveTeamWarriorItem>;
}

export const archiveTeamWarriorRequestHandler = {
  handler: (itemOptions: { url: string }) =>
    createCachedRequestHandler<ArchiveTeamWarriorStatus, { url: string }>({
      async requestAsync(input) {
        return await getStatusAsync(input.url);
      },
      cacheDuration: dayjs.duration(5, "minute"),
      queryKey: "archiveTeamWarriorStatus",
      createRedisChannel(input, handlerOptions) {
        return createWidgetOptionsChannel<ArchiveTeamWarriorStatus>(
          "archiveTeamWarrior",
          handlerOptions.queryKey,
          input,
        );
      },
    }).handler(itemOptions),
};

const getStatusAsync = async (url: string): Promise<ArchiveTeamWarriorStatus> => {
  const baseUrl = url.replace(/\/$/, "");
  await fetchWithTrustedCertificatesAsync(`${baseUrl}/index.html`);
  return await readSockJsSnapshotAsync(baseUrl);
};

const readSockJsSnapshotAsync = async (baseUrl: string): Promise<ArchiveTeamWarriorStatus> => {
  const snapshot: WarriorSnapshotState = {
    status: "Unknown",
    selectedProject: null,
    broadcastMessage: null,
    project: null,
    bandwidth: null,
    items: new Map<string, ArchiveTeamWarriorItem>(),
  };

  await new Promise<void>((resolve, reject) => {
    let isSettled = false;
    const socket = new WebSocket(createSockJsWebSocketUrl(baseUrl));

    const finish = () => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timeout);
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close();
      resolve();
    };

    const fail = () => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timeout);
      reject(new Error("Failed to connect to ArchiveTeam Warrior websocket"));
    };

    const timeout = setTimeout(finish, SOCKJS_SNAPSHOT_TIMEOUT_MS);
    socket.on("message", (data: RawData) => {
      for (const frame of parseSockJsMessage(decodeWebSocketData(data))) {
        applyFrameToSnapshot(frame, snapshot);
      }
    });
    socket.on("error", fail);
    socket.on("close", finish);
  });

  return createStatusFromSnapshot(snapshot);
};

const applyFrameToSnapshot = (frame: SeesawFrame, snapshot: WarriorSnapshotState) => {
  switch (frame.event_name) {
    case "warrior.status":
    case "runner.status": {
      const message = warriorStatusMessageSchema.safeParse(frame.message);
      if (!message.success) return;
      if (frame.event_name === "warrior.status") snapshot.status = normalizeDisplayStatus(message.data.status);
      else snapshot.runnerStatus = normalizeDisplayStatus(message.data.status);
      return;
    }
    case "warrior.project_selected": {
      const message = warriorProjectSelectedMessageSchema.safeParse(frame.message);
      if (message.success) snapshot.selectedProject = message.data.project;
      return;
    }
    case "warrior.broadcast_message": {
      const message = warriorBroadcastMessageSchema.safeParse(frame.message);
      if (message.success) snapshot.broadcastMessage = message.data.message;
      return;
    }
    case "project.refresh": {
      const message = projectRefreshMessageSchema.safeParse(frame.message);
      if (!message.success) return;
      snapshot.project = mapProject(message.data?.project);
      snapshot.runnerStatus = message.data?.status
        ? normalizeDisplayStatus(message.data.status)
        : snapshot.runnerStatus;
      for (const item of message.data?.items ?? []) snapshot.items.set(item.id, mapItem(item));
      return;
    }
    case "pipeline.start_item": {
      const message = pipelineStartItemMessageSchema.safeParse(frame.message);
      if (message.success) snapshot.items.set(message.data.item.id, mapItem(message.data.item));
      return;
    }
    case "item.complete":
      updateItemStatus(frame, snapshot, "completed");
      return;
    case "item.fail":
      updateItemStatus(frame, snapshot, "failed");
      return;
    case "item.cancel":
      updateItemStatus(frame, snapshot, "canceled");
      return;
    case "bandwidth": {
      const message = bandwidthMessageSchema.safeParse(frame.message);
      if (message.success) snapshot.bandwidth = message.data;
    }
  }
};

const updateItemStatus = (
  frame: SeesawFrame,
  snapshot: WarriorSnapshotState,
  status: ArchiveTeamWarriorItem["status"],
) => {
  const message = itemStatusMessageSchema.safeParse(frame.message);
  if (!message.success) return;
  const item = snapshot.items.get(message.data.item_id);
  if (item) snapshot.items.set(message.data.item_id, { ...item, status });
};

const createStatusFromSnapshot = (snapshot: WarriorSnapshotState): ArchiveTeamWarriorStatus => {
  const itemList = Array.from(snapshot.items.values());
  return {
    status: snapshot.status,
    runnerStatus: snapshot.runnerStatus,
    project: snapshot.project,
    selectedProject: snapshot.selectedProject,
    broadcastMessage: snapshot.broadcastMessage,
    bandwidth: snapshot.bandwidth,
    items: itemList,
    counts: {
      running: itemList.filter((item) => item.status === "running").length,
      completed: itemList.filter((item) => item.status === "completed").length,
      failed: itemList.filter((item) => item.status === "failed").length,
      canceled: itemList.filter((item) => item.status === "canceled").length,
    },
    updatedAt: new Date().toISOString(),
  };
};

const decodeWebSocketData = (data: RawData) => {
  if (typeof data === "string") return data;
  if (Buffer.isBuffer(data)) return data.toString("utf8");
  if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
  return Buffer.from(data).toString("utf8");
};

const parseSockJsMessage = (raw: string): SeesawFrame[] => {
  if (raw === "o" || raw === "h" || raw.length === 0) return [];
  if (!raw.startsWith("a")) return [];
  const payload = z.array(z.string()).safeParse(parseJsonSafely(raw.slice(1)));
  if (!payload.success) return [];
  return payload.data.flatMap((frame) => {
    const result = seesawFrameSchema.safeParse(parseJsonSafely(frame));
    return result.success ? [result.data] : [];
  });
};

const parseJsonSafely = (value: string) => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const createSockJsWebSocketUrl = (baseUrl: string) => {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/${Date.now()}/${randomUUID()}/websocket`;
  return url.toString();
};

const mapProject = (project?: WarriorProject): ArchiveTeamWarriorStatus["project"] => {
  if (!project) return null;
  return { id: project.project_id?.toString(), title: project.title ?? "Unknown Project" };
};

const mapItem = (item: WarriorItem): ArchiveTeamWarriorItem => ({
  id: item.id,
  name: formatItemName(item.name),
  status: normalizeItemStatus(item.status),
  project: item.project,
  startTime: item.start_time,
});

const normalizeDisplayStatus = (status?: string | null) => {
  if (!status) return "Unknown";
  switch (status) {
    case "RUNNING_PROJECT":
      return "Running";
    case "STOPPED":
      return "Stopped";
    case "IDLE":
      return "Idle";
    default:
      return status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) => character.toUpperCase());
  }
};

const formatItemName = (name: string) => {
  const parts = name
    .replace(/^Item\s+/i, "")
    .split("\u0000")
    .filter(Boolean);
  const first = parts[0];
  if (!first) return "Item";
  const label = parts.length === 1 ? first : `${first} + ${parts.length - 1} more`;
  return label.length <= 80 ? label : `${label.slice(0, 77)}...`;
};

const normalizeItemStatus = (status?: string | null): ArchiveTeamWarriorItem["status"] => {
  switch (status?.toLowerCase()) {
    case "running":
    case "running_project":
      return "running";
    case "completed":
      return "completed";
    case "failed":
    case "fail":
      return "failed";
    case "canceled":
    case "cancel":
      return "canceled";
    case undefined:
      return "running";
    default:
      return "unknown";
  }
};

const seesawFrameSchema = z.object({ event_name: z.string(), message: z.unknown() });
const warriorStatusMessageSchema = z.object({ status: z.string() });
const warriorBroadcastMessageSchema = z.object({ message: z.string().nullable() });
const warriorProjectSelectedMessageSchema = z.object({ project: z.string().nullable() });
const warriorProjectSchema = z.object({
  project_id: z.number().optional(),
  title: z.string().optional(),
  project_html: z.string().optional(),
  utc_deadline: z.string().nullable().optional(),
});
const warriorItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().nullable().optional(),
  project: z.string().nullable().optional(),
  start_time: z.number().optional(),
});
const projectRefreshMessageSchema = z
  .object({
    project: warriorProjectSchema.optional(),
    status: z.string().optional(),
    items: z.array(warriorItemSchema).optional(),
  })
  .nullable();
const itemStatusMessageSchema = z.object({ item_id: z.string() });
const pipelineStartItemMessageSchema = z.object({ item: warriorItemSchema });
const bandwidthMessageSchema = z.object({
  received: z.number().optional(),
  sent: z.number().optional(),
  receiving: z.number().optional(),
  sending: z.number().optional(),
  session_id: z.string().optional(),
});

type WarriorProject = z.infer<typeof warriorProjectSchema>;
type WarriorItem = z.infer<typeof warriorItemSchema>;
type SeesawFrame = z.infer<typeof seesawFrameSchema>;
