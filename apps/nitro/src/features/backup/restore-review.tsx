import { useState } from "react";
import { Alert, Button, Group, PasswordInput, Radio, Select, Stack, Text, Title } from "@mantine/core";

import type { BackupInspection, BackupKeySelection } from "./contracts";
import { BackupConfirmation } from "./confirmation";
import { BackupApplyUnavailable } from "./feedback";

export function BackupRestoreReview({ inspection }: { inspection: BackupInspection }) {
  const [sourceBoardId, setSourceBoardId] = useState<string | null>(inspection.homeBoard?.id ?? null);
  const [key, setKey] = useState<BackupKeySelection>(
    inspection.carriesEncryptionKey ? { kind: "archive" } : { kind: "manual", value: "" },
  );
  const [showConfirmation, setShowConfirmation] = useState(false);
  const hasEncryptedFields = Object.values(inspection.encryptedFields).some((count) => count > 0);
  const keyValid = key.kind === "archive" ? inspection.carriesEncryptionKey : /^[0-9a-fA-F]{64}$/.test(key.value);
  const selectedBoard = inspection.boards.find((board) => board.id === sourceBoardId);

  function changeKeyMode(value: string) {
    setKey(
      value === "archive" && inspection.carriesEncryptionKey ? { kind: "archive" } : { kind: "manual", value: "" },
    );
    setShowConfirmation(false);
  }

  return (
    <Stack gap="md">
      <Title order={3}>Review restore scope</Title>
      <Radio.Group value="full" label="Restore scope" readOnly>
        <Stack gap="xs" mt="xs">
          <Radio value="full" label="Full database replacement, unavailable" />
          <Radio value="board-only" label="Board-only import, unsupported by the frozen backup contract" disabled />
        </Stack>
      </Radio.Group>
      <Text size="sm">
        A source-board selection only changes the prepared home-board destination. It does not filter the snapshot or
        turn a full restore into a board-only import.
      </Text>
      <Select
        label="Source home-board destination"
        placeholder={inspection.boards.length ? "Keep the source default" : "No source boards"}
        data={inspection.boards.map((board) => ({ value: board.id, label: `${board.name} (${board.id})` }))}
        value={sourceBoardId}
        onChange={(value) => {
          setSourceBoardId(value);
          setShowConfirmation(false);
        }}
        clearable
        searchable
        disabled={!inspection.boards.length}
      />
      {selectedBoard && (
        <Text size="sm">Selected source board: {selectedBoard.name}. All database data would still be replaced.</Text>
      )}
      <Radio.Group value={key.kind} onChange={changeKeyMode} label="Original source encryption key">
        <Stack gap="xs" mt="xs">
          <Radio
            value="archive"
            label="Use key included in the source archive"
            disabled={!inspection.carriesEncryptionKey}
          />
          <Radio value="manual" label="Provide the original source key" />
        </Stack>
      </Radio.Group>
      {key.kind === "manual" && (
        <PasswordInput
          label="Source key, 64 hexadecimal characters"
          description="Kept only in this review's memory. It is not sent during inspection, stored, logged or compared with the destination key."
          value={key.value}
          onChange={(event) => {
            setKey({ kind: "manual", value: event.currentTarget.value });
            setShowConfirmation(false);
          }}
          error={key.value && !keyValid ? "Enter exactly 64 hexadecimal characters." : undefined}
          autoComplete="off"
        />
      )}
      {hasEncryptedFields && !keyValid && (
        <Alert color="orange" title="Source key required">
          This backup contains encrypted fields. Preparation would require a valid original source key. Inspection has
          not verified decryption.
        </Alert>
      )}
      {inspection.carriesEncryptionKey && key.kind === "manual" && (
        <Text size="sm">
          A future preparation must reject a supplied key that conflicts with the archive key. This screen cannot verify
          that match.
        </Text>
      )}
      <BackupApplyUnavailable />
      <Text size="sm">
        The board and key choices are review-only. Nothing is prepared or applied, and the current database is not
        replaced.
      </Text>
      <Alert color="blue" title="Restart and sign-in requirements">
        A future full restore must acknowledge durable application, reset only owned runtime caches and sessions, and
        confirm restarted-server readiness before offering sign-in again. A dropped request or readiness timeout must
        not be treated as success or trigger another destructive restore.
      </Alert>
      {showConfirmation ? (
        <BackupConfirmation operation="restore" unavailable onCancel={() => setShowConfirmation(false)} />
      ) : (
        <Group>
          <Button variant="default" onClick={() => setShowConfirmation(true)}>
            Review destructive restore warning
          </Button>
        </Group>
      )}
    </Stack>
  );
}
