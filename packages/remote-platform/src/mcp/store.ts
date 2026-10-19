import { Database } from "bun:sqlite";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { McpAccountToken, ServiceApproval } from "./types";

export class McpApprovalActivationError extends Error {}

export const tokenHash = (token: string) => createHash("sha256").update(token).digest("base64url");
export const opaqueToken = () => randomBytes(32).toString("base64url");
export interface OAuthClient {
  id: string;
  name: string;
  redirectUris: string[];
  expiresAt: number;
}
export interface OAuthPending {
  id: string;
  clientId: string;
  redirectUri: string;
  challenge: string;
  state: string | null;
  audience: string;
  organizationId: string | null;
  browserHash: string;
  userId: string | null;
  sessionHash: string | null;
  consentHash: string;
  expiresAt: number;
}
interface OAuthCode extends Omit<OAuthPending, "browserHash" | "consentHash" | "sessionHash"> {
  userId: string;
}

/** Secrets live outside the metadata database. Tokens are hashed; delegated worker material is AES-GCM encrypted. */
export class McpServiceStore {
  private readonly db: Database;
  private readonly key: Buffer;
  private readonly revocationListeners = new Set<(approvalId: string | null) => void>();
  constructor(options: { path: string; keyFile: string }) {
    mkdirSync(dirname(options.path), { recursive: true, mode: 0o700 });
    mkdirSync(dirname(options.keyFile), { recursive: true, mode: 0o700 });
    chmodSync(dirname(options.keyFile), 0o700);
    if (existsSync(options.path) && statSync(options.path).size > 0 && !existsSync(options.keyFile))
      throw new Error("MCP database exists but its broker key is missing; restore the matching key file");
    try {
      writeFileSync(options.keyFile, randomBytes(32), { flag: "wx", mode: 0o600 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    chmodSync(options.keyFile, 0o600);
    this.key = readFileSync(options.keyFile);
    if (this.key.length !== 32) throw new Error("REMOTE_BROKER_KEY_FILE must contain exactly 32 bytes");
    this.db = new Database(options.path, { create: true, strict: true });
    chmodSync(options.path, 0o600);
    this.db.exec(`PRAGMA journal_mode=DELETE; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS encrypted_approvals(id TEXT PRIMARY KEY, worker_id TEXT NOT NULL, principal_id TEXT NOT NULL, expires_at INTEGER NOT NULL, active INTEGER NOT NULL, ciphertext TEXT NOT NULL);
      CREATE UNIQUE INDEX IF NOT EXISTS approval_active_subject ON encrypted_approvals(worker_id,principal_id) WHERE active=1;
      CREATE TABLE IF NOT EXISTS oauth_clients(id TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS oauth_pending(id TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS oauth_codes(hash TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS oauth_tokens(hash TEXT PRIMARY KEY, id TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL, client_id TEXT NOT NULL, audience TEXT NOT NULL, organization_id TEXT, expires_at INTEGER NOT NULL);
    `);
  }
  close() {
    for (const listener of this.revocationListeners) listener("*");
    this.revocationListeners.clear();
    this.db.close();
    this.key.fill(0);
  }
  onRevoke(listener: (approvalId: string | null) => void) {
    this.revocationListeners.add(listener);
    return () => this.revocationListeners.delete(listener);
  }
  private seal(id: string, value: unknown) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(Buffer.from(`homarr-mcp-approval-v1:${id}`));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
  }
  private open(id: string, ciphertext: string): ServiceApproval {
    const bytes = Buffer.from(ciphertext, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", this.key, bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(`homarr-mcp-approval-v1:${id}`));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"),
    ) as ServiceApproval;
  }
  saveApproval(approval: ServiceApproval, now = Date.now()): ServiceApproval {
    let supersededId: string | null = null;
    const saved = this.db
      .transaction(() => {
        const existing = this.approval(approval.id, now);
        if (approval.grant) {
          if (
            approval.grant.expiresAt <= now ||
            approval.expiresAt <= now ||
            !existing ||
            existing.grant ||
            existing.createdAt + 300_000 <= now ||
            existing.workerId !== approval.workerId ||
            existing.userId !== approval.userId ||
            existing.organizationId !== approval.organizationId ||
            existing.principalId !== approval.principalId ||
            existing.audience !== approval.audience ||
            existing.createdAt !== approval.createdAt ||
            existing.deviceId !== approval.deviceId ||
            JSON.stringify(existing.devicePublicJwk) !== JSON.stringify(approval.devicePublicJwk) ||
            JSON.stringify(existing.privateJwk) !== JSON.stringify(approval.privateJwk)
          )
            throw new McpApprovalActivationError("Pending MCP approval expired, changed or was canceled");
        } else if (existing?.grant) throw new McpApprovalActivationError("MCP approval was already activated");
        let previousApprovalId: string | null = null;
        if (approval.grant) {
          const previous = this.currentApproval(approval.workerId, approval.principalId, now);
          if (
            previous &&
            previous.organizationId === approval.organizationId &&
            previous.audience === approval.audience
          )
            previousApprovalId = previous.id;
          const row = this.db
            .query<{ id: string }, [string, string]>(
              "SELECT id FROM encrypted_approvals WHERE worker_id=? AND principal_id=? AND active=1",
            )
            .get(approval.workerId, approval.principalId);
          supersededId = row?.id ?? null;
          this.db
            .query("UPDATE encrypted_approvals SET active=0 WHERE worker_id=? AND principal_id=? AND active=1")
            .run(approval.workerId, approval.principalId);
        }
        const value = { ...approval, previousApprovalId, current: Boolean(approval.grant) };
        this.db
          .query(
            "INSERT OR REPLACE INTO encrypted_approvals(id,worker_id,principal_id,expires_at,active,ciphertext) VALUES(?,?,?,?,?,?)",
          )
          .run(
            value.id,
            value.workerId,
            value.principalId,
            value.grant ? value.expiresAt : value.createdAt + 300_000,
            Number(value.current),
            this.seal(value.id, value),
          );
        return value;
      })
      .immediate();
    if (supersededId) for (const listener of this.revocationListeners) listener(supersededId);
    return saved;
  }
  approval(id: string, now: number): ServiceApproval | null {
    const row = this.db
      .query<{ ciphertext: string; active: number }, [string, number]>(
        "SELECT ciphertext,active FROM encrypted_approvals WHERE id=? AND expires_at>?",
      )
      .get(id, now);
    if (!row) return null;
    return { ...this.open(id, row.ciphertext), current: Boolean(row.active) };
  }
  approvals(now: number): ServiceApproval[] {
    return this.db
      .query<{ id: string; ciphertext: string; active: number }, [number]>(
        "SELECT id,ciphertext,active FROM encrypted_approvals WHERE expires_at>?",
      )
      .all(now)
      .map((row) => ({ ...this.open(row.id, row.ciphertext), current: Boolean(row.active) }));
  }
  currentApproval(workerId: string, principalId: string, now: number): ServiceApproval | null {
    const row = this.db
      .query<{ id: string; ciphertext: string }, [string, string, number]>(
        "SELECT id,ciphertext FROM encrypted_approvals WHERE worker_id=? AND principal_id=? AND active=1 AND expires_at>?",
      )
      .get(workerId, principalId, now);
    if (!row) return null;
    const approval = this.open(row.id, row.ciphertext);
    if (!approval.grant || approval.grant.expiresAt <= now) return null;
    return { ...approval, current: true };
  }
  revokeApproval(id: string, options: { rollback?: boolean; retain?: boolean; now?: number } = {}) {
    const now = options.now ?? Date.now();
    const restoredApprovalId = this.db
      .transaction(() => {
        const removed = this.approval(id, now);
        if (options.retain && removed?.grant)
          this.db.query("UPDATE encrypted_approvals SET active=0 WHERE id=?").run(id);
        else this.db.query("DELETE FROM encrypted_approvals WHERE id=?").run(id);
        if (!options.rollback || !removed?.current || !removed.previousApprovalId) return null;
        const previous = this.approval(removed.previousApprovalId, now);
        if (
          !previous?.grant ||
          previous.current ||
          previous.grant.expiresAt <= now ||
          previous.workerId !== removed.workerId ||
          previous.principalId !== removed.principalId ||
          previous.organizationId !== removed.organizationId ||
          previous.audience !== removed.audience
        )
          return null;
        this.db.query("UPDATE encrypted_approvals SET active=1 WHERE id=?").run(previous.id);
        return previous.id;
      })
      .immediate();
    for (const listener of this.revocationListeners) listener(id);
    return { restoredApprovalId };
  }
  canRegisterClient(now: number) {
    this.cleanup(now);
    const result = this.db.query<{ count: number }, []>("SELECT count(*) AS count FROM oauth_clients").get();
    return (result?.count ?? 0) < 10_000;
  }
  saveClient(client: OAuthClient) {
    this.db
      .query("INSERT INTO oauth_clients(id,value,expires_at) VALUES(?,?,?)")
      .run(client.id, JSON.stringify(client), client.expiresAt);
  }
  client(id: string, now: number): OAuthClient | null {
    const row = this.db
      .query<{ value: string }, [string, number]>("SELECT value FROM oauth_clients WHERE id=? AND expires_at>?")
      .get(id, now);
    if (!row) return null;
    return JSON.parse(row.value) as OAuthClient;
  }
  savePending(value: OAuthPending) {
    this.db
      .query("INSERT OR REPLACE INTO oauth_pending(id,value,expires_at) VALUES(?,?,?)")
      .run(value.id, JSON.stringify(value), value.expiresAt);
  }
  pending(id: string, now: number): OAuthPending | null {
    const row = this.db
      .query<{ value: string }, [string, number]>("SELECT value FROM oauth_pending WHERE id=? AND expires_at>?")
      .get(id, now);
    if (!row) return null;
    return JSON.parse(row.value) as OAuthPending;
  }
  decide(pending: OAuthPending, userId: string, approved: boolean, now: number): string | null {
    return this.db
      .transaction(() => {
        const consumed = this.db.query("DELETE FROM oauth_pending WHERE id=? AND expires_at>?").run(pending.id, now);
        if (consumed.changes !== 1) throw new Error("Consent expired");
        if (!approved) return null;
        const code = opaqueToken();
        this.db
          .query("INSERT INTO oauth_codes(hash,value,expires_at) VALUES(?,?,?)")
          .run(tokenHash(code), JSON.stringify({ ...pending, userId, expiresAt: now + 60_000 }), now + 60_000);
        return code;
      })
      .immediate();
  }
  consumeCode(code: string, now: number): OAuthCode | null {
    return this.db
      .transaction(() => {
        const row = this.db
          .query<{ value: string }, [string, number]>("SELECT value FROM oauth_codes WHERE hash=? AND expires_at>?")
          .get(tokenHash(code), now);
        this.db.query("DELETE FROM oauth_codes WHERE hash=?").run(tokenHash(code));
        if (!row) return null;
        return JSON.parse(row.value) as OAuthCode;
      })
      .immediate();
  }
  saveToken(token: string, value: McpAccountToken) {
    this.db
      .query(
        "INSERT INTO oauth_tokens(hash,id,user_id,client_id,audience,organization_id,expires_at) VALUES(?,?,?,?,?,?,?)",
      )
      .run(
        tokenHash(token),
        value.id,
        value.userId,
        value.clientId,
        value.audience,
        value.organizationId,
        value.expiresAt,
      );
  }
  token(token: string, now: number): McpAccountToken | null {
    return this.db
      .query<McpAccountToken, [string, number]>(
        `SELECT id,user_id AS userId,client_id AS clientId,audience,organization_id AS organizationId,expires_at AS expiresAt FROM oauth_tokens WHERE hash=? AND expires_at>?`,
      )
      .get(tokenHash(token), now);
  }
  revokeToken(token: string) {
    this.db.query("DELETE FROM oauth_tokens WHERE hash=?").run(tokenHash(token));
    for (const listener of this.revocationListeners) listener(null);
  }
  revokeUserTokens(userId: string, organizationId?: string) {
    if (organizationId)
      this.db.query("DELETE FROM oauth_tokens WHERE user_id=? AND organization_id=?").run(userId, organizationId);
    else this.db.query("DELETE FROM oauth_tokens WHERE user_id=?").run(userId);
    for (const listener of this.revocationListeners) listener(null);
  }
  cleanup(now: number) {
    for (const table of ["encrypted_approvals", "oauth_clients", "oauth_pending", "oauth_codes", "oauth_tokens"])
      this.db.query(`DELETE FROM ${table} WHERE expires_at<=?`).run(now);
  }
}
