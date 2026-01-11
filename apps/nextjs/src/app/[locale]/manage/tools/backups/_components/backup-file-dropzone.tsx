"use client";

import { Stack, Text, ThemeIcon } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { IconCheck, IconUpload, IconX } from "@tabler/icons-react";

import type { ScopedTranslationFunction } from "@homarr/translation";

interface BackupFileDropzoneProps {
  onDrop: (files: File[]) => void | Promise<void>;
  loading: boolean;
  tBackup: ScopedTranslationFunction<"backup">;
}

export const BackupFileDropzone = ({ onDrop, loading, tBackup }: BackupFileDropzoneProps) => {
  return (
    <Dropzone onDrop={onDrop} accept={["application/zip"]} maxFiles={1} loading={loading}>
      <Stack align="center" gap="sm" py="xl">
        <Dropzone.Accept>
          <ThemeIcon size={48} radius="xl" color="green" variant="light">
            <IconCheck size={24} />
          </ThemeIcon>
        </Dropzone.Accept>
        <Dropzone.Reject>
          <ThemeIcon size={48} radius="xl" color="red" variant="light">
            <IconX size={24} />
          </ThemeIcon>
        </Dropzone.Reject>
        <Dropzone.Idle>
          <ThemeIcon size={48} radius="xl" color="gray" variant="light">
            <IconUpload size={24} />
          </ThemeIcon>
        </Dropzone.Idle>
        <Text size="lg" fw={500}>
          {tBackup("action.restore.dropzone.title")}
        </Text>
        <Text size="sm" c="dimmed">
          {tBackup("action.restore.dropzone.description")}
        </Text>
      </Stack>
    </Dropzone>
  );
};
