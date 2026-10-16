import { enrollmentMessage, signIdentity } from "@homarr/remote-protocol";
import type { EnrollmentChallenge } from "@homarr/remote-protocol";

import { fingerprint, hash, hashesEqual, randomSecret, sign, verify } from "./crypto";
import { AccessStore } from "./store";
import { WorkerAccessError } from "./types";
import type {
  AccessCredential,
  AccessGrant,
  AccessPrincipal,
  AuthenticatedEnvelope,
  GrantScope,
  IssuedGrant,
  ProcedureAccess,
  VerifiedDevice,
  WorkerSigningIdentity,
} from "./types";

export * from "./types";

type Invitation = AccessGrant & { type: "invite" };
type OpenOptions = {
  directory: string;
  identity: WorkerSigningIdentity;
  now?: () => number;
  /** Only app-owned, reviewed DTO reads. Never forward a client-provided list. */
  safeBoardProcedures?: readonly string[];
};

const defaultBoardReads = ["board.read", "board.widgetData", "remote.board", "remote.widgetData"];
const maximumInvitationLifetime = 7 * 24 * 60 * 60 * 1000;

/** Authorization is local to the worker. Platform identity and request headers confer no permissions. */
export class WorkerAccess {
  readonly workerId: string;
  private readonly store: AccessStore;
  private readonly identity: WorkerSigningIdentity;
  private readonly now: () => number;
  private readonly principals = new WeakMap<AccessPrincipal, { grantId: string; membershipGrantId: string | null }>();
  private readonly safeBoardProcedures: ReadonlySet<string>;

  private constructor(options: OpenOptions, store: AccessStore, workerId: string) {
    this.identity = options.identity;
    this.store = store;
    this.workerId = workerId;
    this.now = options.now ?? Date.now;
    this.safeBoardProcedures = new Set(options.safeBoardProcedures ?? defaultBoardReads);
  }

  static async open(options: OpenOptions) {
    const workerId = await fingerprint(options.identity.publicJwk);
    const store = new AccessStore(options.directory);
    try {
      await store.initialize(workerId);
      return new WorkerAccess(options, store, workerId);
    } catch (error) {
      store.close();
      throw error;
    }
  }

  get claimed() {
    return this.store.state("claimHash") === "";
  }

  /** Local CLI/0600-file only. Do not expose through HTTP, logs, health, or the platform. */
  getBootstrapSecret() {
    return this.store.localSecret();
  }

  /** Local operator CLI only; never mount this on a public HTTP route. */
  getPairingInfo() {
    return {
      workerId: this.workerId,
      publicJwk: this.identity.publicJwk,
      claimed: this.claimed,
      secret: this.getBootstrapSecret(),
    };
  }

  /** Call only after the protocol has verified the device signature in encrypted client-confirm. */
  async authenticateEnvelope(device: VerifiedDevice, credential: AccessCredential): Promise<AuthenticatedEnvelope> {
    if (!device || (await fingerprint(device.devicePublicJwk)) !== device.deviceId) {
      throw new WorkerAccessError("UNAUTHORIZED", "Device identity does not match");
    }
    if (!credential || typeof credential !== "object")
      throw new WorkerAccessError("UNAUTHORIZED", "Access credential required");
    if (credential.kind === "claim") return this.claim(device, credential.secret);
    if (!this.claimed) throw new WorkerAccessError("UNAUTHORIZED", "Worker requires local pairing");
    if (credential.kind === "invite") return this.redeemInvitation(device, credential.token);
    if (credential.kind !== "grant" && credential.kind !== "share")
      throw new WorkerAccessError("UNAUTHORIZED", "Unknown access credential");
    const grant = await this.verifyGrant(credential.token);
    if (grant.subject === "bearer") {
      if (credential.kind !== "share") throw new WorkerAccessError("UNAUTHORIZED", "Share credential required");
    } else if (credential.kind !== "grant" || grant.subject !== device.deviceId) {
      throw new WorkerAccessError("UNAUTHORIZED", "Grant belongs to another device");
    }
    return this.authenticated(device.deviceId, { ...grant, token: credential.token });
  }

