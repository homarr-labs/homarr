"use client";

import { ActionIcon, Button, Card, CopyButton, DEFAULT_THEME, Stack } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";

import type { PemContentViewProps } from "./contracts";

export const PemContentView = ({ content, closeLabel, onClose }: PemContentViewProps) => (
  <Stack>
    <Card w="100%" pos="relative" bg="dark.6" fz="xs" p="sm">
      <pre
        style={{
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
        }}
      >
        {content}
      </pre>
      <CopyButton value={content}>
        {({ copy, copied }) => (
          <ActionIcon onClick={copy} pos="absolute" top={8} right={8} variant="default">
            {copied ? (
              <IconCheck size={16} stroke={1.5} color={DEFAULT_THEME.colors.green[6]} />
            ) : (
              <IconCopy size={16} stroke={1.5} />
            )}
          </ActionIcon>
        )}
      </CopyButton>
    </Card>

    <Button variant="light" color="gray" onClick={onClose}>
      {closeLabel}
    </Button>
  </Stack>
);
