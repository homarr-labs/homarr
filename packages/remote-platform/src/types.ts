import type { WorkerEnrollmentProof } from "@homarr/remote-protocol";

export type { EnrollmentChallenge } from "@homarr/remote-protocol";

/** Public account/directory metadata. Never include worker capability or pairing secrets. */
export interface PlatformUser {
  id: string;
  workshopId: string;
  login: string;
  name: string;
  avatarUrl: string | null;
}

export interface PlatformSession {
  user: PlatformUser | null;
  csrfToken: string | null;
}

export type WorkerRole = "owner" | "admin" | "member";
export type ConnectionMode = "relay" | "direct";

export interface WorkerConnection {
  workerId: string;
  name: string;
  workerPublicKey: JsonWebKey;
  workerSigningKey: JsonWebKey;
  role: WorkerRole;
  mode: ConnectionMode;
  relayUrl: string | null;
  directUrl: string | null;
  /** Directory membership does not authorize any request at the private worker. */
  accessStatus: "requiresWorkerGrant";
}

export interface WorkerMember {
  user: PlatformUser;
  role: WorkerRole;
  createdAt: number;
}

export interface WorkerInvite {
  inviteId: string;
  workerId: string;
  role: Exclude<WorkerRole, "owner">;
  expiresAt: number;
  maxUses: number;
  uses: number;
  revokedAt: number | null;
}

export interface WorkerShare {
  shareId: string;
  workerId: string;
  grantId: string;
  label: string;
  anonymous: boolean;
  expiresAt: number | null;
  revokedAt: number | null;
}

export interface WorkerEnrollment extends WorkerEnrollmentProof {
  name: string;
  mode: ConnectionMode;
  relayUrl?: string | null;
  directUrl?: string | null;
}

export interface Organization {
  organizationId: string;
  name: string;
  role: WorkerRole;
  createdAt: number;
}

export type OrganizationMember = WorkerMember;

export interface OrganizationInvite extends Omit<WorkerInvite, "workerId"> {
  organizationId: string;
}

export type OrganizationWorkerPurpose = "primary" | "integrations";

export interface OrganizationWorkerConnection extends WorkerConnection {
  organizationId: string;
  purpose: OrganizationWorkerPurpose;
}

export interface AuthorizedWorkerConnection extends WorkerConnection {
  organizationId: string | null;
  purpose: OrganizationWorkerPurpose | null;
}
