import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { cache } from "react";
import { serialize, stringify } from "superjson";
import type { DehydratedState } from "@tanstack/react-query";

import { createKeyedFingerprint } from "@homarr/common/server";
import { hashObjectBase64 } from "@homarr/common";
import { createGetSetChannel, createLockChannel } from "@homarr/redis";
import type { SupportedLanguage } from "@homarr/translation";

import type { RootLayoutData } from "~/app/[locale]/_root-layout-data";
import type { Board } from "~/app/[locale]/boards/_types";
import type { getIntegrationsWithPermissionsAsync } from "@homarr/auth/server";

export const preparationMaxAgeMs = 72 * 60 * 60_000;
const maxVariants = 128;
const maxPayloadBytes = 2 * 1024 * 1024;

export interface BoardPreparationSpec {
  boardId: string;
  boardName: string;
  viewerId: string | null;
  sessionExpires: string | null;
  locale: SupportedLanguage;
  viewportWidth: number;
  colorScheme: RootLayoutData["colorScheme"];
}

export interface BoardPreparationContext {
  board: Board;
  root: RootLayoutData;
  integrations: Awaited<ReturnType<typeof getIntegrationsWithPermissionsAsync>>;
  generations: Record<string, string>;
  locale: SupportedLanguage;
  viewportWidth: number;
  layoutId: string;
}

export interface PreparedBoard {
  token: string;
  renderedAt: number;
  context: BoardPreparationContext;
  queries: DehydratedState;
}

export interface PreparedVersion {
  slot: 0 | 1;
  fingerprint: string;
  token: string;
  validUntil: number;
  preparedAt: number;
}

export interface BoardPreparationVariant {
  spec: BoardPreparationSpec;
  lastSeenAt: number;
}

type Registry = Record<string, BoardPreparationVariant>;
let namespacePromise: Promise<string | null> | undefined;

export const getPreparationNamespaceAsync = () => {
  namespacePromise ??= (async () => {
    if (process.env.NODE_ENV !== "production") return null;
    try {
      const buildId = (await readFile(resolve(process.cwd(), ".next/BUILD_ID"), "utf8")).trim();
      if (!buildId) return null;
      // A ready marker proves this listener has rendered the page. Replicas
      // with the same build must not publish readiness for each other's caches.
      const instance = createKeyedFingerprint(`${hostname()}:${process.pid}`);
      return `board-preparation-v1:${createKeyedFingerprint(buildId)}:${instance}`;
    } catch {
      return null;
    }
  })();
  return namespacePromise;
};

export const getBoardPreparationId = (spec: BoardPreparationSpec) =>
  createKeyedFingerprint(
    JSON.stringify([
      spec.boardId,
      spec.viewerId,
      spec.sessionExpires,
      spec.locale,
      spec.viewportWidth,
      spec.colorScheme,
    ]),
  );

export const getBoardPreparationFingerprint = (context: BoardPreparationContext) => {
  const input = { ...context, root: { ...context.root } };
  if (input.root.session) {
    input.root.session = {
      ...input.root.session,
      user: { ...input.root.session.user, permissions: input.root.session.user.permissions.toSorted() },
    };
  }
  // Session readers construct equivalent objects in different property orders.
  // Reuse the shared canonical hash before applying the server-keyed fingerprint.
  return createKeyedFingerprint(hashObjectBase64(serialize(input)));
};

const registryChannel = (namespace: string) =>
  createGetSetChannel<Registry>(`${namespace}:registry`, { useBoundedCacheClient: true });
const catalogChannel = createGetSetChannel<Registry>("board-preparation-v1:catalog", { useBoundedCacheClient: true });
const latestVariants = (registry: Registry, limit: number): Registry =>
  Object.fromEntries(
    Object.entries(registry)
      .toSorted((a, b) => b[1].lastSeenAt - a[1].lastSeenAt)
      .slice(0, limit),
  );

