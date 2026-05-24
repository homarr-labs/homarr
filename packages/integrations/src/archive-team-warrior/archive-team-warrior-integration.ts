import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";

import WebSocket from "ws";
import type { RawData } from "ws";
import { z } from "zod/v4";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ArchiveTeamWarriorItem, ArchiveTeamWarriorStatus } from "./archive-team-warrior-types";

const SOCKJS_SNAPSHOT_TIMEOUT_MS = 2500;

const seesawFrameSchema = z.object({
  event_name: z.string(),
  message: z.unknown(),
});

const warriorStatusMessageSchema = z.object({
  status: z.string(),
});

const warriorBroadcastMessageSchema = z.object({
  message: z.string().nullable(),
});

const warriorProjectSelectedMessageSchema = z.object({
  project: z.string().nullable(),
});

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

const itemStatusMessageSchema = z.object({
  item_id: z.string(),
});

const pipelineStartItemMessageSchema = z.object({
  item: warriorItemSchema,
});

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

export class ArchiveTeamWarriorIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/index.html"), {
      headers: this.createAuthHeaders(),
    });

    if (!response.ok) return TestConnectionError.StatusResult(response);

    return { success: true };
  }

  public async getStatusAsync(): Promise<ArchiveTeamWarriorStatus> {
    const baseUrl = this.url("/").toString().replace(/\/$/, "");

    await fetchWithTrustedCertificatesAsync(`${baseUrl}/index.html`, {
      headers: this.createAuthHeaders(),
    });

    return await this.readSockJsSnapshotAsync(baseUrl);
  }

  private async readSockJsSnapshotAsync(baseUrl: string): Promise<ArchiveTeamWarriorStatus> {
    const items = new Map<string, ArchiveTeamWarriorItem>();

    let status = "Unknown";
    let runnerStatus: string | undefined;
    let selectedProject: string | null = null;
    let broadcastMessage: string | null = null;
    let project: ArchiveTeamWarriorStatus["project"] = null;
    let bandwidth: ArchiveTeamWarriorStatus["bandwidth"] = null;

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        socket.close();
        resolve();
      };

      const fail = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(new Error("Failed to connect to ArchiveTeam Warrior websocket"));
      };

      const socket = new WebSocket(this.createSockJsWebSocketUrl(baseUrl), {
        headers: this.createAuthHeaders(),
      });

      const timeout = setTimeout(finish, SOCKJS_SNAPSHOT_TIMEOUT_MS);

      socket.on("message", (data: RawData) => {
        const frames = this.parseSockJsMessage(this.decodeWebSocketData(data));

        for (const frame of frames) {
          switch (frame.event_name) {
            case "warrior.status": {
              const message = warriorStatusMessageSchema.safeParse(frame.message);
              if (message.success) status = this.normalizeDisplayStatus(message.data.status);
              break;
            }

            case "warrior.project_selected": {
              const message = warriorProjectSelectedMessageSchema.safeParse(frame.message);
              if (message.success) selectedProject = message.data.project;
              break;
            }

            case "warrior.broadcast_message": {
              const message = warriorBroadcastMessageSchema.safeParse(frame.message);
              if (message.success) broadcastMessage = message.data.message;
              break;
            }

            case "runner.status": {
              const message = warriorStatusMessageSchema.safeParse(frame.message);
              if (message.success) runnerStatus = this.normalizeDisplayStatus(message.data.status);
              break;
            }

            case "project.refresh": {
              const message = projectRefreshMessageSchema.safeParse(frame.message);
              if (!message.success) break;

              project = this.mapProject(message.data?.project);
              runnerStatus = message.data?.status ? this.normalizeDisplayStatus(message.data.status) : runnerStatus;

              for (const item of message.data?.items ?? []) {
                items.set(item.id, this.mapItem(item));
              }

              break;
            }

            case "pipeline.start_item": {
              const message = pipelineStartItemMessageSchema.safeParse(frame.message);
              if (message.success) items.set(message.data.item.id, this.mapItem(message.data.item));
              break;
            }

            case "item.complete": {
              const message = itemStatusMessageSchema.safeParse(frame.message);
              if (message.success) this.updateItemStatus(items, message.data.item_id, "completed");
              break;
            }

            case "item.fail": {
              const message = itemStatusMessageSchema.safeParse(frame.message);
              if (message.success) this.updateItemStatus(items, message.data.item_id, "failed");
              break;
            }

            case "item.cancel": {
              const message = itemStatusMessageSchema.safeParse(frame.message);
              if (message.success) this.updateItemStatus(items, message.data.item_id, "canceled");
              break;
            }

            case "bandwidth": {
              const message = bandwidthMessageSchema.safeParse(frame.message);
              if (message.success) bandwidth = message.data;
              break;
            }
          }
        }
      });

      socket.on("error", fail);
      socket.on("close", finish);
    });

    const itemList = Array.from(items.values());

    return {
      status,
      runnerStatus,
      project,
      selectedProject,
      broadcastMessage,
      bandwidth,
      items: itemList,
      counts: {
        running: itemList.filter((item) => item.status === "running").length,
        completed: itemList.filter((item) => item.status === "completed").length,
        failed: itemList.filter((item) => item.status === "failed").length,
        canceled: itemList.filter((item) => item.status === "canceled").length,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  private createAuthHeaders() {
    const authorization = this.createBasicAuthHeader();

    return authorization ? { Authorization: authorization } : undefined;
  }

  private createBasicAuthHeader() {
    if (!this.hasSecretValue("username") || !this.hasSecretValue("password")) return undefined;

    const username = this.getSecretValue("username");
    const password = this.getSecretValue("password");
    const credentials = Buffer.from(`${username}:${password}`, "utf8").toString("base64");

    return `Basic ${credentials}`;
  }

  private decodeWebSocketData(data: RawData) {
    if (typeof data === "string") return data;
    if (Buffer.isBuffer(data)) return data.toString("utf8");
    if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");

    return Buffer.from(data).toString("utf8");
  }

  private parseSockJsMessage(raw: string): SeesawFrame[] {
    if (raw === "o" || raw === "h" || raw.length === 0) return [];
    if (!raw.startsWith("a")) return [];

    const payload = z.array(z.string()).safeParse(JSON.parse(raw.slice(1)));
    if (!payload.success) return [];

    return payload.data.flatMap((frame) => {
      const result = seesawFrameSchema.safeParse(JSON.parse(frame));
      return result.success ? [result.data] : [];
    });
  }

  private createSockJsWebSocketUrl(baseUrl: string) {
    const url = new URL(baseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = `/${Date.now()}/${randomUUID()}/websocket`;
    return url.toString();
  }

  private mapProject(project?: WarriorProject): ArchiveTeamWarriorStatus["project"] {
    if (!project) return null;

    return {
      id: project.project_id?.toString(),
      title: project.title ?? "Unknown Project",
    };
  }

  private mapItem(item: WarriorItem): ArchiveTeamWarriorItem {
    return {
      id: item.id,
      name: this.formatItemName(item.name),
      status: this.normalizeItemStatus(item.status),
      project: item.project,
      startTime: item.start_time,
    };
  }

  private normalizeDisplayStatus(status?: string | null) {
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
  }

  private formatItemName(name: string) {
    const cleaned = name.replace(/^Item\s+/i, "");
    const parts = cleaned.split("\u0000").filter(Boolean);

    if (parts.length === 0) return "Item";

    const first = parts[0];

    if (!first) return "Item";

    const label = parts.length === 1 ? first : `${first} + ${parts.length - 1} more`;

    return label.length <= 80 ? label : `${label.slice(0, 77)}...`;
  }

  private normalizeItemStatus(status?: string | null): ArchiveTeamWarriorItem["status"] {
    if (!status) return "running";

    switch (status.toLowerCase()) {
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
      default:
        return "unknown";
    }
  }

  private updateItemStatus(
    items: Map<string, ArchiveTeamWarriorItem>,
    id: string,
    status: ArchiveTeamWarriorItem["status"],
  ) {
    const item = items.get(id);
    if (!item) return;

    items.set(id, {
      ...item,
      status,
    });
  }
}