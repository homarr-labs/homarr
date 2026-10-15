import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout } from "node:timers/promises";
import { serialize } from "superjson";

import { createKeyedFingerprint } from "@homarr/common/server";
import { hashObjectBase64 } from "@homarr/common";
import { createGetSetChannel, createLockChannel } from "@homarr/redis";
import type { SupportedLanguage } from "@homarr/translation";

import type { RootLayoutData } from "~/app/[locale]/_root-layout-data";
import type { Board } from "~/app/[locale]/boards/_types";
import type { getIntegrationsWithPermissionsAsync } from "@homarr/auth/server";

export const preparationMaxAgeMs = 72 * 60 * 60_000;
const maxVariants = 128;
const maxDocumentBytes = 4 * 1024 * 1024;

export interface BoardPreparationSpec {
  boardId: string;
  boardName: string;
  viewerId: string | null;
  sessionExpires: string | null;
  locale: SupportedLanguage;
  layoutId: string;
  colorScheme: RootLayoutData["colorScheme"];
  /** Public path the view answers, e.g. "/" or "/boards/home". */
  pathname: string;
  /** Selects the mobile home Board when capturing "/". */
  deviceType: "mobile" | null;
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

interface PreparedDocument {
  token: string;
  html: string;
}

interface PreparedVersion {
  fingerprint: string;
  token: string;
  validUntil: number;
  preparedAt: number;
}

interface BoardPreparationVariant {
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
      // Captured documents reference this build's assets only.
      return `board-preparation-v3:${createKeyedFingerprint(buildId)}`;
    } catch {
      return null;
    }
  })();
  return namespacePromise;
};

// The document embeds the session expiry, which drives the client's login
// redirect, so each session keeps its own view.
export const getBoardPreparationId = (spec: BoardPreparationSpec) =>
  createKeyedFingerprint(
    JSON.stringify([
      spec.boardId,
      spec.viewerId,
      spec.sessionExpires,
      spec.locale,
      spec.layoutId,
      spec.colorScheme,
      spec.pathname,
      spec.deviceType,
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
const catalogChannel = createGetSetChannel<Registry>("board-preparation-v3:catalog", { useBoundedCacheClient: true });
const latestVariants = (registry: Registry, limit: number): Registry =>
  Object.fromEntries(
    Object.entries(registry)
      .filter(([, { spec, lastSeenAt }]) => {
        if (lastSeenAt <= Date.now() - preparationMaxAgeMs) return false;
        return spec.sessionExpires === null || Date.parse(spec.sessionExpires) > Date.now() + 30_000;
      })
      .toSorted((a, b) => b[1].lastSeenAt - a[1].lastSeenAt)
      .slice(0, limit),
  );

export const readBoardPreparationRegistryAsync = async () => {
  const namespace = await getPreparationNamespaceAsync();
  if (!namespace) return {} as Registry;
  const registry = await registryChannel(namespace).getAsync();
  if (registry) return latestVariants(registry, maxVariants);
  return latestVariants((await catalogChannel.getAsync()) ?? {}, 96);
};

const updateRegistryAsync = async (update: (registry: Registry) => boolean) => {
  const namespace = await getPreparationNamespaceAsync();
  if (!namespace) return false;
  const lock = createLockChannel("board-preparation-v3:catalog-lock", { useBoundedCacheClient: true });
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = await lock.acquireAsync(5);
    if (!token) {
      await setTimeout(10);
      continue;
    }
    try {
      const catalog = (await catalogChannel.getAsync()) ?? {};
      const stored = await registryChannel(namespace).getAsync();
      const registry = latestVariants(stored ?? catalog, stored ? maxVariants : 96);
      if (!update(registry)) return false;
      // Retire expired viewers and unused widths. IDs still bind each pathname
      // to its original viewer; retired process namespaces also expire in Redis.
      if (!(await lock.setIfOwnedAsync(token, `${namespace}:registry`, registry, preparationMaxAgeMs))) return false;
      await lock.setIfOwnedAsync(
        token,
        "board-preparation-v3:catalog",
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
  return await updateRegistryAsync((registry) => {
    // A full registry makes room for the visit instead of locking out new views.
    if (!registry[id] && Object.keys(registry).length >= maxVariants) {
      const oldest = Object.entries(registry).toSorted((a, b) => a[1].lastSeenAt - b[1].lastSeenAt)[0];
      if (oldest) delete registry[oldest[0]];
    }
    registry[id] = { spec, lastSeenAt: Date.now() };
    return true;
  });
};

/** Retires a view whose viewer session has ended, so later runs stop retrying it. */
export const forgetBoardPreparationAsync = async (id: string) => {
  return await updateRegistryAsync((registry) => {
    const existing = registry[id];
    if (!existing) return false;
    registry[id] = { ...existing, lastSeenAt: 0 };
    return true;
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

export const writePreparedDocumentAsync = async (
  id: string,
  document: PreparedDocument,
  ready: PreparedVersion,
  lock: PreparationLock,
  lease: string,
) => {
  const namespace = await getPreparationNamespaceAsync();
  if (!namespace) return false;
  if (Buffer.byteLength(document.html) > maxDocumentBytes) throw new Error("Prepared Board exceeds its size budget");
  // The marker carries the document token; readers reject a mismatched pair.
  if (!(await lock.setIfOwnedAsync(lease, `${namespace}:document:${id}`, document, preparationMaxAgeMs))) return false;
  return await lock.setIfOwnedAsync(lease, `${namespace}:ready:${id}`, ready, preparationMaxAgeMs);
};

export const readPreparedDocumentAsync = async (id: string, token: string) => {
  const namespace = await getPreparationNamespaceAsync();
  if (!namespace) return null;
  const document = await createGetSetChannel<PreparedDocument>(`${namespace}:document:${id}`, {
    useBoundedCacheClient: true,
  }).getAsync();
  if (document?.token !== token) return null;
  return document.html;
};
