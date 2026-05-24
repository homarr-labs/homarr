import { z } from "zod/v4";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { ArchiveTeamWarriorItem, ArchiveTeamWarriorStatus } from "./archive-team-warrior-types";

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
    const response = await input.fetchAsync(this.url("/index.html"));

    if (!response.ok) return TestConnectionError.StatusResult(response);

    return { success: true };
  }

  public async getStatusAsync(): Promise<ArchiveTeamWarriorStatus> {
    const baseUrl = this.url("/").toString().replace(/\/$/, "");

    await fetchWithTrustedCertificatesAsync(`${baseUrl}/index.html`);

    return await this.readSockJsSnapshotAsync(baseUrl);
  }

  private async readSockJsSnapshotAsync(baseUrl: string): Promise<ArchiveTeamWarriorStatus> {
    const wsUrl = this.toSockJsWebSocketUrl(baseUrl);
    const items = new Map<string, ArchiveTeamWarriorItem>();

    let status = "Unknown";
    let runnerStatus: string | undefined;
    let selectedProject: string | null = null;
    let broadcastMessage: string | null = null;
    let project: ArchiveTeamWarriorStatus["project"] = null;
    let bandwidth: ArchiveTeamWarriorStatus["bandwidth"] = null;

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        socket.close();
        resolve();
      }, 2500);

      socket.addEventListener("message", (event: MessageEvent<string>) => {
        const frames = this.parseSockJsMessage(event.data);

        for (const frame of frames) {
          switch (frame.event_name) {
            case "warrior.status": {
              const message = warriorStatusMessageSchema.parse(frame.message);
              status = this.normalizeDisplayStatus(message.status);
              break;
            }

            case "warrior.project_selected": {
              const message = warriorProjectSelectedMessageSchema.parse(frame.message);
              selectedProject = message.project;
              break;
            }

            case "warrior.broadcast_message": {
              const message = warriorBroadcastMessageSchema.parse(frame.message);
              broadcastMessage = message.message;
              break;
            }

            case "runner.status": {
              const message = warriorStatusMessageSchema.parse(frame.message);
              runnerStatus = this.normalizeDisplayStatus(message.status);
              break;
            }

            case "project.refresh": {
              const message = projectRefreshMessageSchema.parse(frame.message);
              project = this.mapProject(message?.project);
              runnerStatus = message?.status ? this.normalizeDisplayStatus(message.status) : runnerStatus;

              message?.items?.forEach((item) => {
                items.set(item.id, this.mapItem(item));
              });
              break;
            }

            case "pipeline.start_item": {
              const message = pipelineStartItemMessageSchema.parse(frame.message);
              items.set(message.item.id, this.mapItem(message.item));
              break;
            }

            case "item.complete": {
              const message = itemStatusMessageSchema.parse(frame.message);
              this.updateItemStatus(items, message.item_id, "completed");
              break;
            }

            case "item.fail": {
              const message = itemStatusMessageSchema.parse(frame.message);
              this.updateItemStatus(items, message.item_id, "failed");
              break;
            }

            case "item.cancel": {
              const message = itemStatusMessageSchema.parse(frame.message);
              this.updateItemStatus(items, message.item_id, "canceled");
              break;
            }

            case "bandwidth": {
              bandwidth = bandwidthMessageSchema.parse(frame.message);
              break;
            }
          }
        }
      });

      socket.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(new Error("Failed to connect to ArchiveTeam Warrior websocket"));
      });

      socket.addEventListener("close", () => {
        clearTimeout(timeout);
        resolve();
      });
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

  private parseSockJsMessage(raw: string): SeesawFrame[] {
    if (raw === "o" || raw === "h" || raw.length === 0) return [];
    if (!raw.startsWith("a")) return [];

    const parsedPayload: unknown = JSON.parse(raw.slice(1));
    const payload = z.array(z.string()).parse(parsedPayload);

    return payload.flatMap((frame) => {
      const parsedFrame: unknown = JSON.parse(frame);
      const result = seesawFrameSchema.safeParse(parsedFrame);

      return result.success ? [result.data] : [];
    });
  }

  private toSockJsWebSocketUrl(baseUrl: string) {
    const url = new URL(baseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = `/${Date.now()}/${Math.random().toString(36).slice(2)}/websocket`;
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
