import { useState } from "react";
import { ActionIcon, Alert, Button, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconCheck, IconCopy, IconExternalLink, IconPhoto, IconTrash } from "@tabler/icons-react";

import type { MediaDisplayItem, MediaDisplaySelection } from "./contracts";

export interface MediaActionsProps {
  readonly media: MediaDisplayItem;
  readonly url: string;
  readonly canShowDelete: boolean;
  readonly deleteUnavailableReason: string;
  readonly selectedId?: string;
  readonly onSelect?: (selection: MediaDisplaySelection) => void;
}

export function MediaActions(props: MediaActionsProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [deleteDetailsOpened, setDeleteDetailsOpened] = useState(false);
  const copyLabel = `Copy URL for ${props.media.name}`;
  const openLabel = `Open ${props.media.name}`;
  const selectLabel = `Use ${props.media.name} as an icon`;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(new URL(props.url, window.location.origin).href);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <Stack gap="xs">
      <Group wrap="nowrap" gap="xs">
        {props.onSelect && (
          <Tooltip label={selectLabel} openDelay={500}>
            <ActionIcon
              aria-label={selectLabel}
              aria-pressed={props.selectedId === props.media.id}
              variant={props.selectedId === props.media.id ? "filled" : "subtle"}
              onClick={() => props.onSelect?.({ id: props.media.id, url: props.url })}
            >
              <IconPhoto size={16} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
        )}
        <Tooltip label={copyLabel} openDelay={500}>
          <ActionIcon
            aria-label={copyLabel}
            onClick={() => void copyUrl()}
            color={copyState === "copied" ? "teal" : "gray"}
            variant="subtle"
          >
            {copyState === "copied" ? <IconCheck size={16} stroke={1.5} /> : <IconCopy size={16} stroke={1.5} />}
          </ActionIcon>
        </Tooltip>
        <Tooltip label={openLabel} openDelay={500}>
          <ActionIcon
            aria-label={openLabel}
            component="a"
            href={props.url}
            target="_blank"
            rel="noopener noreferrer"
            color="gray"
            variant="subtle"
          >
            <IconExternalLink size={16} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
        {props.canShowDelete && (
          <Tooltip label="Delete unavailable: show details" openDelay={500}>
            <ActionIcon
              color="red"
              variant="subtle"
              aria-label={`Delete unavailable for ${props.media.name}: show details`}
              aria-expanded={deleteDetailsOpened}
              onClick={() => setDeleteDetailsOpened((opened) => !opened)}
            >
              <IconTrash color="red" size={16} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
      {copyState === "copied" && (
        <Text component="output" size="xs" aria-live="polite">
          URL copied.
        </Text>
      )}
      {copyState === "failed" && (
        <Alert color="red" role="alert">
          Could not copy the URL. Clipboard access requires a secure connection.
        </Alert>
      )}
      {deleteDetailsOpened && props.canShowDelete && (
        <Alert color="yellow" title="Delete unavailable">
          <Stack gap="xs">
            <Text size="sm">{props.deleteUnavailableReason} This media has not been deleted.</Text>
            <Group>
              <Button size="xs" color="red" disabled>
                Delete image
              </Button>
              <Button size="xs" variant="default" onClick={() => setDeleteDetailsOpened(false)}>
                Close details
              </Button>
            </Group>
          </Stack>
        </Alert>
      )}
    </Stack>
  );
}