  private async claim(device: VerifiedDevice, secret: string) {
    if (typeof secret !== "string" || secret.length > 128)
      throw new WorkerAccessError("UNAUTHORIZED", "Invalid pairing secret");
    const secretHash = await hash(secret);
    const grant = this.newGrant(device.deviceId, { role: "owner" });
    const token = await sign(this.identity, grant);
    // No await inside this transaction: concurrent processes cannot claim the same worker twice.
    const result = this.store.db
      .transaction(() => {
        const expected = this.store.state("claimHash");
        if (!expected) return "claimed";
        if (Number(this.store.state("claimLockedUntil")) > this.now()) return "limited";
        if (!hashesEqual(expected, secretHash)) {
          const attempts = Math.min(Number(this.store.state("claimAttempts")) + 1, 16);
          this.store.setState("claimAttempts", String(attempts));
          const delay = Math.min(30_000, 250 * 2 ** (attempts - 1));
          this.store.setState("claimLockedUntil", String(this.now() + delay));
          return "invalid";
        }
        this.store.insertGrant(grant, token);
        this.recordDevice(device);
        this.store.setState("claimHash", "");
        this.store.setState("claimedAt", String(this.now()));
        return "ok";
      })
      .immediate();
    if (result === "claimed") throw new WorkerAccessError("CLAIMED", "Worker has already been claimed");
    if (result === "limited") throw new WorkerAccessError("RATE_LIMITED", "Pairing temporarily locked");
    if (result !== "ok") throw new WorkerAccessError("UNAUTHORIZED", "Invalid pairing secret");
    this.store.removeLocalSecret();
    return this.authenticated(device.deviceId, { ...grant, token });
  }

  async grantAccess(owner: AccessPrincipal, input: GrantScope & { devicePublicJwk: JsonWebKey; accountId?: string }) {
    const authority = this.requireOwner(owner);
    const deviceId = await fingerprint(input.devicePublicJwk);
    const grant = this.newGrant(deviceId, input, null, authority);
    const token = await sign(this.identity, grant);
    this.store.db
      .transaction(() => {
        this.requireOwner(owner);
        this.store.insertGrant(grant, token);
        this.recordDevice({ deviceId, devicePublicJwk: input.devicePublicJwk }, input.accountId);
      })
      .immediate();
    return { ...grant, token };
  }

  async createInvitation(owner: AccessPrincipal, scope: GrantScope) {
    const authority = this.requireOwner(owner);
    if (
      scope.expiresAt === null ||
      scope.expiresAt === undefined ||
      scope.expiresAt > this.now() + maximumInvitationLifetime
    ) {
      throw new WorkerAccessError("INVALID_INPUT", "Invitation expiry must be within seven days");
    }
    const invitation: Invitation = { ...this.newGrant("invite", scope, null, authority), type: "invite" };
    const token = await sign(this.identity, invitation);
    this.requireOwner(owner);
    this.store.db
      .query("INSERT INTO invitations (id, payload, token) VALUES (?, ?, ?)")
      .run(invitation.id, JSON.stringify(invitation), token);
    return { ...invitation, token };
  }

  private async redeemInvitation(device: VerifiedDevice, token: string) {
    const payload = await verify(this.identity, token);
    if (!this.validGrant(payload) || (payload as Invitation).type !== "invite")
      throw new WorkerAccessError("UNAUTHORIZED", "Invalid invitation");
    const invitation = payload as Invitation;
    const existing = this.invitationRedemption(device, invitation, token);
    if (existing) return this.authenticated(device.deviceId, existing);
    const authority = this.loadAuthority(invitation.parentGrantId);
    const grant = this.newGrant(device.deviceId, invitation, invitation.id, authority);
    const grantToken = await sign(this.identity, grant);
    const redeemed = this.store.db
      .transaction(() => {
        // Signing yields to concurrent connections. Recheck inside the enrollment transaction.
        const current = this.invitationRedemption(device, invitation, token);
        if (current) return current;
        this.store.db.query("UPDATE invitations SET used = 1 WHERE id = ?").run(invitation.id);
        this.store.insertGrant(grant, grantToken);
        this.recordDevice(device);
        return { ...grant, token: grantToken };
      })
      .immediate();
    return this.authenticated(device.deviceId, redeemed);
  }

