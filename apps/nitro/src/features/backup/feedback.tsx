import { Alert, Text } from "@mantine/core";

import type { BackupFailureCode } from "./contracts";

const failureMessages: Record<BackupFailureCode, string> = {
  denied: "The server denied access. An authorized administrator or accepted first-run claim is required.",
  "too-large": "The backup exceeds the supported size limit. Select a ZIP no larger than 256 MiB.",
  "invalid-archive": "This is not a supported Homarr ZIP with db.sqlite and metadata.json. No data was applied.",
  "unsupported-dialect": "This flow inspects SQLite backups only. Use database-native tools for other databases.",
  "unsupported-version": "The source version is incompatible with this inspector. No data was applied.",
  "invalid-database": "The copied database could not be validated. No data was applied.",
  "invalid-reference": "The source contains invalid references. No data was applied.",
  "source-key-required":
    "Encrypted fields require the original source encryption key. Do not substitute the destination key.",
  "invalid-key": "The source key must be 64 hexadecimal characters. No data was applied.",
  "key-conflict":
    "The supplied source key conflicts with the archive key. Verify the original key rather than overriding the archive.",
  "invalid-ciphertext":
    "An encrypted field could not be decrypted or validated. The key may be wrong or the backup damaged. Do not discard encrypted fields to continue.",
  "migration-failed": "Migration of the disposable inspection copy failed. No data was applied.",
  "invalid-board": "The selected source board is not in this backup. Inspect the file again.",
  cancelled: "Inspection was cancelled. No data was applied.",
  "cleanup-failed":
    "The inspector could not confirm cleanup of its disposable copy. Contact the runtime operator before continuing.",
  unsupported: "This operation has no accepted native transport binding. No data was applied.",
  "invalid-response":
    "The server returned an unexpected backup response. It was not accepted as a valid preview or download.",
  "transport-failed": "The backup request could not be completed. No successful restore has been reported.",
};

export function BackupFailure({ code }: { code: BackupFailureCode }) {
  return (
    <Alert color="red" title="Backup operation stopped" role="alert">
      {failureMessages[code]}
    </Alert>
  );
}

export function BackupDataWarning() {
  return (
    <Alert color="orange" title="Sensitive database backup">
      <Text size="sm">
        The ZIP contains durable database data, accounts, API keys and encrypted credentials. An included source key can
        unlock those credentials. Store the archive securely and do not share it as a board template.
      </Text>
      <Text size="sm" mt="xs">
        SQL-only does not include a complete filesystem or external-service backup. Media records do not prove uploaded
        files are included. Keep a separate backup of durable files and the current instance.
      </Text>
    </Alert>
  );
}

export function BackupApplyUnavailable() {
  return (
    <Alert color="orange" title="Restore is not available in this runtime">
      Inspection does not replace data, verify decryption, or authorize a restore. Applying a backup remains disabled
      until genuine authorization, whole-runtime writer fencing, reset and restart handling are accepted together. No
      session, query cache or browser storage is cleared by this screen.
    </Alert>
  );
}
