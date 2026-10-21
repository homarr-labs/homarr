import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  exportWorkerIdentity,
  generateWorkerIdentity,
  getWorkerId,
  importWorkerIdentity,
  randomSecret,
  toBase64Url,
  utf8,
} from "@homarr/remote-protocol";
import type { WorkerIdentity } from "@homarr/remote-protocol";
import { WorkerAccess } from "@homarr/worker-access";

export interface WorkerState {
  identity: WorkerIdentity;
  workerId: string;
  access: WorkerAccess;
  capability: string;
  directory: string;
  platformUrl: string;
  relayUrl: string;
  publicUrl: string;
}

async function createPrivateFile(path: string, value: string) {
  try {
    await writeFile(path, value, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  await chmod(path, 0o600);
}

export async function openWorkerState(
  directory = process.env.HOMARR_WORKER_STATE_DIRECTORY ?? "/appdata/worker",
): Promise<WorkerState> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const identityPath = join(directory, "identity.json");
  try {
    await readFile(identityPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await createPrivateFile(identityPath, JSON.stringify(await exportWorkerIdentity(await generateWorkerIdentity())));
  }
  const identity = await importWorkerIdentity(JSON.parse(await readFile(identityPath, "utf8")) as JsonWebKey);
  const capabilityPath = join(directory, "connection-capability");
  await createPrivateFile(capabilityPath, randomSecret());
  const capability = (await readFile(capabilityPath, "utf8")).trim();
  if (!/^[A-Za-z0-9_-]{43}$/.test(capability)) throw new Error("Invalid persisted worker connection capability");
  const access = await WorkerAccess.open({ directory, identity });
  const state = {
    directory,
    identity,
    capability,
    access,
    workerId: await getWorkerId(identity.publicJwk),
    platformUrl: process.env.WORKER_PLATFORM_URL ?? "https://homarr.dev/remote/",
    relayUrl: process.env.WORKER_RELAY_URL ?? "",
    publicUrl: process.env.WORKER_PUBLIC_URL?.trim() || `http://localhost:${process.env.WORKER_PORT ?? 3002}`,
  };
  await writePairingFile(state);
  return state;
}

export async function writePairingFile(state: WorkerState) {
  const url = new URL(state.platformUrl);
  const info = state.access.getPairingInfo();
  const fragment = new URLSearchParams({
    worker: state.workerId,
    key: toBase64Url(utf8(JSON.stringify(state.identity.publicJwk))),
    cap: state.capability,
  });
  if (state.relayUrl) fragment.set("relay", state.relayUrl);
  else fragment.set("direct", state.publicUrl);
  if (info.secret) fragment.set("claim", info.secret);
  url.hash = fragment.toString();
  await writeFile(
    join(state.directory, "pairing.json"),
    `${JSON.stringify({ workerId: state.workerId, claimed: state.access.claimed, url: url.href }, null, 2)}\n`,
    { mode: 0o600 },
  );
  await chmod(join(state.directory, "pairing.json"), 0o600);
}
