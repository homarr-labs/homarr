import { generateDeviceIdentity } from "@homarr/remote-protocol";
import type { WorkerIdentity } from "@homarr/remote-protocol";

// No server imports. Structured cloning preserves non-extractable CryptoKey objects.
const databaseName = "homarr-remote-device-v1";
const storeName = "workers";
const pendingStoreName = "pendingDevices";

interface PendingDevice {
  workerId: string;
  pinnedIdentity: JsonWebKey;
  deviceIdentity: WorkerIdentity;
}

export function sameWorkerPin(left: JsonWebKey, right: JsonWebKey): boolean {
  return (
    !!left.x && !!left.y && left.kty === right.kty && left.crv === right.crv && left.x === right.x && left.y === right.y
  );
}

function openVault(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2);
    request.addEventListener("upgradeneeded", () => {
      if (!request.result.objectStoreNames.contains(storeName))
        request.result.createObjectStore(storeName, { keyPath: "workerId" });
      if (!request.result.objectStoreNames.contains(pendingStoreName))
        request.result.createObjectStore(pendingStoreName, { keyPath: "workerId" });
    });
    request.addEventListener("success", () => {
      request.result.addEventListener("versionchange", () => request.result.close());
      resolve(request.result);
    });
    request.addEventListener("error", () =>
      reject(new Error("This browser couldn't open private worker storage. Check site storage permissions.")),
    );
    request.addEventListener("blocked", () => reject(new Error("Close other Homarr Remote tabs, then try again.")));
  });
}

async function transaction<T>(mode: IDBTransactionMode, execute: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openVault();
  try {
    return await new Promise<T>((resolve, reject) => {
      const txn = database.transaction(storeName, mode);
      const request = execute(txn.objectStore(storeName));
      let result: T;
      request.addEventListener("success", () => {
        result = request.result;
      });
      request.addEventListener("error", () => reject(new Error("Unable to save worker access in this browser.")));
      txn.addEventListener("complete", () => resolve(result));
      txn.addEventListener("abort", () => reject(new Error("Worker storage was interrupted. Please try again.")));
    });
  } finally {
    database.close();
  }
}

export function readWorkers<T>(): Promise<T[]> {
  return transaction("readonly", (store) => store.getAll());
}

/** Commit the device key before using a one-time invitation. No bootstrap secret is stored here. */
export async function prepareBootstrapDevice(
  workerId: string,
  pinnedIdentity: JsonWebKey,
  preferredIdentity?: WorkerIdentity,
): Promise<WorkerIdentity> {
  const candidate = preferredIdentity ?? (await generateDeviceIdentity(false));
  const database = await openVault();
  try {
    return await new Promise<WorkerIdentity>((resolve, reject) => {
      const txn = database.transaction(pendingStoreName, "readwrite");
      const store = txn.objectStore(pendingStoreName);
      const request = store.get(workerId);
      let selected = candidate;
      request.addEventListener("success", () => {
        const existing = request.result as PendingDevice | undefined;
        if (existing && !sameWorkerPin(existing.pinnedIdentity, pinnedIdentity)) {
          txn.abort();
          return;
        }
        if (existing && !preferredIdentity) selected = existing.deviceIdentity;
        store.put({ workerId, pinnedIdentity, deviceIdentity: selected } satisfies PendingDevice);
      });
      txn.addEventListener("complete", () => resolve(selected));
      txn.addEventListener("abort", () =>
        reject(
          new Error(
            "This browser could not save its private device key. Enable site storage before using this invitation.",
          ),
        ),
      );
      txn.addEventListener("error", () =>
        reject(
          new Error(
            "This browser could not save its private device key. Enable site storage before using this invitation.",
          ),
        ),
      );
    });
  } finally {
    database.close();
  }
}

export async function saveWorker<T extends { workerId: string }>(worker: T): Promise<void> {
  const database = await openVault();
  try {
    await new Promise<void>((resolve, reject) => {
      const txn = database.transaction([storeName, pendingStoreName], "readwrite");
      txn.objectStore(storeName).put(worker);
      txn.objectStore(pendingStoreName).delete(worker.workerId);
      txn.addEventListener("complete", () => resolve());
      txn.addEventListener("abort", () =>
        reject(new Error("Your connection was not saved. Keep this tab open and retry the invitation.")),
      );
      txn.addEventListener("error", () =>
        reject(new Error("Your connection was not saved. Keep this tab open and retry the invitation.")),
      );
    });
  } finally {
    database.close();
  }
}
export async function forgetWorker(workerId: string): Promise<void> {
  await transaction("readwrite", (store) => store.delete(workerId));
}
