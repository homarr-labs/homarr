import { z } from "zod";

import type { BackupFailureCode, BackupNativePorts, BackupTransport } from "./contracts";
import { maximumBackupFileBytes } from "./contracts";

const countSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const boardSchema = z.strictObject({ id: z.string().min(1), name: z.string() });
const inspectionSchema = z
  .strictObject({
    metadata: z.strictObject({
      homarrVersion: z.string().min(1),
      exportedAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
      dbDialect: z.literal("sqlite"),
    }),
    counts: z.record(z.string(), countSchema),
    boards: z.array(boardSchema),
    homeBoard: boardSchema.nullable(),
    encryptedFields: z.record(z.string(), countSchema),
    carriesEncryptionKey: z.boolean(),
    requiresMigrationLogout: z.literal(true),
    scope: z.literal("sql-only-sensitive"),
  })
  .superRefine((inspection, context) => {
    const homeBoard = inspection.homeBoard;
    const ids = new Set(inspection.boards.map((board) => board.id));
    if (ids.size !== inspection.boards.length) context.addIssue({ code: "custom", message: "Duplicate board" });
    if (homeBoard && !inspection.boards.some((board) => board.id === homeBoard.id && board.name === homeBoard.name))
      context.addIssue({ code: "custom", message: "Unknown home board" });
  });

const failureSchema = z.enum([
  "denied",
  "too-large",
  "invalid-archive",
  "unsupported-dialect",
  "unsupported-version",
  "invalid-database",
  "invalid-reference",
  "source-key-required",
  "invalid-key",
  "key-conflict",
  "invalid-ciphertext",
  "migration-failed",
  "invalid-board",
  "cancelled",
  "cleanup-failed",
  "unsupported",
  "invalid-response",
  "transport-failed",
]);

export class BackupTransportError extends Error {
  constructor(readonly code: BackupFailureCode) {
    super(`Backup ${code}`);
    this.name = "BackupTransportError";
  }
}

export function getBackupFailureCode(error: unknown): BackupFailureCode {
  if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
  const result = z.object({ code: failureSchema }).safeParse(error);
  return result.success ? result.data.code : "transport-failed";
}

export function createBackupNativeTransport(ports: BackupNativePorts = {}): BackupTransport {
  const inspect = ports.inspectAsync;
  const exportBackup = ports.exportAsync;
  return {
    capabilities: Object.freeze({
      inspect: Boolean(inspect),
      export: Boolean(exportBackup),
      apply: false,
      boardOnly: false,
    }),
    async inspectAsync(file, signal, onPhase) {
      if (!inspect) throw new BackupTransportError("unsupported");
      if (file.size > maximumBackupFileBytes) throw new BackupTransportError("too-large");
      signal.throwIfAborted();
      onPhase("reading");
      const bytes = new Uint8Array(await file.arrayBuffer());
      try {
        signal.throwIfAborted();
        onPhase("inspecting");
        const output: unknown = await inspect(bytes, { signal });
        signal.throwIfAborted();
        const result = inspectionSchema.safeParse(output);
        if (!result.success) throw new BackupTransportError("invalid-response");
        return result.data;
      } finally {
        bytes.fill(0);
      }
    },
    async exportAsync(signal) {
      if (!exportBackup) throw new BackupTransportError("unsupported");
      signal.throwIfAborted();
      const response = await exportBackup(signal);
      if (signal.aborted) {
        await response.body?.cancel();
        signal.throwIfAborted();
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new BackupTransportError(
          response.status === 401 || response.status === 403 ? "denied" : "transport-failed",
        );
      }
      if (response.headers.get("content-type")?.split(";")[0]?.trim() !== "application/zip") {
        await response.body?.cancel();
        throw new BackupTransportError("invalid-response");
      }
      const filename = response.headers.get("content-disposition")?.match(/filename="([^"\r\n]+)"/)?.[1];
      const blob = await response.blob();
      signal.throwIfAborted();
      if (!blob.size) throw new BackupTransportError("invalid-response");
      return { blob, filename: filename?.split(/[\\/]/).at(-1) || "homarr-backup.zip" };
    },
  };
}
