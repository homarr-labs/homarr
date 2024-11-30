import { Group, rem, Text } from "@mantine/core";
import type { FileWithPath } from "@mantine/dropzone";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import { IconFileZip, IconUpload, IconX } from "@tabler/icons-react";

import "@mantine/dropzone/styles.css";

interface ImportDropZoneProps {
  loading: boolean;
  updateFile: (file: FileWithPath) => void;
}

export const ImportDropZone = ({ loading, updateFile }: ImportDropZoneProps) => {
  return (
    <Dropzone
      onDrop={(files) => {
        const firstFile = files[0];
        if (!firstFile) return;

        updateFile(firstFile);
      }}
      acceptColor="blue.6"
      rejectColor="red.6"
      accept={[MIME_TYPES.zip]}
      loading={loading}
      multiple={false}
      maxSize={1024 * 1024 * 1024 * 64} // 64 MB
    >
      <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: "none" }}>
        <Dropzone.Accept>
          <IconUpload style={{ width: rem(52), height: rem(52), color: "var(--mantine-color-blue-6)" }} stroke={1.5} />
        </Dropzone.Accept>
        <Dropzone.Reject>
          <IconX style={{ width: rem(52), height: rem(52), color: "var(--mantine-color-red-6)" }} stroke={1.5} />
        </Dropzone.Reject>
        <Dropzone.Idle>
          <IconFileZip style={{ width: rem(52), height: rem(52), color: "var(--mantine-color-dimmed)" }} stroke={1.5} />
        </Dropzone.Idle>

        <div>
          <Text size="xl" inline>
            Drag the zip file here or click to browse
          </Text>
          <Text size="sm" c="dimmed" inline mt={7}>
            The uploaded zip will be processed and you'll be able to select what you want to import
          </Text>
        </div>
      </Group>
    </Dropzone>
  );
};