  /** Recover a lost confirmation for the original verified device without enrolling another device. */
  private invitationRedemption(device: VerifiedDevice, invitation: Invitation, token: string): IssuedGrant | null {
    const row = this.store.db
      .query<{ used: number; revoked: number; token: string }, [string]>(
        "SELECT used, revoked, token FROM invitations WHERE id = ?",
      )
      .get(invitation.id);
    if (!row || row.revoked || row.token !== token)
      throw new WorkerAccessError("UNAUTHORIZED", "Invitation already used or revoked");
    this.requireGrantChain(invitation);
    if (!row.used) return null;
    const original = this.store.db
      .query<{ payload: string; token: string; revoked: number }, [string, string]>(
        "SELECT payload, token, revoked FROM grants WHERE json_extract(payload, '$.parentId') = ? AND json_extract(payload, '$.subject') = ?",
      )
      .get(invitation.id, device.deviceId);
    if (!original || original.revoked)
      throw new WorkerAccessError("UNAUTHORIZED", "Invitation already used or revoked");
    const grant: unknown = JSON.parse(original.payload);
    if (!this.validGrant(grant)) throw new WorkerAccessError("UNAUTHORIZED", "Invalid invitation grant");
    this.requireGrantChain(grant);
    return { ...grant, token: original.token };
  }

  async issueShare(
    owner: AccessPrincipal,
    input: { boardIds: string[]; expiresAt?: number | null; anonymous?: boolean },
  ) {
    const authority = this.requireOwner(owner);
    if (input.anonymous !== undefined && typeof input.anonymous !== "boolean")
      throw new WorkerAccessError("INVALID_INPUT", "Share anonymity must be boolean");
    const grant: AccessGrant = {
      ...this.newGrant("bearer", { ...input, role: "viewer" }, null, authority),
      type: "share",
      anonymous: input.anonymous ?? true,
    };
    const token = await sign(this.identity, grant);
    this.requireOwner(owner);
    this.store.insertGrant(grant, token);
    return { ...grant, token, anonymous: input.anonymous ?? true };
  }

  revokeGrant(owner: AccessPrincipal, grantId: string) {
    let authority = this.requireOwner(owner);
    if (owner.grantId === grantId) throw new WorkerAccessError("INVALID_INPUT", "Cannot revoke the active owner grant");
    while (authority.parentGrantId) {
      if (authority.parentGrantId === grantId)
        throw new WorkerAccessError("INVALID_INPUT", "Cannot revoke an ancestor of the active owner grant");
      authority = this.loadAuthority(authority.parentGrantId);
    }
    const result = this.store.db.query("UPDATE grants SET revoked = 1 WHERE id = ?").run(grantId);
    if (!result.changes) throw new WorkerAccessError("NOT_FOUND", "Grant not found");
  }

  revokeInvitation(owner: AccessPrincipal, invitationId: string) {
    let authority = this.requireOwner(owner);
    while (true) {
      if (authority.parentId === invitationId)
        throw new WorkerAccessError(
          "INVALID_INPUT",
          "Cannot revoke an invitation in the active owner's authority chain",
        );
      if (!authority.parentGrantId) break;
      authority = this.loadAuthority(authority.parentGrantId);
    }
    const result = this.store.db.query("UPDATE invitations SET revoked = 1 WHERE id = ?").run(invitationId);
    if (!result.changes) throw new WorkerAccessError("NOT_FOUND", "Invitation not found");
  }

  listGrants(owner: AccessPrincipal) {
    this.requireOwner(owner);
    return this.store.db
      .query<{ payload: string; revoked: number }, []>("SELECT payload, revoked FROM grants")
      .all()
      .map((row) => ({ ...(JSON.parse(row.payload) as AccessGrant), revoked: Boolean(row.revoked) }));
  }

  listInvitations(owner: AccessPrincipal) {
    this.requireOwner(owner);
    return this.store.db
      .query<{ payload: string; used: number; revoked: number }, []>("SELECT payload, used, revoked FROM invitations")
      .all()
      .map((row) => {
        const invitation = JSON.parse(row.payload) as Invitation;
        return {
          id: invitation.id,
          role: invitation.role,
          boardIds: invitation.boardIds,
          issuedAt: invitation.issuedAt,
          expiresAt: invitation.expiresAt,
          used: Boolean(row.used),
          revoked: Boolean(row.revoked),
        };
      });
  }

