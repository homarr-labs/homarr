"use client";

import { useState } from "react";
import { ActionIcon, Button, Card, Fieldset, Group, rem, Stack, Switch, Text } from "@mantine/core";
import type { FileWithPath } from "@mantine/dropzone";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";

import "@mantine/dropzone/styles.css";

import { IconFileZip, IconPencil, IconUpload, IconX } from "@tabler/icons-react";

import { humanFileSize } from "@homarr/common";
import { SelectWithDescription } from "@homarr/ui";

export const InitImport = () => {
  const [file, setFile] = useState<FileWithPath | null>(null);

  if (!file) {
    return (
      <Card w={64 * 12 + 8} maw="90vw">
        <ImportDropZone updateFile={setFile} />
      </Card>
    );
  }

  return (
    <Stack>
      <FileInfoCard file={file} onRemove={() => setFile(null)} />
      <ImportSettingsCard />
      <BoardSelectionCard />
      <ImportSummaryCard />
    </Stack>
  );
};

interface ImportDropZoneProps {
  updateFile: (file: FileWithPath) => void;
}

const ImportDropZone = ({ updateFile }: ImportDropZoneProps) => {
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

interface FileInfoCardProps {
  file: FileWithPath;
  onRemove: () => void;
}

const FileInfoCard = ({ file, onRemove }: FileInfoCardProps) => {
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

const ImportSettingsCard = () => {
  return (
    <Card w={64 * 12 + 8} maw="90vw">
      <Stack gap="sm">
        <Stack gap={0}>
          <Text fw={500}>Import settings</Text>
          <Text size="sm" c="gray.6">
            Configure the import behavior
          </Text>
        </Stack>

        <Fieldset legend="Apps" bg="transparent">
          <Switch label="Only import apps" description="Only adds the apps, boards will be skipped" />
        </Fieldset>

        <SelectWithDescription
          label="Sidebar behavior"
          description="Sidebars were removed in 1.0, you can select what should happen with the items inside them."
          withAsterisk
          data={[
            { value: "1", label: "Group 1", description: "Description for group 1" },
            { value: "2", label: "Group 2", description: "Description for group 2" },
          ]}
        />
      </Stack>
    </Card>
  );
};

const BoardSelectionCard = () => {
  return (
    <Card w={64 * 12 + 8} maw="90vw">
      <Stack gap="sm">
        <Stack gap={0}>
          <Text fw={500}>Found 10 boards</Text>
          <Text size="sm" c="gray.6">
            Choose all boards with there size you want to import
          </Text>
        </Stack>
      </Stack>
    </Card>
  );
};

const ImportSummaryCard = () => {
  return (
    <Card w={64 * 12 + 8} maw="90vw">
      <Stack gap="sm">
        <Stack gap={0}>
          <Text fw={500}>Import summary</Text>
          <Text size="sm" c="gray.6">
            In the below summary you can see what will be imported
          </Text>
        </Stack>

        <Button>Confirm import and continue</Button>
      </Stack>
    </Card>
  );
};
