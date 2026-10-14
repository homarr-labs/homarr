import { z } from "zod/v4";

import type { IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import {
  bandwidthMessageSchema,
  itemStatusMessageSchema,
  pipelineStartItemMessageSchema,
  projectRefreshMessageSchema,
  seesawFrameSchema,
  warriorBroadcastMessageSchema,
  warriorProjectSelectedMessageSchema,
  warriorStatusMessageSchema,
} from "../../archive-team-warrior/archive-team-warrior-schemas";
import type { SeesawFrame, WarriorItem, WarriorProject } from "../../archive-team-warrior/archive-team-warrior-schemas";
import type {
  ArchiveTeamWarriorItem,
  ArchiveTeamWarriorStatus,
} from "../../archive-team-warrior/archive-team-warrior-types";
import { SpecialistBranchHeldError, SpecialistProtocol } from "./protocol";

const parseJson = (value: string): unknown => {
  try {
    const result: unknown = JSON.parse(value);
    return result;
  } catch {
    return null;
  }
};

export const parseWarriorSockJsFrames = (raw: string): SeesawFrame[] => {
  if (raw === "o" || raw === "h" || raw.length === 0 || !raw.startsWith("a")) return [];
  const payload = z.array(z.string()).safeParse(parseJson(raw.slice(1)));
  if (!payload.success) return [];
  return payload.data.flatMap((frame) => {
    const parsed = seesawFrameSchema.safeParse(parseJson(frame));
    return parsed.success ? [parsed.data] : [];
  });
};

const displayStatus = (status?: string | null) => {
  if (!status) return "Unknown";
  if (status === "RUNNING_PROJECT") return "Running";
  if (status === "STOPPED") return "Stopped";
  if (status === "IDLE") return "Idle";
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const itemStatus = (status?: string | null): ArchiveTeamWarriorItem["status"] => {
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
};

const itemName = (name: string) => {
  const parts = name
    .replace(/^Item\s+/i, "")
    .split("\u0000")
    .filter(Boolean);
  const first = parts[0];
  if (!first) return "Item";
  const label = parts.length === 1 ? first : `${first} + ${parts.length - 1} more`;
  return label.length <= 80 ? label : `${label.slice(0, 77)}...`;
};

const mapItem = (item: WarriorItem): ArchiveTeamWarriorItem => ({
  id: item.id,
  name: itemName(item.name),
  status: itemStatus(item.status),
  project: item.project,
  startTime: item.start_time,
});
const mapProject = (project?: WarriorProject): ArchiveTeamWarriorStatus["project"] =>
  project ? { id: project.project_id?.toString(), title: project.title ?? "Unknown Project" } : null;

export class WarriorSnapshotAccumulator {
  private status = "Unknown";
  private runnerStatus: string | undefined;
  private selectedProject: string | null = null;
  private broadcastMessage: string | null = null;
  private project: ArchiveTeamWarriorStatus["project"] = null;
  private bandwidth: ArchiveTeamWarriorStatus["bandwidth"] = null;
  private readonly items = new Map<string, ArchiveTeamWarriorItem>();

  applyFrame(frame: SeesawFrame) {
    switch (frame.event_name) {
      case "warrior.status": {
        const parsed = warriorStatusMessageSchema.safeParse(frame.message);
        if (parsed.success) this.status = displayStatus(parsed.data.status);
        break;
      }
      case "runner.status": {
        const parsed = warriorStatusMessageSchema.safeParse(frame.message);
        if (parsed.success) this.runnerStatus = displayStatus(parsed.data.status);
        break;
      }
      case "warrior.project_selected": {
        const parsed = warriorProjectSelectedMessageSchema.safeParse(frame.message);
        if (parsed.success) this.selectedProject = parsed.data.project;
        break;
      }
      case "warrior.broadcast_message": {
        const parsed = warriorBroadcastMessageSchema.safeParse(frame.message);
        if (parsed.success) this.broadcastMessage = parsed.data.message;
        break;
      }
      case "project.refresh": {
        const parsed = projectRefreshMessageSchema.safeParse(frame.message);
        if (!parsed.success) break;
        this.project = mapProject(parsed.data?.project);
        this.runnerStatus = parsed.data?.status ? displayStatus(parsed.data.status) : this.runnerStatus;
        for (const item of parsed.data?.items ?? []) this.items.set(item.id, mapItem(item));
        break;
      }
      case "pipeline.start_item": {
        const parsed = pipelineStartItemMessageSchema.safeParse(frame.message);
        if (parsed.success) this.items.set(parsed.data.item.id, mapItem(parsed.data.item));
        break;
      }
      case "item.complete":
      case "item.fail":
      case "item.cancel": {
        const parsed = itemStatusMessageSchema.safeParse(frame.message);
        if (!parsed.success) break;
        const item = this.items.get(parsed.data.item_id);
        if (item)
          this.items.set(item.id, {
            ...item,
            status:
              frame.event_name === "item.complete"
                ? "completed"
                : frame.event_name === "item.fail"
                  ? "failed"
                  : "canceled",
          });
        break;
      }
      case "bandwidth": {
        const parsed = bandwidthMessageSchema.safeParse(frame.message);
        if (parsed.success) this.bandwidth = parsed.data;
        break;
      }
    }
  }

  snapshot(): ArchiveTeamWarriorStatus {
    const items = [...this.items.values()];
    return {
      status: this.status,
      runnerStatus: this.runnerStatus,
      selectedProject: this.selectedProject,
      broadcastMessage: this.broadcastMessage,
      project: this.project,
      bandwidth: this.bandwidth,
      items,
      counts: {
        running: items.filter((item) => item.status === "running").length,
        completed: items.filter((item) => item.status === "completed").length,
        failed: items.filter((item) => item.status === "failed").length,
        canceled: items.filter((item) => item.status === "canceled").length,
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

export class ArchiveTeamWarriorProtocol extends SpecialistProtocol {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const headers = this.hasSecret("username") && this.hasSecret("password") ? this.basicHeaders() : undefined;
    return this.testingHttp(input).responseAsync(this.url("/index.html"), { headers }, async (response) =>
      response.ok ? { success: true } : this.statusResult(response),
    );
  }

  async getStatusAsync(): Promise<ArchiveTeamWarriorStatus> {
    throw new SpecialistBranchHeldError("warrior-owned-raw-sockjs-websocket");
  }
}
