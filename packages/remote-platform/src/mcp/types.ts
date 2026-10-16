import type { RemoteConnection, WorkerIdentity } from "@homarr/remote-protocol";
import type { AuthorizedWorkerConnection } from "../types";
import type { PlatformStore } from "../store";
import type { McpServiceStore } from "./store";

export interface BrowserMcpSession {
  userId: string;
  sessionId: string;
  csrfToken: string;
  expiresAt: number;
}
export interface ServiceGrant {
  id: string;
  workerId: string;
  subject: string;
  role: "service";
  issuedAt: number;
  expiresAt: number;
  token: string;
  service: {
    purpose: "mcp";
    integrationIds: string[];
    access: "query" | "interact" | "full";
    procedurePaths: string[];
    audience: string;
    principalId: string;
    organizationId?: string;
  };
}
export interface ServiceApproval {
  id: string;
  workerId: string;
  userId: string;
  organizationId: string | null;
  principalId: string;
  audience: string;
  createdAt: number;
  expiresAt: number;
  devicePublicJwk: JsonWebKey;
  deviceId: string;
  privateJwk: JsonWebKey;
  grant?: ServiceGrant;
  capability?: string;
}
/** Serializable projection of the canonical worker-owned native MCP catalog. */
export interface WorkerMcpTool {
  name: string;
  description: string;
  type: "query" | "mutation";
  pathInRouter: string[];
  inputSchema: Record<string, unknown>;
  inputMode: "none" | "object";
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
}
export interface McpAccountToken {
  id: string;
  userId: string;
  clientId: string;
  audience: string;
  organizationId: string | null;
  expiresAt: number;
}
export interface GlobalMcpOptions {
  store: PlatformStore;
  secrets: McpServiceStore;
  publicUrl: string;
  browserSession(request: Request): Promise<BrowserMcpSession | null>;
  allowedRelayUrls?: string[];
  relayConnectUrl?: string;
  now?: () => number;
  connect?(context: {
    worker: AuthorizedWorkerConnection;
    approval: ServiceApproval;
    identity: WorkerIdentity;
    signal: AbortSignal;
  }): Promise<RemoteConnection>;
}
