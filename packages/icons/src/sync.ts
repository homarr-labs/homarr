export type FetchedIconRepository =
  | {
      slug: string;
      success: true;
      icons: readonly { checksum: string; fileNameWithExtension: string; imageUrl: string }[];
    }
  | { slug: string; success: false; icons: readonly []; failure?: "external-disabled" | "source-unavailable" };

export interface StoredIcon {
  id: string;
  checksum: string;
  name: string;
  url: string;
  iconRepositoryId: string;
}

export interface StoredIconRepository {
  id: string;
  slug: string;
  icons: readonly StoredIcon[];
}

export interface IconSynchronizationPlan {
  revision: "homarr.icons.replacement.v1";
  deleteIconIds: readonly string[];
  deleteRepositoryIds: readonly string[];
  insertRepositories: readonly { id: string; slug: string }[];
  insertIconBatches: readonly (readonly StoredIcon[])[];
  protectedUrls: readonly string[];
  missingLocalUrls: readonly string[];
  expectedRepositories: readonly StoredIconRepository[];
}

export type IconSyncPlanningResult =
  | { kind: "unchanged"; reason: "no-success" | "no-change" }
  | { kind: "replacement"; plan: IconSynchronizationPlan };

export interface IconAtomicApplyResources {
  revision: "homarr.icons.atomic-apply.v1";
  applyAsync(
    plan: IconSynchronizationPlan,
    options: {
      signal?: AbortSignal;
      assertCurrentAuthorityAsync(): Promise<void>;
      noExternalConnection(): boolean;
    },
  ): Promise<{ deletedIcons: number }>;
}

export interface IconSyncResources {
  noExternalConnection(): boolean;
  assertCurrentAuthorityAsync(signal?: AbortSignal): Promise<void>;
  createId(): string;
  logger: {
    info(message: string, metadata?: Record<string, unknown>): void;
  };
  clock: { monotonicMilliseconds(): number };
  fetchIconsAsync(signal?: AbortSignal): Promise<readonly FetchedIconRepository[]>;
  readRepositoriesAsync(signal?: AbortSignal): Promise<readonly StoredIconRepository[]>;
  readSelectedUrlsAsync(signal?: AbortSignal): Promise<readonly string[]>;
  atomicApply: IconAtomicApplyResources;
}

export const planIconSynchronization = (
  fetched: readonly FetchedIconRepository[],
  stored: readonly StoredIconRepository[],
  selectedUrls: readonly string[],
  createId: () => string,
): IconSyncPlanningResult => {
  const successful = fetched.filter((group) => group.success);
  if (successful.length === 0) return { kind: "unchanged", reason: "no-success" };
  if (new Set(fetched.map((group) => group.slug)).size !== fetched.length)
    throw new Error("Duplicate icon repository results");
  const selected = new Set(selectedUrls);
  const repositories: { id: string; slug: string }[] = [];
  const inserted: StoredIcon[] = [];
  const deleted: string[] = [];
  const deletedRepositories: string[] = [];
  const missingLocalUrls = new Set<string>();
  const storedBySlug = new Map(stored.map((repository) => [repository.slug, repository]));

  for (const group of successful) {
    const existing = storedBySlug.get(group.slug);
    const id = existing?.id ?? createId();
    if (!existing) repositories.push({ id, slug: group.slug });
    const retainedIds = new Set<string>();
    const byChecksum = new Map<string, StoredIcon[]>();
    const byUrl = new Map<string, StoredIcon[]>();
    for (const icon of existing?.icons ?? []) {
      const checksums = byChecksum.get(icon.checksum) ?? [];
      checksums.push(icon);
      byChecksum.set(icon.checksum, checksums);
      const urls = byUrl.get(icon.url) ?? [];
      urls.push(icon);
      byUrl.set(icon.url, urls);
    }
    const localUrls = new Set(group.icons.map((icon) => icon.imageUrl));
    for (const icon of group.icons) {
      const previous =
        group.slug === "local" || selected.has(icon.imageUrl)
          ? byUrl.get(icon.imageUrl)
          : byChecksum.get(icon.checksum);
      if (previous) {
        for (const value of previous) retainedIds.add(value.id);
      } else {
        inserted.push({
          id: createId(),
          checksum: icon.checksum,
          name: icon.fileNameWithExtension,
          url: icon.imageUrl,
          iconRepositoryId: id,
        });
      }
    }
    for (const icon of existing?.icons ?? []) {
      const localStillExists = group.slug !== "local" || localUrls.has(icon.url);
      if (selected.has(icon.url) && localStillExists) retainedIds.add(icon.id);
    }
    for (const icon of existing?.icons ?? [])
      if (!retainedIds.has(icon.id)) {
        deleted.push(icon.id);
        if (group.slug === "local" && !localUrls.has(icon.url)) missingLocalUrls.add(icon.url);
      }
  }
  const listed = new Set(fetched.map((group) => group.slug));
  for (const repository of stored) {
    if (listed.has(repository.slug)) continue;
    const protectedIcons = repository.icons.filter((icon) => selected.has(icon.url));
    if (protectedIcons.length === 0) deletedRepositories.push(repository.id);
    for (const icon of repository.icons) if (!selected.has(icon.url)) deleted.push(icon.id);
  }
  if (deleted.length === 0 && deletedRepositories.length === 0 && repositories.length === 0 && inserted.length === 0)
    return { kind: "unchanged", reason: "no-change" };

  const batches: StoredIcon[][] = [];
  const batchCount = Math.ceil(inserted.length / 5000);
  let offset = 0;
  for (let remaining = batchCount; remaining > 0; remaining--) {
    const length = Math.ceil((inserted.length - offset) / remaining);
    batches.push(inserted.slice(offset, offset + length));
    offset += length;
  }
  return {
    kind: "replacement",
    plan: {
      revision: "homarr.icons.replacement.v1",
      deleteIconIds: deleted,
      deleteRepositoryIds: deletedRepositories,
      insertRepositories: repositories,
      insertIconBatches: batches,
      protectedUrls: [...selected],
      missingLocalUrls: [...missingLocalUrls],
      expectedRepositories: stored.map((repository) => ({
        ...repository,
        icons: repository.icons.map((icon) => ({ ...icon })),
      })),
    },
  };
};

