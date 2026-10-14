import { useState } from "react";
import { Alert, Group, rem, Text } from "@mantine/core";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import { IconAlertTriangle, IconFileZip, IconUpload, IconX } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/standalone/client";

import { maximumBackupFileBytes } from "../../features/backup/contracts";

export interface BackupUploadZoneProps {
  variant?: "card" | "standalone";
  disabled?: boolean;
  onSelectFile: (file: File | null) => void;
}

export function BackupUploadZone({ variant = "card", disabled = false, onSelectFile }: BackupUploadZoneProps) {
  const t = useI18n("management.page.tool.backup.restore");
  const tValidation = useI18n("common.zod.errors.custom");
  const [error, setError] = useState<string | null>(null);
  let minimumHeight = 160;
  if (variant === "standalone") minimumHeight = 200;
  return (
    <>
      <Dropzone
        onDrop={(files) => {
          if (disabled) return;
          setError(null);
          onSelectFile(files[0] ?? null);
        }}
        onReject={(rejections) => {
          if (disabled) return;
          let message = t("dropzone.description", { maxSize: "256 MiB" });
          if (rejections.some((rejection) => rejection.errors.some((failure) => failure.code === "file-too-large"))) {
            message = tValidation("fileTooLarge", { maxSize: "256 MiB" });
          } else if (
            rejections.some((rejection) => rejection.errors.some((failure) => failure.code === "file-invalid-type"))
          ) {
            message = tValidation("invalidFileType", { expected: ".zip" });
          }
          setError(message);
          onSelectFile(null);
        }}
        onFileDialogCancel={() => {
          if (disabled) return;
          setError(null);
          onSelectFile(null);
        }}
        acceptColor="blue.6"
        rejectColor="red.6"
        accept={[MIME_TYPES.zip, "application/x-zip-compressed"]}
        multiple={false}
        maxFiles={1}
        maxSize={maximumBackupFileBytes}
        disabled={disabled}
        radius="md"
      >
        <Group justify="center" gap="xl" mih={minimumHeight} style={{ pointerEvents: "none" }}>
          <Dropzone.Accept>
            <IconUpload
              style={{ width: rem(52), height: rem(52), color: "var(--mantine-color-blue-6)" }}
              stroke={1.5}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX style={{ width: rem(52), height: rem(52), color: "var(--mantine-color-red-6)" }} stroke={1.5} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconFileZip
              style={{ width: rem(52), height: rem(52), color: "var(--mantine-color-dimmed)" }}
              stroke={1.5}
            />
          </Dropzone.Idle>
          <div>
            <Text size="xl" inline>
              {t("dropzone.title")}
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              {t("dropzone.description", { maxSize: "256 MiB" })}
            </Text>
          </div>
        </Group>
      </Dropzone>
      {error && (
        <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t("analysisError")}>
          {error}
        </Alert>
      )}
    </>
  );
}
