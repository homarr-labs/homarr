import { useMemo, useState } from "react";
import { Button, Collapse, CopyButton, Group, Paper, ScrollArea, Stack, Text, Textarea } from "@mantine/core";
import { IconCheck, IconCopy, IconExternalLink } from "@tabler/icons-react";

import { ResponseTree } from "./response-tree";

export interface PreviewResponseMessages {
  empty: string;
  sampleHint: string;
  editSample: string;
  addSample: string;
  copied: string;
  copy: string;
  sampleLabel: string;
  sampleDescription: string;
  invalidSample: string;
  cancelSample: string;
  applySample: string;
  copyPath: string;
  pathCopied: string;
  insertPath: string;
  openRaw: string;
}

export interface PreviewResponsePanelProps {
  value: unknown;
  rawResponse?: string | null;
  onInsertDataPath?(path: string): void;
  onSampleDataChange?(value: unknown): void;
  messages: PreviewResponseMessages;
}

function openRawResponse(rawResponse: string) {
  const url = URL.createObjectURL(new Blob([rawResponse], { type: "application/json" }));
  window.open(url);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function PreviewResponsePanel({
  value,
  rawResponse,
  onInsertDataPath,
  onSampleDataChange,
  messages,
}: PreviewResponsePanelProps) {
  const responseJson = value == null ? "" : JSON.stringify(value, null, 2);
  const [draft, setDraft] = useState(responseJson);
  const [editing, setEditing] = useState(false);
  const error = useMemo(() => {
    if (!draft.trim()) return null;
    try {
      JSON.parse(draft);
      return null;
    } catch {
      return messages.invalidSample;
    }
  }, [draft, messages.invalidSample]);
  const edit = () => {
    setDraft(responseJson || JSON.stringify({ name: "Sample service", status: "online", value: 42 }, null, 2));
    setEditing(true);
  };
  const apply = () => {
    if (!draft.trim() || error) return;
    onSampleDataChange?.(JSON.parse(draft) as unknown);
    setEditing(false);
  };
  return (
    <Stack gap="xs">
      <Group justify="space-between" wrap="wrap">
        <Text size="xs" c="dimmed">
          {responseJson ? messages.sampleHint : messages.empty}
        </Text>
        <Group gap={4}>
          {onSampleDataChange && (
            <Button type="button" size="compact-xs" variant="light" onClick={edit}>
              {responseJson ? messages.editSample : messages.addSample}
            </Button>
          )}
          {responseJson && (
            <CopyButton value={responseJson}>
              {({ copied, copy }) => (
                <Button
                  type="button"
                  size="compact-xs"
                  variant="subtle"
                  leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  onClick={copy}
                >
                  {copied ? messages.copied : messages.copy}
                </Button>
              )}
            </CopyButton>
          )}
        </Group>
      </Group>
      <Collapse expanded={editing}>
        <Paper p="sm" bg="var(--mantine-color-default-hover)">
          <Stack gap="sm">
            <Textarea
              label={messages.sampleLabel}
              description={messages.sampleDescription}
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              error={error}
              autosize
              minRows={8}
              maxRows={18}
              styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)" } }}
            />
            <Group justify="flex-end">
              <Button type="button" variant="default" size="xs" onClick={() => setEditing(false)}>
                {messages.cancelSample}
              </Button>
              <Button type="button" size="xs" onClick={apply} disabled={!draft.trim() || Boolean(error)}>
                {messages.applySample}
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Collapse>
      {responseJson ? (
        <>
          <ScrollArea h={360} type="auto">
            <ResponseTree
              value={value}
              onInsertDataPath={onInsertDataPath}
              labels={{ copyPath: messages.copyPath, pathCopied: messages.pathCopied, insertPath: messages.insertPath }}
            />
          </ScrollArea>
          {rawResponse && (
            <Button
              type="button"
              size="xs"
              variant="subtle"
              leftSection={<IconExternalLink size={14} />}
              onClick={() => openRawResponse(rawResponse)}
            >
              {messages.openRaw}
            </Button>
          )}
        </>
      ) : (
        <Text size="xs" c="dimmed" ta="center" py="xl">
          {messages.empty}
        </Text>
      )}
    </Stack>
  );
}