export const synchronizeIconsAsync = async (resources: IconSyncResources, signal?: AbortSignal): Promise<void> => {
  if (resources.noExternalConnection()) return;
  signal?.throwIfAborted();
  await resources.assertCurrentAuthorityAsync(signal);
  signal?.throwIfAborted();
  const started = resources.clock.monotonicMilliseconds();
  resources.logger.info("Updating icon repository cache...");
  const fetched = await resources.fetchIconsAsync(signal);
  signal?.throwIfAborted();
  resources.logger.info("Fetched icons from repositories", {
    repositoryCount: fetched.length,
    iconCount: fetched.reduce((sum, group) => sum + group.icons.length, 0),
    duration: resources.clock.monotonicMilliseconds() - started,
  });
  await resources.assertCurrentAuthorityAsync(signal);
  if (resources.noExternalConnection()) return;
  if (fetched.some((group) => !group.success && group.failure === "external-disabled")) return;
  if (!fetched.some((group) => group.success)) throw new Error("Icon synchronization failed: no icon source succeeded");
  const reads = await Promise.allSettled([
    Promise.resolve().then(() => resources.readRepositoriesAsync(signal)),
    Promise.resolve().then(() => resources.readSelectedUrlsAsync(signal)),
  ]);
  const [repositories, selected] = reads;
  if (repositories.status === "rejected") throw repositories.reason;
  if (selected.status === "rejected") throw selected.reason;
  signal?.throwIfAborted();
  await resources.assertCurrentAuthorityAsync(signal);
  if (resources.noExternalConnection()) return;
  const result = planIconSynchronization(fetched, repositories.value, selected.value, resources.createId);
  if (result.kind === "unchanged") return;
  signal?.throwIfAborted();
  await resources.assertCurrentAuthorityAsync(signal);
  signal?.throwIfAborted();
  if (resources.noExternalConnection()) return;
  if (resources.atomicApply.revision !== "homarr.icons.atomic-apply.v1")
    throw new Error("A reviewed atomic icon apply adapter is required");
  const applied = await resources.atomicApply.applyAsync(result.plan, {
    signal,
    assertCurrentAuthorityAsync: () => resources.assertCurrentAuthorityAsync(signal),
    noExternalConnection: () => resources.noExternalConnection(),
  });
  resources.logger.info("Updated icons in database", {
    duration: resources.clock.monotonicMilliseconds() - started,
    added: result.plan.insertIconBatches.reduce((count, batch) => count + batch.length, 0),
    deleted: applied.deletedIcons,
  });
};
