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
import {
  bandwidthMessageSchema,
  itemStatusMessageSchema,
  pipelineStartItemMessageSchema,
  projectRefreshMessageSchema,
  seesawFrameSchema,
  warriorBroadcastMessageSchema,
  warriorProjectSelectedMessageSchema,
  warriorStatusMessageSchema,
} from "./archive-team-warrior-schemas";
import type { SeesawFrame, WarriorItem, WarriorProject } from "./archive-team-warrior-schemas";
import type { ArchiveTeamWarriorItem, ArchiveTeamWarriorStatus } from "./archive-team-warrior-types";

const SOCKJS_SNAPSHOT_TIMEOUT_MS = 2500;

interface WarriorSnapshotState {
  status: string;
  runnerStatus?: string;
  selectedProject: string | null;
  broadcastMessage: string | null;
  project: ArchiveTeamWarriorStatus["project"];
  bandwidth: ArchiveTeamWarriorStatus["bandwidth"];
  items: Map<string, ArchiveTeamWarriorItem>;
}

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

      const socket = new WebSocket(this.createSockJsWebSocketUrl(baseUrl), {
        headers: this.createAuthHeaders(),
      });

      const finish = () => {
        if (isSettled) return;

        isSettled = true;
        clearTimeout(timeout);

        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }

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
        const frames = this.parseSockJsMessage(this.decodeWebSocketData(data));

        for (const frame of frames) {
          this.applyFrameToSnapshot(frame, snapshot);
        }
      });

      socket.on("error", fail);
      socket.on("close", finish);
    });

    return this.createStatusFromSnapshot(snapshot);
  }

  private applyFrameToSnapshot(frame: SeesawFrame, snapshot: WarriorSnapshotState) {
    switch (frame.event_name) {
      case "warrior.status":
        this.applyWarriorStatusFrame(frame, snapshot);
        break;

      case "warrior.project_selected":
        this.applyProjectSelectedFrame(frame, snapshot);
        break;

      case "warrior.broadcast_message":
        this.applyBroadcastMessageFrame(frame, snapshot);
        break;

      case "runner.status":
        this.applyRunnerStatusFrame(frame, snapshot);
        break;

      case "project.refresh":
        this.applyProjectRefreshFrame(frame, snapshot);
        break;

      case "pipeline.start_item":
        this.applyPipelineStartItemFrame(frame, snapshot);
        break;

      case "item.complete":
        this.applyItemStatusFrame(frame, snapshot, "completed");
        break;

      case "item.fail":
        this.applyItemStatusFrame(frame, snapshot, "failed");
        break;

      case "item.cancel":
        this.applyItemStatusFrame(frame, snapshot, "canceled");
        break;

      case "bandwidth":
        this.applyBandwidthFrame(frame, snapshot);
        break;
    }
  }

  private applyWarriorStatusFrame(frame: SeesawFrame, snapshot: WarriorSnapshotState) {
    const message = warriorStatusMessageSchema.safeParse(frame.message);
    if (!message.success) return;

    snapshot.status = this.normalizeDisplayStatus(message.data.status);
  }

  private applyProjectSelectedFrame(frame: SeesawFrame, snapshot: WarriorSnapshotState) {
    const message = warriorProjectSelectedMessageSchema.safeParse(frame.message);
    if (!message.success) return;

    snapshot.selectedProject = message.data.project;
  }

  private applyBroadcastMessageFrame(frame: SeesawFrame, snapshot: WarriorSnapshotState) {
    const message = warriorBroadcastMessageSchema.safeParse(frame.message);
    if (!message.success) return;

    snapshot.broadcastMessage = message.data.message;
  }

  private applyRunnerStatusFrame(frame: SeesawFrame, snapshot: WarriorSnapshotState) {
    const message = warriorStatusMessageSchema.safeParse(frame.message);
    if (!message.success) return;

    snapshot.runnerStatus = this.normalizeDisplayStatus(message.data.status);
  }

  private applyProjectRefreshFrame(frame: SeesawFrame, snapshot: WarriorSnapshotState) {
    const message = projectRefreshMessageSchema.safeParse(frame.message);
    if (!message.success) return;

    snapshot.project = this.mapProject(message.data?.project);
    snapshot.runnerStatus = message.data?.status
      ? this.normalizeDisplayStatus(message.data.status)
      : snapshot.runnerStatus;

    for (const item of message.data?.items ?? []) {
      snapshot.items.set(item.id, this.mapItem(item));
    }
  }

  private applyPipelineStartItemFrame(frame: SeesawFrame, snapshot: WarriorSnapshotState) {
    const message = pipelineStartItemMessageSchema.safeParse(frame.message);
    if (!message.success) return;

    snapshot.items.set(message.data.item.id, this.mapItem(message.data.item));
  }

  private applyItemStatusFrame(
    frame: SeesawFrame,
    snapshot: WarriorSnapshotState,
    status: ArchiveTeamWarriorItem["status"],
  ) {
    const message = itemStatusMessageSchema.safeParse(frame.message);
    if (!message.success) return;

    this.updateItemStatus(snapshot.items, message.data.item_id, status);
  }

  private applyBandwidthFrame(frame: SeesawFrame, snapshot: WarriorSnapshotState) {
    const message = bandwidthMessageSchema.safeParse(frame.message);
    if (!message.success) return;

    snapshot.bandwidth = message.data;
  }

  private createStatusFromSnapshot(snapshot: WarriorSnapshotState): ArchiveTeamWarriorStatus {
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

    const rawPayload = this.parseJsonSafely(raw.slice(1));
    const payload = z.array(z.string()).safeParse(rawPayload);
    if (!payload.success) return [];

    return payload.data.flatMap((frame) => {
      const rawFrame = this.parseJsonSafely(frame);
      const result = seesawFrameSchema.safeParse(rawFrame);

      return result.success ? [result.data] : [];
    });
  }

  private parseJsonSafely(value: string) {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return null;
    }
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
    itemId: string,
    status: ArchiveTeamWarriorItem["status"],
  ) {
    const item = items.get(itemId);
    if (!item) return;

    items.set(itemId, {
      ...item,
      status,
    });
  }
}