  listShares(owner: AccessPrincipal) {
    return this.listGrants(owner)
      .filter((grant) => grant.subject === "bearer")
      .map((grant) => ({
        id: grant.id,
        role: grant.role,
        boardIds: grant.boardIds,
        issuedAt: grant.issuedAt,
        expiresAt: grant.expiresAt,
        anonymous: grant.anonymous ?? true,
        revoked: grant.revoked,
      }));
  }

  linkAccount(owner: AccessPrincipal, accountId: string, deviceId = owner.deviceId) {
    this.requireOwner(owner);
    this.validateAccountId(accountId);
    const result = this.store.db.query("UPDATE devices SET account_id = ? WHERE id = ?").run(accountId, deviceId);
    if (!result.changes) throw new WorkerAccessError("NOT_FOUND", "Device not found");
  }

  async signEnrollment(owner: AccessPrincipal, challenge: EnrollmentChallenge) {
    this.requireOwner(owner);
    if (
      challenge.version !== 1 ||
      challenge.type !== "homarr-platform-enrollment" ||
      !Number.isSafeInteger(challenge.expiresAt) ||
      challenge.expiresAt <= this.now() ||
      challenge.expiresAt > this.now() + 600_000 ||
      typeof challenge.nonce !== "string" ||
      challenge.nonce.length < 16 ||
      challenge.nonce.length > 256 ||
      typeof challenge.challengeId !== "string" ||
      challenge.challengeId.length > 256
    ) {
      throw new WorkerAccessError("INVALID_INPUT", "Invalid enrollment challenge");
    }
    this.validateAccountId(challenge.userId);
    let audience: URL;
    try {
      audience = new URL(challenge.audience);
    } catch {
      throw new WorkerAccessError("INVALID_INPUT", "Invalid platform audience");
    }
    const localHttp =
      audience.protocol === "http:" && (audience.hostname === "localhost" || audience.hostname === "127.0.0.1");
    if (audience.protocol !== "https:" && !localHttp) {
      throw new WorkerAccessError("INVALID_INPUT", "Platform audience requires HTTPS");
    }
    const proof = {
      challenge,
      workerId: this.workerId,
      workerPublicKey: this.identity.publicJwk,
      workerSigningKey: this.identity.publicJwk,
    };
    const signature = await signIdentity(this.identity, enrollmentMessage(proof));
    this.requireOwner(owner);
    this.linkAccount(owner, challenge.userId);
    return { ...proof, signature };
  }

  authorizeProcedure(principal: AccessPrincipal, procedure: ProcedureAccess) {
    const grant = this.requirePrincipal(principal);
    if (grant.role === "owner") return;
    if (
      procedure.kind === "mutation" ||
      !this.safeBoardProcedures.has(procedure.path) ||
      !procedure.boardId ||
      !grant.boardIds.includes(procedure.boardId)
    ) {
      throw new WorkerAccessError("FORBIDDEN", "Grant permits only reads from the shared board");
    }
  }

  requireOwner(principal: AccessPrincipal) {
    const grant = this.requirePrincipal(principal);
    if (grant.role !== "owner") throw new WorkerAccessError("FORBIDDEN", "Worker owner grant required");
    return grant;
  }

  /** Recheck long-lived encrypted sessions before every request and subscription emission. */
  assertActive(principal: AccessPrincipal): AccessGrant {
    return this.requirePrincipal(principal);
  }

  private requirePrincipal(principal: AccessPrincipal) {
    const session = this.principals.get(principal);
    if (!session) throw new WorkerAccessError("UNAUTHORIZED", "Verified encrypted session required");
    const row = this.store.grant(session.grantId);
    if (!row || row.revoked) throw new WorkerAccessError("UNAUTHORIZED", "Grant revoked");
    const grant = JSON.parse(row.payload) as AccessGrant;
    this.requireGrantChain(grant);
    if (grant.subject !== "bearer" && grant.subject !== principal.deviceId)
      throw new WorkerAccessError("UNAUTHORIZED", "Device grant mismatch");
    return this.deviceScopedGrant(grant, principal.deviceId, session.membershipGrantId);
  }

