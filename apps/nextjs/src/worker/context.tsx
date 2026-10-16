"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

import type { RouterOutputs } from "@homarr/api";
import type { Session } from "@homarr/auth/types";
import type { WorkerConnectionPool } from "@homarr/worker-client";

import type { AssistantAvailability } from "~/components/assistant/assistant-gate";

export interface WorkerBootstrap {
  session: Session;
  user: RouterOutputs["frontend"]["userSettings"] | null;
  serverSettings: RouterOutputs["frontend"]["settings"];
  runtime: RouterOutputs["frontend"]["runtime"];
  assistantAvailability: AssistantAvailability;
  integrationPermissions: RouterOutputs["frontend"]["integrationPermissions"];
}

export const WorkerWorkspaceContext = createContext<{
  pool: WorkerConnectionPool;
  platformPath: string;
  manageWorkers: () => void;
  organizationId: string | null;
  setOrganizationId: (organizationId: string | null) => void;
} | null>(null);

export const WorkerBootstrapContext = createContext<WorkerBootstrap | null>(null);

export function useWorkerWorkspace() {
  const context = useContext(WorkerWorkspaceContext);
  if (!context) throw new Error("A worker workspace is required");
  return context;
}

export function useWorkerConnections() {
  const { pool } = useWorkerWorkspace();
  return useSyncExternalStore(pool.subscribe, pool.getSnapshot, pool.getSnapshot);
}

export function useWorkerBootstrap() {
  const bootstrap = useContext(WorkerBootstrapContext);
  if (!bootstrap) throw new Error("Connect a worker before opening Homarr");
  return bootstrap;
}
