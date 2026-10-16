import { Database } from "bun:sqlite";
import type { SQLQueryBindings } from "bun:sqlite";
import { HTTPException } from "hono/http-exception";
import { OrganizationStore } from "./organizations";

import type {
  AuthorizedWorkerConnection,
  EnrollmentChallenge,
  PlatformUser,
  WorkerConnection,
  WorkerEnrollment,
  WorkerInvite,
  WorkerMember,
  WorkerRole,
  WorkerShare,
} from "./types";

export interface StoredSession {
  userId: string;
  csrfToken: string;
  expiresAt: number;
}

interface WorkerRow {
  workerId: string;
  name: string;
  workerPublicKey: string;
  workerSigningKey: string;
  role: WorkerRole;
  mode: "relay" | "direct";
  relayUrl: string | null;
  directUrl: string | null;
}

const userColumns = "id, workshop_id AS workshopId, login, name, avatar_url AS avatarUrl";
const workerColumns = `w.id AS workerId, c.name, w.public_key AS workerPublicKey, w.signing_key AS workerSigningKey,
  m.role, c.mode, c.relay_url AS relayUrl, c.direct_url AS directUrl`;
const inviteColumns = `id AS inviteId, worker_id AS workerId, role, expires_at AS expiresAt,
  max_uses AS maxUses, uses, revoked_at AS revokedAt`;
const shareColumns = `id AS shareId, worker_id AS workerId, grant_id AS grantId, label,
  anonymous, expires_at AS expiresAt, revoked_at AS revokedAt`;

/** Metadata only: no dashboard data, worker credentials, bearer grants, or OAuth access tokens. */
export class PlatformStore {
  readonly db: Database;
  readonly organizations: OrganizationStore;

