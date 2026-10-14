import { createId, isRecord, splitToNChunks, Stopwatch } from "@homarr/common";
import { env } from "@homarr/common/env";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { EVERY_WEEK } from "@homarr/cron-jobs-core/expressions";
import type { InferInsertModel } from "@homarr/db";
import { and, db, eq, handleTransactionsAsync, inArray, notInArray, or } from "@homarr/db";
import { iconRepositories, icons } from "@homarr/db/schema";
import {
  IconSourceHttpError,
  iconRepositorySources,
  parseGitHubIconIndex,
  parseJsdelivrIconIndex,
} from "@homarr/icons";
import type { RepositoryIconGroup } from "@homarr/icons";
import { LOCAL_ICON_REPOSITORY_SLUG, mapMediaToIcon } from "@homarr/icons/local";

import { createCronJob } from "../lib";

const logger = createLogger({ module: "iconsUpdaterJobs" });

type LegacyIconHttp = typeof import("@homarr/core/infrastructure/http");
type LegacyIconResponse = Awaited<ReturnType<LegacyIconHttp["fetchWithTrustedCertificatesAsync"]>>;
type LegacyIconSource = (typeof iconRepositorySources)[number];
type LegacyIconFailure = { kind: "none" } | { kind: "failed"; error: unknown };
type LegacyIconOutcome = {
  group: RepositoryIconGroup;
  primary: LegacyIconFailure;
  cleanupErrors: unknown[];
};
type LegacyIconReader = {
  closed: Promise<void>;
  read(): Promise<{ done: boolean; value?: unknown }>;
  cancel(): Promise<void>;
  releaseLock(): void;
};

const legacyIconLimits = {
  maximumIndexBytes: 16 * 1024 * 1024,
  maximumFiles: 200000,
  maximumPathLength: 1024,
};
const legacyIconIndexTimeout = 10000;