export const readBoardPreparationRegistryAsync = async () => {
  const namespace = await getPreparationNamespaceAsync();
  if (!namespace) return {} as Registry;
  return (await registryChannel(namespace).getAsync()) ?? latestVariants((await catalogChannel.getAsync()) ?? {}, 96);
};

const updateRegistryAsync = async (update: (registry: Registry) => void) => {
  const namespace = await getPreparationNamespaceAsync();
  if (!namespace) return false;
  const lock = createLockChannel("board-preparation-v1:catalog-lock", { useBoundedCacheClient: true });
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = await lock.acquireAsync(5);
    if (!token) {
      await setTimeout(10);
      continue;
    }
    try {
      const catalog = (await catalogChannel.getAsync()) ?? {};
      const registry = (await registryChannel(namespace).getAsync()) ?? latestVariants(catalog, 96);
      update(registry);
      // Reservations are not reassigned: a native cache pathname never changes
      // identity, even when its payload expires or another viewer visits.
      if (!(await lock.setPersistentIfOwnedAsync(token, `${namespace}:registry`, registry))) return false;
      await lock.setIfOwnedAsync(
        token,
        "board-preparation-v1:catalog",
        latestVariants({ ...catalog, ...registry }, maxVariants),
        preparationMaxAgeMs,
      );
      return true;
    } finally {
      await lock.releaseAsync(token);
    }
  }
  return false;
};

export const rememberBoardPreparationAsync = async (id: string, spec: BoardPreparationSpec) => {
  await updateRegistryAsync((registry) => {
    const existing = registry[id];
    if (!existing && Object.keys(registry).length >= maxVariants) return;
    registry[id] = { ...existing, spec, lastSeenAt: Date.now() };
  });
};

export const createBoardPreparationLockAsync = async (id: string) => {
  const namespace = await getPreparationNamespaceAsync();
  if (!namespace) return null;
  return createLockChannel(`${namespace}:render-lock:${id}`, { useBoundedCacheClient: true });
};

type PreparationLock = NonNullable<Awaited<ReturnType<typeof createBoardPreparationLockAsync>>>;

export const readPreparedVersionAsync = async (id: string) => {
  const namespace = await getPreparationNamespaceAsync();
  if (!namespace) return null;
  return await createGetSetChannel<PreparedVersion>(`${namespace}:ready:${id}`, {
    useBoundedCacheClient: true,
  }).getAsync();
};

export const publishPreparedBoardAsync = async (
  id: string,
  ready: PreparedVersion,
  lock: PreparationLock,
  token: string,
) => {
  const namespace = await getPreparationNamespaceAsync();
  if (!namespace) return false;
  return await lock.setIfOwnedAsync(token, `${namespace}:ready:${id}`, ready, preparationMaxAgeMs);
};

export const writePreparedBoardAsync = async (
  id: string,
  slot: 0 | 1,
  value: Omit<PreparedBoard, "token" | "renderedAt">,
  lock: PreparationLock,
  token: string,
) => {
  const namespace = await getPreparationNamespaceAsync();
  if (!namespace) throw new Error("No production build for Board preparation");
  const prepared = { ...value, token: randomUUID(), renderedAt: Date.now() };
  if (Buffer.byteLength(stringify(prepared)) > maxPayloadBytes) {
    throw new Error("Prepared Board exceeds its size budget");
  }
  const saved = await lock.setIfOwnedAsync(token, `${namespace}:view:${id}:${slot}`, prepared, preparationMaxAgeMs);
  if (!saved) throw new Error("Board preparation lease expired");
  return prepared;
};

export const readPreparedBoardAsync = cache(async (id: string, slot: string) => {
  if (!/^[a-f0-9]{64}$/.test(id) || !/^[01]$/.test(slot)) return null;
  const namespace = await getPreparationNamespaceAsync();
  if (!namespace) return null;
  return await createGetSetChannel<PreparedBoard>(`${namespace}:view:${id}:${slot}`, {
    useBoundedCacheClient: true,
  }).getAsync();
});
