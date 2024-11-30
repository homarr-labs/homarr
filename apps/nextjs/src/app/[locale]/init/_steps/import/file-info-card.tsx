import { ActionIcon, Button, Card, Group, Text } from "@mantine/core";
import type { FileWithPath } from "@mantine/dropzone";
import { IconPencil } from "@tabler/icons-react";

import { humanFileSize } from "@homarr/common";

interface FileInfoCardProps {
  file: FileWithPath;
  onRemove: () => void;
}

export const FileInfoCard = ({ file, onRemove }: FileInfoCardProps) => {
  return (
    <Card w={64 * 12 + 8} maw="90vw">
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group>
          <Text fw={500} lineClamp={1} style={{ wordBreak: "break-all" }}>
            {file.name}
          </Text>
          <Text visibleFrom="md" c="gray.6" size="sm">
            {humanFileSize(file.size)}
          </Text>
        </Group>
        <Button
          variant="subtle"
          color="gray"
          rightSection={<IconPencil size={16} stroke={1.5} />}
          onClick={onRemove}
          visibleFrom="md"
        >
          Change file
        </Button>
        <ActionIcon size="sm" variant="subtle" color="gray" hiddenFrom="md" onClick={onRemove}>
          <IconPencil size={16} stroke={1.5} />
        </ActionIcon>
      </Group>
    </Card>
  );
};