  constructor(path: string) {
    this.db = new Database(path, { create: true, strict: true });
    this.db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, workshop_id TEXT NOT NULL UNIQUE, login TEXT NOT NULL,
        name TEXT NOT NULL, avatar_url TEXT, created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        csrf_token TEXT NOT NULL, expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
      CREATE TABLE IF NOT EXISTS challenges (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        value TEXT NOT NULL, expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY, public_key TEXT NOT NULL, signing_key TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS members (
        worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('owner','admin','member')), created_at INTEGER NOT NULL,
        PRIMARY KEY(worker_id, user_id)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS workers_one_owner ON members(worker_id) WHERE role = 'owner';
      CREATE TABLE IF NOT EXISTS connections (
        worker_id TEXT NOT NULL, user_id TEXT NOT NULL, name TEXT NOT NULL,
        mode TEXT NOT NULL CHECK(mode IN ('direct','relay')), direct_url TEXT, relay_url TEXT,
        PRIMARY KEY(worker_id, user_id),
        FOREIGN KEY(worker_id,user_id) REFERENCES members(worker_id,user_id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS invites (
        id TEXT PRIMARY KEY, worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
        created_by TEXT NOT NULL REFERENCES users(id), code_hash TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL CHECK(role IN ('admin','member')), expires_at INTEGER NOT NULL,
        max_uses INTEGER NOT NULL, uses INTEGER NOT NULL DEFAULT 0, revoked_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS invite_redemptions (
        invite_id TEXT NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY(invite_id,user_id)
      );
      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY, worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
        grant_id TEXT NOT NULL, label TEXT NOT NULL, anonymous INTEGER NOT NULL,
        expires_at INTEGER, revoked_at INTEGER, created_by TEXT NOT NULL REFERENCES users(id)
      );
    `);
    this.organizations = new OrganizationStore(this.db);
  }

  close(): void {
    this.db.close();
  }

  private get<T>(sql: string, ...params: SQLQueryBindings[]): T | null {
    return this.db.query<T, SQLQueryBindings[]>(sql).get(...params);
  }

  private all<T>(sql: string, ...params: SQLQueryBindings[]): T[] {
    return this.db.query<T, SQLQueryBindings[]>(sql).all(...params);
  }

  private run(sql: string, ...params: SQLQueryBindings[]): void {
    this.db.query(sql).run(...params);
  }

  upsertUser(input: Omit<PlatformUser, "id">, now: number): PlatformUser {
    this.run(
      `INSERT INTO users(id,workshop_id,login,name,avatar_url,created_at) VALUES(?,?,?,?,?,?)
      ON CONFLICT(workshop_id) DO UPDATE SET login=excluded.login,name=excluded.name,avatar_url=excluded.avatar_url`,
      input.workshopId,
      input.workshopId,
      input.login,
      input.name,
      input.avatarUrl,
      now,
    );
    const user = this.get<PlatformUser>(`SELECT ${userColumns} FROM users WHERE workshop_id=?`, input.workshopId);
    if (!user) throw new Error("User creation failed");
    return user;
  }

  user(userId: string): PlatformUser | null {
    return this.get<PlatformUser>(`SELECT ${userColumns} FROM users WHERE id=?`, userId);
  }

  saveSession(tokenHash: string, session: StoredSession): void {
    this.run(
      "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES(?,?,?,?)",
      tokenHash,
      session.userId,
      session.csrfToken,
      session.expiresAt,
    );
  }

  session(tokenHash: string, now: number): StoredSession | null {
    return this.get<StoredSession>(
      "SELECT user_id AS userId,csrf_token AS csrfToken,expires_at AS expiresAt FROM sessions WHERE token_hash=? AND expires_at>?",
      tokenHash,
      now,
    );
  }

  deleteSession(tokenHash: string): void {
    this.run("DELETE FROM sessions WHERE token_hash=?", tokenHash);
  }

  saveChallenge(challenge: EnrollmentChallenge): void {
    this.run(
      "INSERT INTO challenges(id,user_id,value,expires_at) VALUES(?,?,?,?)",
      challenge.challengeId,
      challenge.userId,
      JSON.stringify(challenge),
      challenge.expiresAt,
    );
  }

  challenge(challengeId: string, userId: string, now: number): EnrollmentChallenge | null {
    const row = this.get<{ value: string }>(
      "SELECT value FROM challenges WHERE id=? AND user_id=? AND expires_at>?",
      challengeId,
      userId,
      now,
    );
    if (!row) return null;
    return JSON.parse(row.value) as EnrollmentChallenge;
  }

  enrollWorker(input: WorkerEnrollment, userId: string, now: number): WorkerConnection {
    this.db
      .transaction(() => {
        const consumed = this.db
          .query("DELETE FROM challenges WHERE id=? AND user_id=? AND expires_at>?")
          .run(input.challenge.challengeId, userId, now);
        if (consumed.changes !== 1)
          throw new HTTPException(409, { message: "Enrollment challenge already used or expired" });
        if (this.get("SELECT id FROM workers WHERE id=?", input.workerId))
          throw new HTTPException(409, { message: "Worker is already linked" });
        this.run(
          "INSERT INTO workers(id,public_key,signing_key,created_at) VALUES(?,?,?,?)",
          input.workerId,
          JSON.stringify(input.workerPublicKey),
          JSON.stringify(input.workerSigningKey),
          now,
        );
        this.run(
          "INSERT INTO members(worker_id,user_id,role,created_at) VALUES(?,?,'owner',?)",
          input.workerId,
          userId,
          now,
        );
        this.run(
          "INSERT INTO connections(worker_id,user_id,name,mode,direct_url,relay_url) VALUES(?,?,?,?,?,?)",
          input.workerId,
          userId,
          input.name,
          input.mode,
          input.directUrl ?? null,
          input.relayUrl ?? null,
        );
      })
      .immediate();
    return this.requiredWorker(input.workerId, userId);
  }

  private connection(row: WorkerRow): WorkerConnection {
    return {
      ...row,
      workerPublicKey: JSON.parse(row.workerPublicKey) as JsonWebKey,
      workerSigningKey: JSON.parse(row.workerSigningKey) as JsonWebKey,
      accessStatus: "requiresWorkerGrant",
    };
  }

  workers(userId: string): WorkerConnection[] {
    return this.all<WorkerRow>(
      `SELECT ${workerColumns} FROM workers w JOIN members m ON m.worker_id=w.id
      JOIN connections c ON c.worker_id=w.id AND c.user_id=m.user_id WHERE m.user_id=? ORDER BY c.name,w.id`,
      userId,
    ).map((row) => this.connection(row));
  }

  /** Fresh account/organization discovery; this is never proof of private worker authorization. */
  workersForPrincipal(userId: string, organizationId?: string): AuthorizedWorkerConnection[] {
    if (organizationId !== undefined) return this.organizations.workers(organizationId, userId);
    const organizationWorkers = this.organizations
      .list(userId)
      .flatMap((organization) => this.organizations.workers(organization.organizationId, userId));
    const organizationWorkerIds = new Set(organizationWorkers.map((worker) => worker.workerId));
    const personalWorkers: AuthorizedWorkerConnection[] = this.workers(userId)
      .filter((worker) => !organizationWorkerIds.has(worker.workerId))
      .map((worker) => ({ ...worker, organizationId: null, purpose: null }));
    return [...personalWorkers, ...organizationWorkers];
  }

  worker(workerId: string, userId: string): WorkerConnection | null {
    const row = this.get<WorkerRow>(
      `SELECT ${workerColumns} FROM workers w JOIN members m ON m.worker_id=w.id
      JOIN connections c ON c.worker_id=w.id AND c.user_id=m.user_id WHERE w.id=? AND m.user_id=?`,
      workerId,
      userId,
    );
    if (!row) return null;
    return this.connection(row);
  }

  private requiredWorker(workerId: string, userId: string): WorkerConnection {
    const worker = this.worker(workerId, userId);
    if (!worker) throw new Error("Worker membership is missing");
    return worker;
  }

  updateConnection(
    workerId: string,
    userId: string,
    connection: Pick<WorkerConnection, "name" | "mode" | "directUrl" | "relayUrl">,
  ): WorkerConnection {
    this.run(
      "UPDATE connections SET name=?,mode=?,direct_url=?,relay_url=? WHERE worker_id=? AND user_id=?",
      connection.name,
      connection.mode,
      connection.directUrl,
      connection.relayUrl,
      workerId,
      userId,
    );
    return this.requiredWorker(workerId, userId);
  }

  members(workerId: string): WorkerMember[] {
    return this.all<PlatformUser & { role: WorkerRole; createdAt: number }>(
      `SELECT u.id,u.workshop_id AS workshopId,u.login,u.name,u.avatar_url AS avatarUrl,
      m.role,m.created_at AS createdAt FROM members m JOIN users u ON u.id=m.user_id WHERE m.worker_id=? ORDER BY m.created_at`,
      workerId,
    ).map(({ role, createdAt, ...user }) => ({ user, role, createdAt }));
  }

  removeMember(workerId: string, userId: string): void {
    this.run("DELETE FROM members WHERE worker_id=? AND user_id=? AND role!='owner'", workerId, userId);
  }

  deleteWorker(workerId: string): void {
    this.run("DELETE FROM workers WHERE id=?", workerId);
  }

  createInvite(input: WorkerInvite, createdBy: string, codeHash: string): void {
    this.run(
      "INSERT INTO invites(id,worker_id,created_by,code_hash,role,expires_at,max_uses) VALUES(?,?,?,?,?,?,?)",
      input.inviteId,
      input.workerId,
      createdBy,
      codeHash,
      input.role,
      input.expiresAt,
      input.maxUses,
    );
  }

  invites(workerId: string): WorkerInvite[] {
    return this.all<WorkerInvite>(
      `SELECT ${inviteColumns} FROM invites WHERE worker_id=? ORDER BY expires_at DESC`,
      workerId,
    );
  }

  revokeInvite(workerId: string, inviteId: string, now: number): void {
    this.run("UPDATE invites SET revoked_at=? WHERE worker_id=? AND id=?", now, workerId, inviteId);
  }

  redeemInvite(codeHash: string, userId: string, now: number): WorkerConnection {
    let workerId = "";
    this.db
      .transaction(() => {
        const invite = this.get<WorkerInvite>(
          `SELECT ${inviteColumns} FROM invites WHERE code_hash=? AND revoked_at IS NULL AND expires_at>?`,
          codeHash,
          now,
        );
        if (!invite) throw new HTTPException(404, { message: "Invitation is invalid or expired" });
        workerId = invite.workerId;
        if (this.worker(workerId, userId)) return;
        if (
          invite.uses >= invite.maxUses ||
          this.get("SELECT invite_id FROM invite_redemptions WHERE invite_id=? AND user_id=?", invite.inviteId, userId)
        ) {
          throw new HTTPException(409, { message: "Invitation has already been used" });
        }
        const owner = this.get<{ name: string; mode: string; relayUrl: string | null; directUrl: string | null }>(
          `SELECT c.name,c.mode,c.relay_url AS relayUrl,c.direct_url AS directUrl FROM connections c
        JOIN members m ON m.worker_id=c.worker_id AND m.user_id=c.user_id WHERE c.worker_id=? AND m.role='owner'`,
          workerId,
        );
        if (!owner) throw new Error("Worker owner connection is missing");
        this.run(
          "INSERT INTO members(worker_id,user_id,role,created_at) VALUES(?,?,?,?)",
          workerId,
          userId,
          invite.role,
          now,
        );
        this.run(
          "INSERT INTO connections(worker_id,user_id,name,mode,relay_url,direct_url) VALUES(?,?,?,?,?,?)",
          workerId,
          userId,
          owner.name,
          owner.mode,
          owner.relayUrl,
          owner.directUrl,
        );
        this.run("INSERT INTO invite_redemptions(invite_id,user_id) VALUES(?,?)", invite.inviteId, userId);
        this.run("UPDATE invites SET uses=uses+1 WHERE id=?", invite.inviteId);
      })
      .immediate();
    return this.requiredWorker(workerId, userId);
  }

  createShare(share: WorkerShare, createdBy: string): void {
    this.run(
      "INSERT INTO shares(id,worker_id,grant_id,label,anonymous,expires_at,created_by) VALUES(?,?,?,?,?,?,?)",
      share.shareId,
      share.workerId,
      share.grantId,
      share.label,
      Number(share.anonymous),
      share.expiresAt,
      createdBy,
    );
  }

  private shareResult(row: WorkerShare): WorkerShare {
    return { ...row, anonymous: Boolean(row.anonymous) };
  }

  shares(workerId: string): WorkerShare[] {
    return this.all<WorkerShare>(`SELECT ${shareColumns} FROM shares WHERE worker_id=? ORDER BY id`, workerId).map(
      (row) => this.shareResult(row),
    );
  }

  share(shareId: string, now: number): WorkerShare | null {
    const row = this.get<WorkerShare>(
      `SELECT ${shareColumns} FROM shares WHERE id=? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>?)`,
      shareId,
      now,
    );
    if (!row) return null;
    return this.shareResult(row);
  }

  /** Public descriptor excludes all account labels and users. */
  workerDescriptor(
    workerId: string,
  ): Pick<WorkerConnection, "workerId" | "workerPublicKey" | "workerSigningKey"> | null {
    const row = this.get<{ workerId: string; workerPublicKey: string; workerSigningKey: string }>(
      "SELECT id AS workerId,public_key AS workerPublicKey,signing_key AS workerSigningKey FROM workers WHERE id=?",
      workerId,
    );
    if (!row) return null;
    return {
      workerId: row.workerId,
      workerPublicKey: JSON.parse(row.workerPublicKey) as JsonWebKey,
      workerSigningKey: JSON.parse(row.workerSigningKey) as JsonWebKey,
    };
  }

  revokeShare(workerId: string, shareId: string, now: number): void {
    this.run("UPDATE shares SET revoked_at=? WHERE worker_id=? AND id=?", now, workerId, shareId);
  }

  cleanup(now: number): void {
    this.run("DELETE FROM sessions WHERE expires_at<=?", now);
    this.run("DELETE FROM challenges WHERE expires_at<=?", now);
  }
}
