import { describe, expect, test } from "bun:test";

import { generateDeviceIdentity, getWorkerId } from "@homarr/remote-protocol";

import type { ConnectionInput, SavedWorker, WorkerConnection } from "./connection";
import { WorkerConnectionPool } from "./pool";
import type { WorkerVault } from "./pool";

async function saved(name: string): Promise<SavedWorker> {
  const identity = await generateDeviceIdentity(false);
  const workerId = await getWorkerId(identity.publicJwk);
  return {
    workerId,
    name,
    pinnedIdentity: identity.publicJwk,
    deviceIdentity: identity,
    credential: { kind: "grant", token: `token-${name}` },
    mode: "direct",
    directUrl: "https://worker.test",
    relayUrl: "",
    relayCapability: "route-capability",
    grant: { id: `grant-${name}`, token: `token-${name}`, role: "owner", boardIds: [], expiresAt: null },
  };
}

function vault(initial: SavedWorker[] = []): WorkerVault {
  const workers = new Map(initial.map((worker) => [worker.workerId, worker]));
  return {
    list: async () => [...workers.values()],
    save: async (worker) => {
      workers.set(worker.workerId, worker);
    },
    forget: async (id) => {
      workers.delete(id);
    },
  };
}

function transport(worker: SavedWorker): WorkerConnection {
  return {
    deviceIdentity: worker.deviceIdentity,
    authorization: { grant: worker.grant },
    close() {},
    fetch: async () => Response.json({ workerId: worker.workerId }),
  };
}

describe("browser worker connections", () => {
  test("two workers retain independent connections and switching primary changes the cache scope", async () => {
    const first = await saved("first");
    const second = await saved("second");
    const workers = new Map([first, second].map((worker) => [worker.workerId, worker]));
    const pool = new WorkerConnectionPool({
      vault: vault(),
      open: async (input) => {
        const worker = workers.get(input.workerId);
        if (!worker) throw new Error("Unknown worker");
        return { worker, connection: transport(worker) };
      },
    });
    await pool.connectInput(first);
    const firstScope = pool.getSnapshot().primaryScope;
    await pool.connectInput(second);
    pool.setPrimary(second.workerId);
    expect(await (await pool.getConnection().fetch("/remote/info")).json()).toEqual({ workerId: second.workerId });
    expect(await (await pool.getConnection(first.workerId).fetch("/remote/info")).json()).toEqual({
      workerId: first.workerId,
    });
    expect(pool.getSnapshot().primaryScope).not.toBe(firstScope);
    pool.setPrimary(first.workerId);
    expect(pool.getSnapshot().primaryScope).toBe(firstScope);
    pool.disconnect(second.workerId);
    expect(pool.getSnapshot().workers.find((entry) => entry.worker.workerId === first.workerId)?.connected).toBe(true);
    expect(() => pool.getConnection(second.workerId)).toThrow("offline");
  });

  test("restores the same private device and refuses a changed worker identity", async () => {
    const worker = await saved("remembered");
    const changed = await saved("changed");
    let observed: ConnectionInput | undefined;
    let opened = 0;
    const pool = new WorkerConnectionPool({
      vault: vault([worker]),
      open: async (input) => {
        opened++;
        observed = input;
        return { worker, connection: transport(worker) };
      },
    });
    await pool.hydrate();
    await pool.restore(worker.workerId);
    expect(observed?.deviceIdentity).toBe(worker.deviceIdentity);
    await expect(pool.connectInput({ ...worker, pinnedIdentity: changed.pinnedIdentity })).rejects.toThrow("identity");
    expect(opened).toBe(1);
    expect(pool.getConnection(worker.workerId)).toBeDefined();
  });

  test("a disconnected pending handshake cannot silently reconnect or replace another device", async () => {
    const worker = await saved("pending");
    let finish!: (result: { worker: SavedWorker; connection: WorkerConnection }) => void;
    let closed = 0;
    const connection = {
      ...transport(worker),
      close: () => {
        closed++;
      },
    };
    const pool = new WorkerConnectionPool({
      vault: vault(),
      open: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    });
    const pending = pool.connectInput(worker);
    await new Promise((resolve) => setTimeout(resolve, 0));
    pool.disconnect(worker.workerId);
    finish({ worker, connection });
    await expect(pending).rejects.toThrow("cancelled");
    expect(closed).toBe(1);
    expect(() => pool.getConnection(worker.workerId)).toThrow("offline");
  });

  test("anonymous sharing never replaces the durable owner grant in the vault", async () => {
    const owner = await saved("owner");
    const storage = vault([owner]);
    const shared = {
      ...owner,
      credential: { kind: "share" as const, token: "share" },
      grant: { ...owner.grant, id: "share", role: "viewer" as const },
    };
    const pool = new WorkerConnectionPool({
      vault: storage,
      open: async () => ({ worker: shared, connection: transport(shared) }),
    });
    await pool.connectInput(shared);
    expect((await storage.list())[0]?.credential).toEqual(owner.credential);
    expect(pool.getWorker()?.grant.role).toBe("viewer");
  });
});
