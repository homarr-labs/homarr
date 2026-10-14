import { createSqliteCopyEngine } from "@homarr/db";

import { backupLimits, readBackupUploadAsync } from "../archive";
import { BackupError } from "../contracts";
import type { BackupDependencies, BackupMetadata } from "../contracts";
import { convertEncryptedFields } from "../crypto";
import { inspectLegacyBackupAsync, prepareLegacyBackupAsync } from "../index";
import type { PreparedLegacyBackup } from "../index";
import { inspectCopiedDatabase, validateCopiedDatabase } from "../inspection";

import { BackupJoinError } from "./contracts";
import type {
  BackupJoinRequest,
  ExportSnapshotInput,
  ExportSnapshotReview,
  NitroBackupConfiguration,
  SourcePreparationOptions,
  SourcePreparationReview,
} from "./contracts";
import { createBackupJoinLifetime } from "./lifetime";

export class SourcePreparation {
  toJSON(): Omit<SourcePreparationReview, "inspection"> {
    return {
      stage: "source-prepared",
      applyReady: false,
      blockedOn: "production-authorization-writer-fencing-restart-recovery",
    };
  }
}

function discardPreparedSnapshot(prepared: PreparedLegacyBackup) {
  prepared.withServerSnapshot((snapshot) => snapshot.bytes.fill(0));
}

async function authorizeAsync(
  admission: BackupJoinRequest,
  operation: "inspect" | "prepare" | "export",
  signal: AbortSignal,
) {
  if (signal.aborted) throw new BackupError("cancelled");
  try {
    await admission.assertAuthorizedAsync(operation, signal);
  } catch {
    if (signal.aborted) throw new BackupError("cancelled");
    throw new BackupError("denied");
  }
  if (signal.aborted) throw new BackupError("cancelled");
}

interface ByteReservation {
  release(): void;
}

interface RetainedPreparation {
  readonly prepared: PreparedLegacyBackup;
  readonly reservation: ByteReservation;
}

