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
  selectedProject?: string | null;
  broadcastMessage?: string | null;
  bandwidth?: ArchiveTeamWarriorBandwidth | null;
  items: ArchiveTeamWarriorItem[];
  counts: {
    running: number;
    completed: number;
    failed: number;
    canceled: number;
  };
  updatedAt: string;
}