const fetchLegacyIconGroupsAsync = async (): Promise<RepositoryIconGroup[]> => {
  if (Object.values(legacyIconLimits).some((value) => !Number.isSafeInteger(value) || value <= 0)) {
    throw new Error("Positive finite icon source bounds are required");
  }

  const http = await import("@homarr/core/infrastructure/http");
  const parentSignal = http.getHttpRequestSignal();
  parentSignal?.throwIfAborted();
  const trustedHostnames = await db.query.trustedCertificateHostnames.findMany({
    columns: { hostname: true, thumbprint: true, certificate: true },
  });
  parentSignal?.throwIfAborted();
  const agent = await http.createCertificateAgentAsync({
    checkServerIdentity: http.createCustomCheckServerIdentity(trustedHostnames),
  });

  const fetchSourceAsync = async (source: LegacyIconSource): Promise<LegacyIconOutcome> => {
    const controller = new AbortController();
    const deadlineAt = performance.now() + legacyIconIndexTimeout;
    let signal = controller.signal;
    if (parentSignal) signal = AbortSignal.any([signal, parentSignal]);
    const timer = setTimeout(() => controller.abort(new Error("Icon index deadline expired")), legacyIconIndexTimeout);
    const checkDeadline = () => {
      if (performance.now() >= deadlineAt) controller.abort(new Error("Icon index deadline expired"));
      signal.throwIfAborted();
    };
    let response: LegacyIconResponse | undefined;
    let reader: LegacyIconReader | undefined;
    let readerClosed: Promise<void> | undefined;
    let observedClosed: Promise<LegacyIconFailure> | undefined;
    let cancellation: Promise<void> | undefined;
    let observedCancellation: Promise<LegacyIconFailure> | undefined;
    let primary: LegacyIconFailure = { kind: "none" };
    let group: RepositoryIconGroup = {
      success: false,
      icons: [],
      slug: source.slug,
      failure: "source-unavailable",
    };
    const cleanupErrors: unknown[] = [];
    const cancelReaderAsync = () => {
      if (cancellation) return cancellation;
      const currentReader = reader;
      cancellation = Promise.resolve().then(async () => {
        if (currentReader) await currentReader.cancel();
      });
      observedCancellation = cancellation.then(
        (): LegacyIconFailure => ({ kind: "none" }),
        (error: unknown): LegacyIconFailure => ({ kind: "failed", error }),
      );
      return cancellation;
    };
    const onAbort = () => {
      void cancelReaderAsync();
    };

    try {
      checkDeadline();
      response = await http.fetchWithTrustedCertificatesAsync(source.repositoryIndexingUrl, {
        dispatcher: agent,
        signal,
      });
      checkDeadline();
      if (!response.ok) {
        throw new IconSourceHttpError({
          status: response.status,
          rateLimitRemaining: response.headers.get("x-ratelimit-remaining"),
          rateLimitReset: response.headers.get("x-ratelimit-reset"),
          retryAfter: response.headers.get("retry-after"),
        });
      }
      const declaredLength = response.headers.get("content-length");
      if (
        declaredLength !== null &&
        (!/^\d+$/.test(declaredLength) ||
          !Number.isSafeInteger(Number(declaredLength)) ||
          Number(declaredLength) > legacyIconLimits.maximumIndexBytes)
      ) {
        throw new Error("Icon index response exceeds its bound");
      }
      if (!response.body) throw new Error("Icon index response has no body");
      reader = response.body.getReader();
      readerClosed = reader.closed;
      observedClosed = readerClosed.then(
        (): LegacyIconFailure => ({ kind: "none" }),
        (error: unknown): LegacyIconFailure => ({ kind: "failed", error }),
      );
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) onAbort();

      const parts: Uint8Array[] = [];
      let length = 0;
      for (;;) {
        checkDeadline();
        const part = await reader.read();
        checkDeadline();
        if (part.done) break;
        const chunk: unknown = part.value;
        if (!(chunk instanceof Uint8Array)) throw new Error("Invalid icon index body chunk");
        if (chunk.byteLength > legacyIconLimits.maximumIndexBytes - length) {
          throw new Error("Icon index response exceeds its bound");
        }
        length += chunk.byteLength;
        parts.push(chunk);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const part of parts) {
        bytes.set(part, offset);
        offset += part.byteLength;
      }
      checkDeadline();
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      checkDeadline();
      const value: unknown = JSON.parse(text);
      checkDeadline();
      if (!isRecord(value)) throw new Error("Invalid icon index record");
      let entries: unknown = value.tree;
      if (source.kind === "jsdelivr") entries = value.files;
      if (!Array.isArray(entries) || entries.length > legacyIconLimits.maximumFiles) {
        throw new Error("Invalid or oversized icon file list");
      }
      const encoder = new TextEncoder();
      for (const entry of entries) {
        const record: unknown = entry;
        if (!isRecord(record)) throw new Error("Invalid icon index entry");
        let path: unknown = record.path;
        if (source.kind === "jsdelivr") path = record.name;
        if (typeof path !== "string" || encoder.encode(path).byteLength > legacyIconLimits.maximumPathLength) {
          throw new Error("Invalid or oversized icon index path");
        }
      }
      checkDeadline();
      if (source.kind === "github") {
        group = parseGitHubIconIndex(value, source, legacyIconLimits);
      } else {
        group = parseJsdelivrIconIndex(value, source, legacyIconLimits);
      }
      checkDeadline();
    } catch (error) {
      primary = { kind: "failed", error };
    } finally {
      if (reader) {
        await Promise.allSettled([cancelReaderAsync(), readerClosed]);
        if (observedCancellation) {
          const failure = await observedCancellation;
          if (failure.kind === "failed") cleanupErrors.push(failure.error);
        }
        if (observedClosed) {
          const failure = await observedClosed;
          if (failure.kind === "failed") {
            if (primary.kind === "none") {
              primary = failure;
            } else if (failure.error !== primary.error) {
              cleanupErrors.push(failure.error);
            }
          }
        } else {
          cleanupErrors.push(new Error("Icon reader closure was not observed"));
        }
        try {
          reader.releaseLock();
        } catch (error) {
          cleanupErrors.push(error);
        }
      } else {
        try {
          await response?.body?.cancel();
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      signal.removeEventListener("abort", onAbort);
      clearTimeout(timer);
    }

    if (primary.kind === "failed") {
      group = { success: false, icons: [], slug: source.slug, failure: "source-unavailable" };
    }
    return { group, primary, cleanupErrors };
  };

  const operations: Promise<LegacyIconOutcome>[] = [];
  let setupFailure: LegacyIconFailure = { kind: "none" };
  try {
    parentSignal?.throwIfAborted();
    for (const source of iconRepositorySources) {
      operations.push(Promise.resolve().then(() => fetchSourceAsync(source)));
    }
    operations.push(
      Promise.resolve().then(async (): Promise<LegacyIconOutcome> => {
        try {
          const medias = await db.query.medias.findMany({
            columns: { id: true, name: true, content: true, size: true },
          });
          parentSignal?.throwIfAborted();
          return {
            group: { success: true, icons: medias.map(mapMediaToIcon), slug: LOCAL_ICON_REPOSITORY_SLUG },
            primary: { kind: "none" },
            cleanupErrors: [],
          };
        } catch (error) {
          return {
            group: { success: false, icons: [], slug: LOCAL_ICON_REPOSITORY_SLUG, failure: "source-unavailable" },
            primary: { kind: "failed", error },
            cleanupErrors: [],
          };
        }
      }),
    );
  } catch (error) {
    setupFailure = { kind: "failed", error };
  }

  const outcomes = await Promise.allSettled(operations);
  const fatalErrors: unknown[] = [];
  if (setupFailure.kind === "failed") fatalErrors.push(setupFailure.error);
  try {
    await agent.destroy();
  } catch (error) {
    fatalErrors.push(error);
  }

  const groups: RepositoryIconGroup[] = [];
  const sourceErrors: unknown[] = [];
  for (const outcome of outcomes) {
    if (outcome.status === "rejected") {
      fatalErrors.push(outcome.reason);
      continue;
    }
    groups.push(outcome.value.group);
    fatalErrors.push(...outcome.value.cleanupErrors);
    const primary = outcome.value.primary;
    if (primary.kind === "failed") {
      sourceErrors.push(primary.error);
      try {
        if (primary.error instanceof IconSourceHttpError) {
          logger.warn("Icon repository HTTP source unavailable", {
            slug: outcome.value.group.slug,
            ...primary.error.metadata,
          });
        } else {
          logger.warn("Icon repository source unavailable", { slug: outcome.value.group.slug });
        }
      } catch (error) {
        fatalErrors.push(error);
      }
    }
  }
  if (fatalErrors.length > 0) {
    const errors = [...sourceErrors, ...fatalErrors];
    throw new AggregateError(errors, "Icon source cleanup failed", { cause: errors[0] });
  }
  parentSignal?.throwIfAborted();
  return groups;
};

export const iconsUpdaterJob = createCronJob("iconsUpdater", EVERY_WEEK, {
  runOnStart: true,
  expectedMaximumDurationInMillis: 10 * 1000,
}).withCallback(async () => {
  if (env.NO_EXTERNAL_CONNECTION) return;

  logger.info("Updating icon repository cache...");
  const stopWatch = new Stopwatch();
  const repositoryIconGroups = await fetchLegacyIconGroupsAsync();
  if (!repositoryIconGroups.some((group) => group.success)) {
    throw new Error("Icon synchronization failed: no icon source succeeded");
  }
  const countIcons = repositoryIconGroups
    .map((group) => group.icons.length)
    .reduce((partialSum, arrayLength) => partialSum + arrayLength, 0);
  logger.info("Fetched icons from repositories", {
    repositoryCount: repositoryIconGroups.length,
    iconCount: countIcons,
    duration: stopWatch.getElapsedInFormattedMilliseconds(),
  });

  const databaseIconRepositories = await db.query.iconRepositories.findMany({
    with: {
      icons: true,
    },
  });

  const skippedChecksums = new Map<string, string[]>();
  let countDeleted = 0;
  let countInserted = 0;

  logger.info("Updating icons in database...");
  stopWatch.reset();

  const newIconRepositories: InferInsertModel<typeof iconRepositories>[] = [];
  const newIcons: InferInsertModel<typeof icons>[] = [];
  const allDbIcons = databaseIconRepositories.flatMap((group) => group.icons);

  for (const repositoryIconGroup of repositoryIconGroups) {
    if (!repositoryIconGroup.success) {
      continue;
    }
    const localSkippedChecksums: string[] = [];

    const repositoryInDb = databaseIconRepositories.find(
      (dbIconGroup) => dbIconGroup.slug === repositoryIconGroup.slug,
    );
    const iconRepositoryId: string = repositoryInDb?.id ?? createId();
    if (!repositoryInDb?.id) {
      newIconRepositories.push({
        id: iconRepositoryId,
        slug: repositoryIconGroup.slug,
      });
    }

    const dbIconsInRepository = allDbIcons.filter((icon) => icon.iconRepositoryId === iconRepositoryId);

    for (const icon of repositoryIconGroup.icons) {
      if (dbIconsInRepository.some((dbIcon) => dbIcon.checksum === icon.checksum)) {
        localSkippedChecksums.push(icon.checksum);
        continue;
      }

      newIcons.push({
        id: createId(),
        checksum: icon.checksum,
        name: icon.fileNameWithExtension,
        url: icon.imageUrl,
        iconRepositoryId,
      });
      countInserted++;
    }

    skippedChecksums.set(iconRepositoryId, localSkippedChecksums);
  }

  const deadIconRepositories = databaseIconRepositories.filter(
    (iconRepository) => !repositoryIconGroups.some((group) => group.slug === iconRepository.slug),
  );

  const deadIconsFilter = or(
    ...[...skippedChecksums.entries()].map(([iconRepositoryId, checksums]) =>
      and(eq(icons.iconRepositoryId, iconRepositoryId), notInArray(icons.checksum, checksums)),
    ),
  );

  await handleTransactionsAsync(db, {
    async handleAsync(db, schema) {
      await db.transaction(async (transaction) => {
        if (deadIconsFilter !== undefined) {
          const result = await transaction.delete(schema.icons).where(deadIconsFilter);

          countDeleted += result.rowCount ?? 0;
        }

        if (deadIconRepositories.length >= 1) {
          await transaction.delete(schema.iconRepositories).where(
            inArray(
              iconRepositories.id,
              deadIconRepositories.map((iconRepository) => iconRepository.id),
            ),
          );
        }

        if (newIconRepositories.length >= 1) {
          await transaction.insert(schema.iconRepositories).values(newIconRepositories);
        }

        if (newIcons.length >= 1) {
          // We only insert 5000 icons at a time to avoid SQLite limitations
          for (const chunck of splitToNChunks(newIcons, Math.ceil(newIcons.length / 5000))) {
            await transaction.insert(schema.icons).values(chunck);
          }
        }
      });
    },
    handleSync() {
      db.transaction((transaction) => {
        if (deadIconsFilter !== undefined) {
          const result = transaction.delete(icons).where(deadIconsFilter).run();
          countDeleted += result.changes;
        }

        if (deadIconRepositories.length >= 1) {
          transaction
            .delete(iconRepositories)
            .where(
              inArray(
                iconRepositories.id,
                deadIconRepositories.map((iconRepository) => iconRepository.id),
              ),
            )
            .run();
        }

        if (newIconRepositories.length >= 1) {
          transaction.insert(iconRepositories).values(newIconRepositories).run();
        }

        if (newIcons.length >= 1) {
          // We only insert 5000 icons at a time to avoid SQLite limitations
          for (const chunck of splitToNChunks(newIcons, Math.ceil(newIcons.length / 5000))) {
            transaction.insert(icons).values(chunck).run();
          }
        }
      });
    },
  });

  logger.info("Updated icons in database", {
    duration: stopWatch.getElapsedInFormattedMilliseconds(),
    added: countInserted,
    deleted: countDeleted,
  });
});
