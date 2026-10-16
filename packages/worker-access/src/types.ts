export type WorkerSigningIdentity = {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicJwk: JsonWebKey;
};

export type VerifiedDevice = { deviceId: string; devicePublicJwk: JsonWebKey };
export type AccessRole = "owner" | "viewer" | "service" | "user";
export type ServiceScope = {
  purpose?: "mcp" | "federation";
  integrationIds: string[];
  access: "query" | "interact" | "full";
  procedurePaths: string[];
  audience: string;
  principalId: string;
  organizationId?: string;
};
export type GrantScope = {
  role: AccessRole;
  boardIds?: string[];
  expiresAt?: number | null;
  service?: ServiceScope;
  userId?: string;
};
export type AccessCredential =
  | { kind: "claim"; secret: string }
  | { kind: "grant"; token: string }
  | { kind: "invite"; token: string }
  | { kind: "share"; token: string };

export type AccessGrant = {
  version: 1;
  id: string;
  workerId: string;
  subject: string;
  role: AccessRole;
  boardIds: string[];
  service?: ServiceScope;
  userId?: string;
  issuedAt: number;
  expiresAt: number | null;
  parentId: string | null;
  /** Authority that issued this grant; distinct from the redeemed invitation ID. */
  parentGrantId: string | null;
  type?: "share" | "invite";
  anonymous?: boolean;
};

export type IssuedGrant = AccessGrant & { token: string };
export type AccessPrincipal = Readonly<{
  deviceId: string;
  grantId: string;
  role: AccessRole;
  boardIds: readonly string[];
  accountId: string | null;
  service?: Readonly<ServiceScope>;
  userId?: string;
}>;

export type AuthenticatedEnvelope = { principal: AccessPrincipal; grant: IssuedGrant };
export type ProcedureAccess = {
  path: string;
  kind: "query" | "mutation" | "subscription";
  boardId?: string;
  integrationIds?: readonly string[];
};

export class WorkerAccessError extends Error {
  constructor(
    readonly code: "UNAUTHORIZED" | "FORBIDDEN" | "CLAIMED" | "RATE_LIMITED" | "INVALID_INPUT" | "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "WorkerAccessError";
  }
}