export function createNitroBackupService(config: NitroBackupConfiguration) {
  const maximumRetainedPreparations = config.maximumRetainedPreparations;
  const maximumReservedBytes = config.maximumReservedBytes;
  const reservationBytes = Object.freeze({ ...config.reservationBytes });
  const ingressBytes = 4 * backupLimits.multipart;
  const archiveBytes = 3 * backupLimits.compressed;
  const parserBytes = 2 * backupLimits.archive;
  const inspectionBytes = ingressBytes + archiveBytes + parserBytes + backupLimits.database;
  if (
    !Number.isSafeInteger(maximumRetainedPreparations) ||
    maximumRetainedPreparations < 1 ||
    !Number.isSafeInteger(maximumReservedBytes) ||
    maximumReservedBytes < 1 ||
    !Number.isSafeInteger(reservationBytes.inspect) ||
    reservationBytes.inspect < inspectionBytes ||
    reservationBytes.inspect > maximumReservedBytes ||
    !Number.isSafeInteger(reservationBytes.prepare) ||
    reservationBytes.prepare < inspectionBytes + backupLimits.database ||
    reservationBytes.prepare > maximumReservedBytes ||
    !Number.isSafeInteger(reservationBytes.exportInspection) ||
    reservationBytes.exportInspection < 2 * backupLimits.database ||
    reservationBytes.exportInspection > maximumReservedBytes
  )
    throw new BackupJoinError("invalid-configuration");

  const lifetime = createBackupJoinLifetime(config.maximumActiveOperations, config.lifetime);
  const engine = createSqliteCopyEngine({
    temporaryDirectory: config.temporaryDirectory,
    migrationsFolder: config.migrationsFolder,
  });
  const targetKey = config.targetKey;
  const retained = new Map<SourcePreparation, RetainedPreparation>();
  let reservedBytes = 0;
  let preparationReservations = 0;
  let closing: Promise<void> | undefined;

  function reserve(bytes: number, preparation: boolean): ByteReservation {
    if (bytes > maximumReservedBytes - reservedBytes) throw new BackupJoinError("busy");
    if (preparation && preparationReservations >= maximumRetainedPreparations) throw new BackupJoinError("busy");
    reservedBytes += bytes;
    if (preparation) preparationReservations += 1;
    let released = false;
    return {
      release() {
        if (released) return;
        released = true;
        reservedBytes -= bytes;
        if (preparation) preparationReservations -= 1;
      },
    };
  }

  function runBoundAsync<T>(
    binding: BackupJoinRequest,
    signal: AbortSignal | undefined,
    work: (admission: BackupJoinRequest, operationSignal: AbortSignal) => Promise<T>,
  ) {
    const admission: BackupJoinRequest = Object.freeze({
      request: binding.request,
      signal: binding.signal,
      assertAuthorizedAsync: binding.assertAuthorizedAsync.bind(binding),
      assertCurrentAsync: binding.assertCurrentAsync.bind(binding),
    });
    const signals = [admission.signal, admission.request.signal];
    if (signal) signals.push(signal);
    return lifetime.runAsync(AbortSignal.any(signals), (operationSignal) => work(admission, operationSignal));
  }

  async function assertAdmissionAsync(
    admission: BackupJoinRequest,
    operation: "inspect" | "prepare" | "export",
    signal: AbortSignal,
  ) {
    await authorizeAsync(admission, operation, signal);
    try {
      await admission.assertCurrentAsync(signal);
    } catch {
      if (signal.aborted) throw new BackupError("cancelled");
      throw new BackupError("denied");
    }
    lifetime.assertActive(signal);
  }

  function dependenciesFor(admission: BackupJoinRequest, signal: AbortSignal): BackupDependencies {
    return {
      engine,
      targetKey,
      authorizeAsync: (operation, innerSignal) => authorizeAsync(admission, operation, innerSignal ?? signal),
    };
  }

  async function withOwnedArchiveAsync<T>(
    admission: BackupJoinRequest,
    bytes: Uint8Array | undefined,
    signal: AbortSignal,
    work: (owned: Uint8Array) => Promise<T>,
  ): Promise<T> {
    let ingress: Uint8Array | undefined;
    let owned: Uint8Array | undefined;
    try {
      ingress = bytes ?? (await readBackupUploadAsync(admission.request, signal));
      lifetime.assertActive(signal);
      if (ingress.byteLength > backupLimits.compressed) throw new BackupError("too-large");
      owned = Uint8Array.from(ingress);
      return await work(owned);
    } finally {
      owned?.fill(0);
      if (bytes === undefined) ingress?.fill(0);
    }
  }

  function inspectArchiveAsync(
    binding: BackupJoinRequest,
    bytes: Uint8Array | undefined,
    options: SourcePreparationOptions,
  ) {
    return runBoundAsync(binding, options.signal, async (admission, signal) => {
      const reservation = reserve(reservationBytes.inspect, false);
      try {
        await assertAdmissionAsync(admission, "inspect", signal);
        const inspection = await withOwnedArchiveAsync(admission, bytes, signal, (owned) =>
          inspectLegacyBackupAsync(owned, dependenciesFor(admission, signal), { ...options, signal }),
        );
        await assertAdmissionAsync(admission, "inspect", signal);
        lifetime.assertActive(signal);
        return inspection;
      } finally {
        reservation.release();
      }
    });
  }

  function prepareArchiveAsync(
    binding: BackupJoinRequest,
    bytes: Uint8Array | undefined,
    options: SourcePreparationOptions,
  ) {
    return runBoundAsync(binding, options.signal, async (admission, signal) => {
      const reservation = reserve(reservationBytes.prepare, true);
      let prepared: PreparedLegacyBackup | undefined;
      let transferred = false;
      try {
        await assertAdmissionAsync(admission, "prepare", signal);
        prepared = await withOwnedArchiveAsync(admission, bytes, signal, (owned) =>
          prepareLegacyBackupAsync(owned, dependenciesFor(admission, signal), { ...options, signal }),
        );
        await assertAdmissionAsync(admission, "prepare", signal);
        lifetime.assertActive(signal);
        const preparation = Object.freeze(new SourcePreparation());
        retained.set(preparation, { prepared, reservation });
        transferred = true;
        return preparation;
      } finally {
        if (!transferred) {
          if (prepared) discardPreparedSnapshot(prepared);
          reservation.release();
        }
      }
    });
  }

  async function inspectExportSnapshotAsync(
    input: ExportSnapshotInput,
    dependencies: BackupDependencies,
    signal: AbortSignal,
  ): Promise<ExportSnapshotReview> {
    if (input.dialect !== "sqlite" || input.metadata.dbDialect !== "sqlite")
      throw new BackupError("unsupported-dialect");
    if (input.bytes.byteLength > backupLimits.database) throw new BackupError("too-large");
    const metadata: BackupMetadata = {
      homarrVersion: input.metadata.homarrVersion,
      exportedAt: input.metadata.exportedAt,
      dbDialect: "sqlite",
    };
    if (
      typeof metadata.homarrVersion !== "string" ||
      !metadata.homarrVersion ||
      typeof metadata.exportedAt !== "string" ||
      !Number.isFinite(Date.parse(metadata.exportedAt))
    )
      throw new BackupError("invalid-database");
    const owned = Uint8Array.from(input.bytes);
    try {
      await dependencies.authorizeAsync("export", signal);
      lifetime.assertActive(signal);
      const copy = await dependencies.engine.createCopyAsync(owned, signal);
      let outcome: { kind: "success"; review: ExportSnapshotReview } | { kind: "failure"; error: unknown };
      let cleanupFailed = false;
      try {
        lifetime.assertActive(signal);
        try {
          await dependencies.engine.assertCompatibleAsync(metadata, copy, signal);
        } catch {
          throw new BackupError("unsupported-version");
        }
        lifetime.assertActive(signal);
        validateCopiedDatabase(copy);
        convertEncryptedFields(copy, dependencies.targetKey, dependencies.targetKey);
        const inspection = inspectCopiedDatabase(copy, metadata, false);
        lifetime.assertActive(signal);
        outcome = {
          kind: "success",
          review: {
            stage: "isolated-export-inspected",
            downloadReady: false,
            inspection,
            blockedOn: "phase-owned-isolated-export-sanitization",
          },
        };
      } catch (error) {
        outcome = { kind: "failure", error };
      } finally {
        try {
          await copy.disposeAsync();
        } catch {
          cleanupFailed = true;
        }
      }
      if (cleanupFailed) throw new BackupError("cleanup-failed");
      if (outcome.kind === "failure") throw outcome.error;
      return outcome.review;
    } catch (error) {
      throw error instanceof BackupError || error instanceof BackupJoinError
        ? error
        : new BackupError("invalid-database");
    } finally {
      owned.fill(0);
    }
  }

  return {
    get phase() {
      return lifetime.phase;
    },
    inspectAsync(binding: BackupJoinRequest, bytes: Uint8Array, options: SourcePreparationOptions = {}) {
      return inspectArchiveAsync(binding, bytes, options);
    },
    prepareSourceAsync(binding: BackupJoinRequest, bytes: Uint8Array, options: SourcePreparationOptions = {}) {
      return prepareArchiveAsync(binding, bytes, options);
    },
    inspectUploadAsync(binding: BackupJoinRequest, options: SourcePreparationOptions = {}) {
      return inspectArchiveAsync(binding, undefined, options);
    },
    prepareUploadSourceAsync(binding: BackupJoinRequest, options: SourcePreparationOptions = {}) {
      return prepareArchiveAsync(binding, undefined, options);
    },
    inspectExportSnapshotAsync(binding: BackupJoinRequest, input: ExportSnapshotInput, signal?: AbortSignal) {
      return runBoundAsync(binding, signal, async (admission, operationSignal) => {
        const reservation = reserve(reservationBytes.exportInspection, false);
        try {
          await assertAdmissionAsync(admission, "export", operationSignal);
          const review = await inspectExportSnapshotAsync(
            input,
            dependenciesFor(admission, operationSignal),
            operationSignal,
          );
          await assertAdmissionAsync(admission, "export", operationSignal);
          lifetime.assertActive(operationSignal);
          return review;
        } finally {
          reservation.release();
        }
      });
    },
    reviewSourceAsync(binding: BackupJoinRequest, preparation: SourcePreparation, signal?: AbortSignal) {
      return runBoundAsync(binding, signal, async (admission, operationSignal): Promise<SourcePreparationReview> => {
        const reservation = reserve(reservationBytes.inspect, false);
        try {
          await assertAdmissionAsync(admission, "prepare", operationSignal);
          const entry = retained.get(preparation);
          if (!entry) throw new BackupJoinError("invalid-preparation");
          const inspection = structuredClone(entry.prepared.inspection);
          await assertAdmissionAsync(admission, "prepare", operationSignal);
          lifetime.assertActive(operationSignal);
          if (retained.get(preparation) !== entry) throw new BackupJoinError("invalid-preparation");
          return { ...preparation.toJSON(), inspection };
        } finally {
          reservation.release();
        }
      });
    },
    discard(binding: BackupJoinRequest, preparation: SourcePreparation, signal?: AbortSignal) {
      return runBoundAsync(binding, signal, async (admission, operationSignal) => {
        await assertAdmissionAsync(admission, "prepare", operationSignal);
        const entry = retained.get(preparation);
        if (!entry) throw new BackupJoinError("invalid-preparation");
        discardPreparedSnapshot(entry.prepared);
        retained.delete(preparation);
        entry.reservation.release();
        await assertAdmissionAsync(admission, "prepare", operationSignal);
        lifetime.assertActive(operationSignal);
      });
    },
    applyAsync(binding: BackupJoinRequest, preparation: SourcePreparation, signal?: AbortSignal): Promise<never> {
      return runBoundAsync(binding, signal, async (admission, operationSignal) => {
        await assertAdmissionAsync(admission, "prepare", operationSignal);
        lifetime.assertActive(operationSignal);
        if (!retained.has(preparation)) throw new BackupJoinError("invalid-preparation");
        throw new BackupJoinError("production-restore-join-unavailable");
      });
    },
    exportAsync(binding: BackupJoinRequest, signal?: AbortSignal): Promise<never> {
      return runBoundAsync(binding, signal, async (admission, operationSignal) => {
        await assertAdmissionAsync(admission, "export", operationSignal);
        lifetime.assertActive(operationSignal);
        throw new BackupJoinError("export-sanitization-unavailable");
      });
    },
    closeAsync(): Promise<void> {
      if (closing) return closing;
      closing = lifetime.closeAsync().finally(() => {
        for (const entry of retained.values()) {
          discardPreparedSnapshot(entry.prepared);
          entry.reservation.release();
        }
        retained.clear();
      });
      return closing;
    },
  };
}

export type NitroBackupService = ReturnType<typeof createNitroBackupService>;
