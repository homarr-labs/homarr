import { createIconFetcher } from "./icons-fetcher";
import type { IconFetchResources, IconReadScope } from "./resources";
import { readLocalIconMediasAsync, readSelectedIconUrlsAsync, readStoredIconRepositoriesAsync } from "./sql";
import type { IconReferenceCodec } from "./sql";
import { synchronizeIconsAsync } from "./sync";
import type { IconAtomicApplyResources, IconSyncResources } from "./sync";

export interface IconSynchronizationServiceResources extends IconFetchResources {
  createId(): string;
  logger: IconSyncResources["logger"];
  referenceCodec: IconReferenceCodec;
  atomicApply: IconAtomicApplyResources;
  runReadAsync<T>(operation: (scope: IconReadScope) => Promise<T>, signal?: AbortSignal): Promise<T>;
}

export const createIconSynchronizationService = (resources: IconSynchronizationServiceResources) => {
  const fetcher = createIconFetcher(resources, {
    assertCurrentAuthorityAsync: (signal) => resources.assertCurrentAuthorityAsync(signal),
    reportSourceError: (error, source) => resources.reportSourceError(error, source),
    readMediasAsync: (signal) => resources.runReadAsync(readLocalIconMediasAsync, signal),
  });
  const jobResources: IconSyncResources = {
    noExternalConnection: () => resources.noExternalConnection(),
    assertCurrentAuthorityAsync: (signal) => resources.assertCurrentAuthorityAsync(signal),
    createId: () => resources.createId(),
    logger: resources.logger,
    clock: resources.clock,
    fetchIconsAsync: (signal) => fetcher.fetchIconsAsync(signal),
    readRepositoriesAsync: (signal) => resources.runReadAsync(readStoredIconRepositoriesAsync, signal),
    readSelectedUrlsAsync: (signal) =>
      resources.runReadAsync((scope) => readSelectedIconUrlsAsync(scope, resources.referenceCodec), signal),
    atomicApply: resources.atomicApply,
  };
  return {
    jobResources,
    synchronizeAsync: (signal?: AbortSignal) => synchronizeIconsAsync(jobResources, signal),
  };
};
