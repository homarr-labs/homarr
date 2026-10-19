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
      singleWorker: true,
      vault: storage,
      open: async () => ({ worker: shared, connection: transport(shared) }),
    });
    await pool.connectInput(shared);
    expect((await storage.list())[0]?.credential).toEqual(owner.credential);
    expect(pool.getWorker()?.grant.role).toBe("viewer");
  });
  test("single-worker hydration exposes only the remembered primary and preserves other saved access", async () => {
    const first = await saved("first");
    const second = await saved("second");
    const storage = vault([first, second]);
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    let preferred = second.workerId;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: () => preferred,
          setItem: (_key: string, value: string) => {
            preferred = value;
          },
        },
      },
    });
    try {
      const pool = new WorkerConnectionPool({ singleWorker: true, vault: storage });
      await pool.hydrate();
      expect(pool.getSnapshot().workers.map((entry) => entry.worker.workerId)).toEqual([second.workerId]);
      expect(pool.getSnapshot().primaryWorkerId).toBe(second.workerId);
      expect(await storage.list()).toEqual([first, second]);
      await pool.forget(second.workerId);
      expect(pool.getSnapshot().workers).toEqual([]);
      expect(pool.getSnapshot().primaryWorkerId).toBeNull();
      expect(await storage.list()).toEqual([first]);
      const reloaded = new WorkerConnectionPool({ singleWorker: true, vault: storage });
      await reloaded.hydrate();
      expect(reloaded.getSnapshot().workers).toEqual([]);
      expect(reloaded.getSnapshot().primaryWorkerId).toBeNull();
    } finally {
      if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
      else Reflect.deleteProperty(globalThis, "window");
    }
  });

  test("single-worker replacement preserves the working connection on failure and closes it on success", async () => {
    const first = await saved("first");
    const second = await saved("second");
    let closed = 0;
    let fail = false;
    const original = {
      ...transport(first),
      close: () => {
        closed++;
      },
    };
    const pool = new WorkerConnectionPool({
      singleWorker: true,
      vault: vault(),
      open: async (input) => {
        if (fail) throw new Error("Unavailable");
        if (input.workerId === first.workerId) return { worker: first, connection: original };
        return { worker: second, connection: transport(second) };
      },
    });
    await pool.connectInput(first);
    const scope = pool.getSnapshot().primaryScope;
    fail = true;
    await expect(pool.connectInput(first)).rejects.toThrow("Unavailable");
    expect(pool.getConnection()).toBe(original);
    expect(pool.getSnapshot().primaryScope).toBe(scope);
    await expect(pool.connectInput(second)).rejects.toThrow("Unavailable");
    expect(pool.getConnection()).toBe(original);
    expect(pool.getSnapshot().primaryScope).toBe(scope);
    expect(closed).toBe(0);
    fail = false;
    await pool.connectInput(second);
    expect(closed).toBe(1);
    expect(pool.getSnapshot().workers.map((entry) => entry.worker.workerId)).toEqual([second.workerId]);
    expect(pool.getSnapshot().primaryWorkerId).toBe(second.workerId);
    expect(pool.getSnapshot().primaryScope).not.toBe(scope);
    await pool.forget(second.workerId);
    expect(pool.getSnapshot().workers).toEqual([]);
    expect(pool.getSnapshot().primaryWorkerId).toBeNull();
  });

  test("single-worker replacement cancels an older restore before it can reinstate another worker", async () => {
    const first = await saved("first");
    const second = await saved("second");
    let finish!: (result: { worker: SavedWorker; connection: WorkerConnection }) => void;
    let opened!: () => void;
    const started = new Promise<void>((resolve) => {
      opened = resolve;
    });
    let closed = 0;
    const pool = new WorkerConnectionPool({
      singleWorker: true,
      vault: vault([first]),
      open: async (input) => {
        if (input.workerId === second.workerId) return { worker: second, connection: transport(second) };
        opened();
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    });
    const restoring = pool.restore(first.workerId);
    await started;
    await pool.connectInput(second);
    finish({
      worker: first,
      connection: {
        ...transport(first),
        close: () => {
          closed++;
        },
      },
    });
    await expect(restoring).rejects.toThrow("cancelled");
    expect(closed).toBe(1);
    expect(pool.getSnapshot().workers.map((entry) => entry.worker.workerId)).toEqual([second.workerId]);
    expect(() => pool.getConnection(first.workerId)).toThrow("offline");
  });

  test("closing single-worker mode during hydration cancels a pending connection", async () => {
    const worker = await saved("pending");
    let finish!: (workers: SavedWorker[]) => void;
    let opened = false;
    const pool = new WorkerConnectionPool({
      singleWorker: true,
      vault: {
        ...vault(),
        list: () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      },
      open: async () => {
        opened = true;
        return { worker, connection: transport(worker) };
      },
    });
    const pending = pool.connectInput(worker);
    pool.close();
    finish([]);
    await expect(pending).rejects.toThrow("cancelled");
    expect(opened).toBe(false);
    expect(pool.getSnapshot().workers).toEqual([]);
  });
  test("returning to a hidden worker with a consumed invite reuses only its matching saved grant", async () => {
    const first = await saved("first");
    const second = await saved("second");
    let observed: ConnectionInput | undefined;
    const pool = new WorkerConnectionPool({
      singleWorker: true,
      vault: vault(),
      open: async (input) => {
        observed = input;
        if (input.credential.kind !== "grant") throw new Error("Invite already consumed");
        const worker = input.workerId === first.workerId ? first : second;
        return { worker, connection: transport(worker) };
      },
    });
    await pool.connectInput(first);
    await pool.connectInput(second);
    await pool.connectInput({ ...first, credential: { kind: "invite", token: "consumed" }, deviceIdentity: undefined });
    expect(observed?.credential).toEqual(first.credential);
    expect(observed?.deviceIdentity).toBe(first.deviceIdentity);
    expect(pool.getSnapshot().primaryWorkerId).toBe(first.workerId);
    await expect(pool.connectInput({ ...first, pinnedIdentity: second.pinnedIdentity })).rejects.toThrow("identity");
    await expect(pool.connectInput({ ...first, credential: { kind: "share", token: "share" } })).rejects.toThrow(
      "Invite already consumed",
    );
    expect(observed?.credential.kind).toBe("share");
  });

  test("forget waits for an in-flight vault save so cancelled access cannot reappear", async () => {
    const worker = await saved("pending-save");
    const storage = vault();
    let finishSave!: () => void;
    let saving!: () => void;
    const started = new Promise<void>((resolve) => {
      saving = resolve;
    });
    const pool = new WorkerConnectionPool({
      singleWorker: true,
      vault: {
        ...storage,
        save: async (value) => {
          saving();
          await new Promise<void>((resolve) => {
            finishSave = resolve;
          });
          await storage.save(value);
        },
      },
      open: async () => ({ worker, connection: transport(worker) }),
    });
    const pending = pool.connectInput(worker);
    const cancelled = pending.catch((error: unknown) => error);
    await started;
    const forgotten = pool.forget(worker.workerId);
    finishSave();
    expect(await cancelled).toBeInstanceOf(Error);
    await expect(pending).rejects.toThrow("cancelled");
    await forgotten;
    expect(await storage.list()).toEqual([]);
    expect(pool.getSnapshot().workers).toEqual([]);
  });
});
