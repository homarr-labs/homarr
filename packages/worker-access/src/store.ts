import { Database } from "bun:sqlite";
import { chmodSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { hash, randomSecret } from "./crypto";
import type { AccessGrant } from "./types";

export class AccessStore {
  readonly db: Database;
  readonly secretPath: string;

  constructor(readonly directory: string) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    chmodSync(directory, 0o700);
    const filename = join(directory, "access.sqlite");
    this.secretPath = join(directory, "pairing-secret");
    this.db = new Database(filename, { create: true, strict: true });
    chmodSync(filename, 0o600);
    this.db.exec(`
      PRAGMA journal_mode=DELETE;
      PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS grants (
        id TEXT PRIMARY KEY, payload TEXT NOT NULL, token TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS invitations (
        id TEXT PRIMARY KEY, payload TEXT NOT NULL, token TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0,
        revoked INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY, public_key TEXT NOT NULL, account_id TEXT
      );
    `);
  }

  async initialize(workerId: string) {
    const existing = this.state("workerId");
    if (existing && existing !== workerId)
      throw new Error("Worker signing identity changed; access store cannot be reused");
    if (existing) return;
    // Exclusive file creation keeps concurrent first launches on the same 256-bit secret.
    try {
      writeFileSync(this.secretPath, randomSecret(), { encoding: "utf8", mode: 0o600, flag: "wx" });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    chmodSync(this.secretPath, 0o600);
    const secretHash = await hash(readFileSync(this.secretPath, "utf8"));
    this.db
      .transaction(() => {
        if (this.state("workerId")) return;
        this.setState("workerId", workerId);
        this.setState("claimHash", secretHash);
        this.setState("claimAttempts", "0");
        this.setState("claimLockedUntil", "0");
      })
      .immediate();
  }

  state(key: string) {
    const row = this.db.query<{ value: string }, [string]>("SELECT value FROM state WHERE key = ?").get(key);
    return row?.value ?? null;
  }

  setState(key: string, value: string) {
    this.db.query("INSERT OR REPLACE INTO state (key, value) VALUES (?, ?)").run(key, value);
  }

  localSecret() {
    if (!this.state("claimHash")) return null;
    return readFileSync(this.secretPath, "utf8");
  }

  removeLocalSecret() {
    try {
      unlinkSync(this.secretPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  insertGrant(grant: AccessGrant, token: string) {
    this.db
      .query("INSERT INTO grants (id, payload, token) VALUES (?, ?, ?)")
      .run(grant.id, JSON.stringify(grant), token);
  }

  grant(id: string) {
    return this.db
      .query<{ payload: string; token: string; revoked: number }, [string]>(
        "SELECT payload, token, revoked FROM grants WHERE id = ?",
      )
      .get(id);
  }

  close() {
    this.db.close();
  }
}