  private async verifyGrant(token: string) {
    const payload = await verify(this.identity, token);
    if (!this.validGrant(payload) || (payload as Invitation).type === "invite")
      throw new WorkerAccessError("UNAUTHORIZED", "Invalid worker grant");
    this.requireGrantChain(payload);
    const row = this.store.grant(payload.id);
    if (!row || row.revoked || row.token !== token)
      throw new WorkerAccessError("UNAUTHORIZED", "Grant revoked or unknown");
    return payload;
  }

  private authenticated(deviceId: string, grant: IssuedGrant): AuthenticatedEnvelope {
    let membershipGrantId: string | null = null;
    if (grant.subject === "bearer" && grant.anonymous === false) {
      membershipGrantId = this.findMembershipGrant(deviceId, grant.boardIds);
    }
    const effectiveGrant = this.deviceScopedGrant(grant, deviceId, membershipGrantId);
    const device = this.store.db
      .query<{ account_id: string | null }, [string]>("SELECT account_id FROM devices WHERE id = ?")
      .get(deviceId);
    const principal: AccessPrincipal = Object.freeze({
      deviceId,
      grantId: grant.id,
      role: grant.role,
      boardIds: Object.freeze([...effectiveGrant.boardIds]),
      accountId: device?.account_id ?? null,
    });
    this.principals.set(principal, { grantId: grant.id, membershipGrantId });
    this.requirePrincipal(principal);
    return { principal, grant: { ...effectiveGrant, token: grant.token } };
  }

  private newGrant(
    subject: string,
    scope: GrantScope,
    parentId: string | null = null,
    authority: AccessGrant | null = null,
  ): AccessGrant {
    if (scope.role !== "owner" && scope.role !== "viewer")
      throw new WorkerAccessError("INVALID_INPUT", "Unknown grant role");
    let expiresAt = scope.expiresAt ?? null;
    if (expiresAt !== null && (!Number.isSafeInteger(expiresAt) || expiresAt <= this.now())) {
      throw new WorkerAccessError("INVALID_INPUT", "Expiry must be a future integer timestamp");
    }
    if (authority) {
      if (this.requireGrantChain(authority) >= 32)
        throw new WorkerAccessError("INVALID_INPUT", "Grant delegation depth exceeded");
      if (authority.expiresAt !== null && (expiresAt === null || expiresAt > authority.expiresAt))
        expiresAt = authority.expiresAt;
    }
    const boardIds = [...new Set(scope.boardIds ?? [])];
    if (
      boardIds.length > 100 ||
      boardIds.some((id) => typeof id !== "string" || !id.length || id.length > 256) ||
      (scope.role === "viewer" && !boardIds.length)
    )
      throw new WorkerAccessError("INVALID_INPUT", "Viewer grants require explicit board IDs");
    return {
      version: 1,
      id: randomSecret(),
      workerId: this.workerId,
      subject,
      role: scope.role,
      boardIds,
      issuedAt: this.now(),
      expiresAt,
      parentId,
      parentGrantId: authority?.id ?? null,
    };
  }

  private validGrant(value: unknown): value is AccessGrant {
    if (!value || typeof value !== "object") return false;
    const grant = value as AccessGrant;
    return (
      grant.version === 1 &&
      grant.workerId === this.workerId &&
      typeof grant.id === "string" &&
      typeof grant.subject === "string" &&
      (grant.role === "owner" || grant.role === "viewer") &&
      Array.isArray(grant.boardIds) &&
      grant.boardIds.every((id) => typeof id === "string") &&
      Number.isSafeInteger(grant.issuedAt) &&
      (grant.parentGrantId === null || typeof grant.parentGrantId === "string") &&
      (grant.expiresAt === null || Number.isSafeInteger(grant.expiresAt))
    );
  }

  private requireCurrent(grant: AccessGrant) {
    if (grant.expiresAt !== null && grant.expiresAt <= this.now())
      throw new WorkerAccessError("UNAUTHORIZED", "Grant expired");
  }

