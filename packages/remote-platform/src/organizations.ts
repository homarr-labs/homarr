import type { Database, SQLQueryBindings } from "bun:sqlite";
import { HTTPException } from "hono/http-exception";
import type {
  Organization,
  OrganizationInvite,
  OrganizationMember,
  OrganizationWorkerConnection,
  OrganizationWorkerPurpose,
  PlatformUser,
  WorkerConnection,
  WorkerRole,
} from "./types";

const inviteColumns = `id AS inviteId,organization_id AS organizationId,role,expires_at AS expiresAt,
  max_uses AS maxUses,uses,revoked_at AS revokedAt`;

interface OrganizationWorkerRow extends Omit<
  OrganizationWorkerConnection,
  "workerPublicKey" | "workerSigningKey" | "accessStatus"
> {
  workerPublicKey: string;
  workerSigningKey: string;
}

/** Public organization directory metadata. Worker grants and private keys never enter this store. */
export class OrganizationStore {
  constructor(private readonly db: Database) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS organizations (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS organization_members (
          organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK(role IN ('owner','admin','member')), created_at INTEGER NOT NULL,
          PRIMARY KEY(organization_id,user_id)
        );
        CREATE UNIQUE INDEX IF NOT EXISTS organization_one_owner
          ON organization_members(organization_id) WHERE role='owner';
        CREATE TABLE IF NOT EXISTS organization_invites (
          id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          created_by TEXT NOT NULL REFERENCES users(id), code_hash TEXT NOT NULL UNIQUE,
          role TEXT NOT NULL CHECK(role IN ('admin','member')), expires_at INTEGER NOT NULL,
          max_uses INTEGER NOT NULL, uses INTEGER NOT NULL DEFAULT 0, revoked_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS organization_invite_redemptions (
          invite_id TEXT NOT NULL REFERENCES organization_invites(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          PRIMARY KEY(invite_id,user_id)
        );
        CREATE TABLE IF NOT EXISTS organization_workers (
          organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          worker_id TEXT NOT NULL UNIQUE REFERENCES workers(id) ON DELETE CASCADE,
          purpose TEXT NOT NULL CHECK(purpose IN ('primary','integrations')),
          name TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('direct','relay')),
          direct_url TEXT,relay_url TEXT,created_at INTEGER NOT NULL,
          PRIMARY KEY(organization_id,worker_id)
        );
        CREATE UNIQUE INDEX IF NOT EXISTS organization_one_primary
          ON organization_workers(organization_id) WHERE purpose='primary';
        CREATE TRIGGER IF NOT EXISTS organization_promote_primary AFTER DELETE ON organization_workers
          WHEN OLD.purpose='primary'
          BEGIN
            UPDATE organization_workers SET purpose='primary'
            WHERE organization_id=OLD.organization_id AND worker_id=(
              SELECT worker_id FROM organization_workers WHERE organization_id=OLD.organization_id
              ORDER BY created_at,worker_id LIMIT 1
            );
          END;
        CREATE TABLE IF NOT EXISTS organization_connections (
          organization_id TEXT NOT NULL,worker_id TEXT NOT NULL,user_id TEXT NOT NULL,
          mode TEXT NOT NULL CHECK(mode IN ('direct','relay')),direct_url TEXT,relay_url TEXT,
          PRIMARY KEY(organization_id,worker_id,user_id),
          FOREIGN KEY(organization_id,worker_id) REFERENCES organization_workers(organization_id,worker_id) ON DELETE CASCADE,
          FOREIGN KEY(organization_id,user_id) REFERENCES organization_members(organization_id,user_id) ON DELETE CASCADE
        );
      `);
      const version = db.query<{ user_version: number }, []>("PRAGMA user_version").get();
      if (!version || version.user_version < 2) db.exec("PRAGMA user_version = 2");
    }).immediate();
  }

  private all<T>(sql: string, ...params: SQLQueryBindings[]): T[] {
    return this.db.query<T, SQLQueryBindings[]>(sql).all(...params);
  }

  private one<T>(sql: string, ...params: SQLQueryBindings[]): T | null {
    return this.db.query<T, SQLQueryBindings[]>(sql).get(...params);
  }

  private run(sql: string, ...params: SQLQueryBindings[]): void {
    this.db.query(sql).run(...params);
  }

  list(userId: string): Organization[] {
    return this.all<Organization>(
      `SELECT o.id AS organizationId,o.name,m.role,o.created_at AS createdAt
       FROM organizations o JOIN organization_members m ON m.organization_id=o.id
       WHERE m.user_id=? ORDER BY o.name,o.id`,
      userId,
    );
  }

  get(organizationId: string, userId: string): Organization | null {
    return this.list(userId).find((organization) => organization.organizationId === organizationId) ?? null;
  }

  create(organizationId: string, name: string, userId: string, now: number): Organization {
    this.db
      .transaction(() => {
        this.db.query("INSERT INTO organizations(id,name,created_at) VALUES(?,?,?)").run(organizationId, name, now);
        this.db
          .query("INSERT INTO organization_members(organization_id,user_id,role,created_at) VALUES(?,?,'owner',?)")
          .run(organizationId, userId, now);
      })
      .immediate();
    return { organizationId, name, role: "owner", createdAt: now };
  }

  members(organizationId: string): OrganizationMember[] {
    return this.all<PlatformUser & { role: WorkerRole; createdAt: number }>(
      `SELECT u.id,u.workshop_id AS workshopId,u.login,u.name,u.avatar_url AS avatarUrl,
       m.role,m.created_at AS createdAt FROM organization_members m JOIN users u ON u.id=m.user_id
       WHERE m.organization_id=? ORDER BY m.created_at,u.id`,
      organizationId,
    ).map(({ role, createdAt, ...user }) => ({ user, role, createdAt }));
  }

  removeMember(organizationId: string, userId: string, now: number): void {
    this.db
      .transaction(() => {
        this.run(
          "DELETE FROM organization_members WHERE organization_id=? AND user_id=? AND role!='owner'",
          organizationId,
          userId,
        );
        this.run(
          "UPDATE organization_invites SET revoked_at=? WHERE organization_id=? AND created_by=? AND revoked_at IS NULL",
          now,
          organizationId,
          userId,
        );
      })
      .immediate();
  }

  updateMember(organizationId: string, userId: string, role: Exclude<WorkerRole, "owner">, now: number): void {
    this.db
      .transaction(() => {
        this.run(
          "UPDATE organization_members SET role=? WHERE organization_id=? AND user_id=? AND role!='owner'",
          role,
          organizationId,
          userId,
        );
        if (role === "member")
          this.run(
            "UPDATE organization_invites SET revoked_at=? WHERE organization_id=? AND created_by=? AND revoked_at IS NULL",
            now,
            organizationId,
            userId,
          );
      })
      .immediate();
  }

  rename(organizationId: string, name: string): void {
    this.run("UPDATE organizations SET name=? WHERE id=?", name, organizationId);
  }

  delete(organizationId: string): void {
    this.run("DELETE FROM organizations WHERE id=?", organizationId);
  }

  createInvite(invite: OrganizationInvite, createdBy: string, codeHash: string): void {
    this.run(
      `INSERT INTO organization_invites(id,organization_id,created_by,code_hash,role,expires_at,max_uses)
       VALUES(?,?,?,?,?,?,?)`,
      invite.inviteId,
      invite.organizationId,
      createdBy,
      codeHash,
      invite.role,
      invite.expiresAt,
      invite.maxUses,
    );
  }

  invites(organizationId: string): OrganizationInvite[] {
    return this.all<OrganizationInvite>(
      `SELECT ${inviteColumns} FROM organization_invites WHERE organization_id=? ORDER BY expires_at DESC,id`,
      organizationId,
    );
  }

  revokeInvite(organizationId: string, inviteId: string, now: number): void {
    this.run(
      "UPDATE organization_invites SET revoked_at=? WHERE organization_id=? AND id=?",
      now,
      organizationId,
      inviteId,
    );
  }

  redeemInvite(codeHash: string, userId: string, now: number): Organization {
    return this.db
      .transaction(() => {
        const invite = this.one<OrganizationInvite>(
          `SELECT ${inviteColumns} FROM organization_invites WHERE code_hash=? AND revoked_at IS NULL AND expires_at>?`,
          codeHash,
          now,
        );
        if (!invite) throw new HTTPException(404, { message: "Invitation is invalid or expired" });
        const existing = this.get(invite.organizationId, userId);
        if (existing) return existing;
        if (
          invite.uses >= invite.maxUses ||
          this.one(
            "SELECT invite_id FROM organization_invite_redemptions WHERE invite_id=? AND user_id=?",
            invite.inviteId,
            userId,
          )
        )
          throw new HTTPException(409, { message: "Invitation has already been used" });
        this.run(
          "INSERT INTO organization_members(organization_id,user_id,role,created_at) VALUES(?,?,?,?)",
          invite.organizationId,
          userId,
          invite.role,
          now,
        );
        this.run("INSERT INTO organization_invite_redemptions(invite_id,user_id) VALUES(?,?)", invite.inviteId, userId);
        this.run("UPDATE organization_invites SET uses=uses+1 WHERE id=?", invite.inviteId);
        const organization = this.get(invite.organizationId, userId);
        if (!organization) throw new Error("Organization membership is missing");
        return organization;
      })
      .immediate();
  }

  workers(organizationId: string, userId: string): OrganizationWorkerConnection[] {
    return this.all<OrganizationWorkerRow>(
      `SELECT ow.organization_id AS organizationId,ow.worker_id AS workerId,ow.purpose,ow.name,m.role,
       w.public_key AS workerPublicKey,w.signing_key AS workerSigningKey,
       CASE WHEN c.user_id IS NULL THEN ow.mode ELSE c.mode END AS mode,
       CASE WHEN c.user_id IS NULL THEN ow.direct_url ELSE c.direct_url END AS directUrl,
       CASE WHEN c.user_id IS NULL THEN ow.relay_url ELSE c.relay_url END AS relayUrl
       FROM organization_workers ow JOIN workers w ON w.id=ow.worker_id
       JOIN organization_members m ON m.organization_id=ow.organization_id AND m.user_id=?
       LEFT JOIN organization_connections c ON c.organization_id=ow.organization_id AND c.worker_id=ow.worker_id AND c.user_id=m.user_id
       WHERE ow.organization_id=? ORDER BY ow.purpose DESC,ow.created_at,ow.worker_id`,
      userId,
      organizationId,
    ).map((row) => ({
      ...row,
      workerPublicKey: JSON.parse(row.workerPublicKey) as JsonWebKey,
      workerSigningKey: JSON.parse(row.workerSigningKey) as JsonWebKey,
      accessStatus: "requiresWorkerGrant",
    }));
  }

  worker(organizationId: string, workerId: string, userId: string): OrganizationWorkerConnection | null {
    return this.workers(organizationId, userId).find((worker) => worker.workerId === workerId) ?? null;
  }

  attachWorker(
    organizationId: string,
    worker: WorkerConnection,
    purpose: OrganizationWorkerPurpose | undefined,
    now: number,
  ): void {
    this.db
      .transaction(() => {
        if (this.one("SELECT worker_id FROM organization_workers WHERE worker_id=?", worker.workerId))
          throw new HTTPException(409, { message: "Worker already belongs to an organization" });
        const primary = this.one(
          "SELECT worker_id FROM organization_workers WHERE organization_id=? AND purpose='primary'",
          organizationId,
        );
        let nextPurpose: OrganizationWorkerPurpose = "integrations";
        if (!primary) nextPurpose = "primary";
        if (purpose) nextPurpose = purpose;
        if (!primary && nextPurpose !== "primary")
          throw new HTTPException(409, { message: "The first worker must be the primary" });
        if (nextPurpose === "primary")
          this.run(
            "UPDATE organization_workers SET purpose='integrations' WHERE organization_id=? AND purpose='primary'",
            organizationId,
          );
        this.run(
          `INSERT INTO organization_workers(organization_id,worker_id,purpose,name,mode,direct_url,relay_url,created_at)
        VALUES(?,?,?,?,?,?,?,?)`,
          organizationId,
          worker.workerId,
          nextPurpose,
          worker.name,
          worker.mode,
          worker.directUrl,
          worker.relayUrl,
          now,
        );
      })
      .immediate();
  }

  updateWorker(
    organizationId: string,
    workerId: string,
    input: Partial<Pick<OrganizationWorkerConnection, "name" | "purpose">>,
  ): void {
    this.db
      .transaction(() => {
        const worker = this.one<{ purpose: OrganizationWorkerPurpose }>(
          "SELECT purpose FROM organization_workers WHERE organization_id=? AND worker_id=?",
          organizationId,
          workerId,
        );
        if (!worker) throw new HTTPException(404, { message: "Worker not found" });
        if (input.purpose === "integrations" && worker.purpose === "primary")
          throw new HTTPException(409, { message: "Select another primary worker first" });
        if (input.purpose === "primary") {
          this.run(
            "UPDATE organization_workers SET purpose='integrations' WHERE organization_id=? AND purpose='primary'",
            organizationId,
          );
          this.run(
            "UPDATE organization_workers SET purpose='primary' WHERE organization_id=? AND worker_id=?",
            organizationId,
            workerId,
          );
        }
        if (input.name !== undefined)
          this.run(
            "UPDATE organization_workers SET name=? WHERE organization_id=? AND worker_id=?",
            input.name,
            organizationId,
            workerId,
          );
      })
      .immediate();
  }

  detachWorker(organizationId: string, workerId: string): void {
    this.db
      .transaction(() => {
        this.run("DELETE FROM organization_workers WHERE organization_id=? AND worker_id=?", organizationId, workerId);
        if (
          this.one(
            "SELECT worker_id FROM organization_workers WHERE organization_id=? AND purpose='primary'",
            organizationId,
          )
        )
          return;
        const next = this.one<{ workerId: string }>(
          "SELECT worker_id AS workerId FROM organization_workers WHERE organization_id=? ORDER BY created_at,worker_id LIMIT 1",
          organizationId,
        );
        if (next)
          this.run(
            "UPDATE organization_workers SET purpose='primary' WHERE organization_id=? AND worker_id=?",
            organizationId,
            next.workerId,
          );
      })
      .immediate();
  }

  updateConnection(
    organizationId: string,
    workerId: string,
    userId: string,
    connection: Pick<WorkerConnection, "mode" | "directUrl" | "relayUrl">,
  ): void {
    this.run(
      `INSERT INTO organization_connections(organization_id,worker_id,user_id,mode,direct_url,relay_url)
      VALUES(?,?,?,?,?,?) ON CONFLICT(organization_id,worker_id,user_id) DO UPDATE SET
      mode=excluded.mode,direct_url=excluded.direct_url,relay_url=excluded.relay_url`,
      organizationId,
      workerId,
      userId,
      connection.mode,
      connection.directUrl,
      connection.relayUrl,
    );
  }
}