  private loadAuthority(id: string | null): AccessGrant {
    if (!id) throw new WorkerAccessError("UNAUTHORIZED", "Issuing owner grant required");
    const row = this.store.grant(id);
    if (!row || row.revoked) throw new WorkerAccessError("UNAUTHORIZED", "Issuing grant revoked");
    const grant = JSON.parse(row.payload) as AccessGrant;
    if (grant.role !== "owner") throw new WorkerAccessError("UNAUTHORIZED", "Issuing grant is not an owner");
    return grant;
  }

  private requireGrantChain(grant: AccessGrant) {
    const seen = new Set<string>();
    let current = grant;
    while (true) {
      if (seen.has(current.id) || seen.size >= 32)
        throw new WorkerAccessError("UNAUTHORIZED", "Invalid grant authority chain");
      seen.add(current.id);
      this.requireCurrent(current);
      if (current.parentId) {
        const invite = this.store.db
          .query<{ revoked: number; payload: string }, [string]>(
            "SELECT revoked, payload FROM invitations WHERE id = ?",
          )
          .get(current.parentId);
        if (!invite || invite.revoked) throw new WorkerAccessError("UNAUTHORIZED", "Invitation revoked");
        const invitation = JSON.parse(invite.payload) as Invitation;
        this.requireCurrent(invitation);
        if (invitation.parentGrantId !== current.parentGrantId)
          throw new WorkerAccessError("UNAUTHORIZED", "Invitation authority mismatch");
      }
      if (!current.parentGrantId) return seen.size;
      current = this.loadAuthority(current.parentGrantId);
    }
  }

  private findMembershipGrant(deviceId: string, boardIds: string[]) {
    const rows = this.store.db
      .query<{ payload: string }, [string]>(
        "SELECT payload FROM grants WHERE revoked = 0 AND json_extract(payload, '$.subject') = ?",
      )
      .all(deviceId);
    let selected: AccessGrant | null = null;
    let allowedCount = 0;
    for (const row of rows) {
      const grant = JSON.parse(row.payload) as AccessGrant;
      try {
        this.requireGrantChain(grant);
      } catch {
        continue;
      }
      if (grant.role === "owner") return grant.id;
      const count = boardIds.filter((boardId) => grant.boardIds.includes(boardId)).length;
      if (count > allowedCount) {
        selected = grant;
        allowedCount = count;
      }
    }
    if (!selected)
      throw new WorkerAccessError("UNAUTHORIZED", "Private shares require a current worker-approved device grant");
    return selected.id;
  }

  private deviceScopedGrant(grant: AccessGrant, deviceId: string, membershipGrantId: string | null): AccessGrant {
    if (grant.subject !== "bearer" || grant.anonymous !== false) return grant;
    if (!membershipGrantId)
      throw new WorkerAccessError("UNAUTHORIZED", "Private shares require a current worker-approved device grant");
    const membership = this.store.grant(membershipGrantId);
    if (!membership || membership.revoked)
      throw new WorkerAccessError("UNAUTHORIZED", "Worker membership grant revoked");
    const member = JSON.parse(membership.payload) as AccessGrant;
    if (member.subject !== deviceId)
      throw new WorkerAccessError("UNAUTHORIZED", "Worker membership belongs to another device");
    this.requireGrantChain(member);
    let boardIds = grant.boardIds;
    if (member.role !== "owner") boardIds = boardIds.filter((boardId) => member.boardIds.includes(boardId));
    if (!boardIds.length)
      throw new WorkerAccessError("FORBIDDEN", "Worker membership does not permit the shared boards");
    let expiresAt = grant.expiresAt;
    if (member.expiresAt !== null && (expiresAt === null || expiresAt > member.expiresAt)) expiresAt = member.expiresAt;
    return { ...grant, boardIds, expiresAt };
  }

  private recordDevice(device: VerifiedDevice, accountId?: string) {
    if (accountId !== undefined) this.validateAccountId(accountId);
    this.store.db
      .query(
        "INSERT INTO devices (id, public_key, account_id) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET account_id = COALESCE(excluded.account_id, devices.account_id)",
      )
      .run(device.deviceId, JSON.stringify(device.devicePublicJwk), accountId ?? null);
  }

  private validateAccountId(accountId: string) {
    if (typeof accountId !== "string" || !accountId.length || accountId.length > 256)
      throw new WorkerAccessError("INVALID_INPUT", "Invalid account ID");
  }

  close() {
    this.store.close();
  }
}
