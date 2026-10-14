"use client";

import { useState } from "react";
import { ActionIcon, Avatar, Badge, Button, Card, Collapse, Group, Kbd, Stack, Text, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

import type { IntegrationSecretCardViewProps } from "./contracts";

export const IntegrationSecretCardView = ({
  display,
  kindIcon,
  kindLabel,
  lastUpdated,
  copy,
  children,
  onCancel,
}: IntegrationSecretCardViewProps) => {
  const [publicSecretDisplayOpened, { toggle: togglePublicSecretDisplay }] = useDisclosure(false);
  const [editMode, setEditMode] = useState(false);
  const DisplayIcon = publicSecretDisplayOpened ? IconEye : IconEyeOff;

  return (
    <Card>
      <Stack>
        <Group justify="space-between">
          <Group>
            <Avatar>{kindIcon}</Avatar>
            <Text fw={500}>{kindLabel}</Text>
            {publicSecretDisplayOpened && display.kind === "public" ? <Kbd>{display.value}</Kbd> : null}
          </Group>
          <Group>
            {lastUpdated ? (
              <Text c="gray.6" size="sm">
                {lastUpdated}
              </Text>
            ) : (
              <Tooltip label={copy.notSetTooltip} position="left">
                <Badge color="orange" variant="light" size="sm">
                  {copy.notSetLabel}
                </Badge>
              </Tooltip>
            )}
            {display.kind === "public" ? (
              <ActionIcon
                color="gray"
                variant="subtle"
                onClick={togglePublicSecretDisplay}
                aria-label={publicSecretDisplayOpened ? copy.hide : copy.show}
              >
                <DisplayIcon size={16} stroke={1.5} />
              </ActionIcon>
            ) : null}
            <Button
              variant="default"
              onClick={async () => {
                if (!editMode) {
                  setEditMode(true);
                  return;
                }

                const shouldCancel = await onCancel();
                if (!shouldCancel) return;
                setEditMode(false);
              }}
            >
              {editMode ? copy.cancel : copy.edit}
            </Button>
          </Group>
        </Group>
        <Collapse expanded={editMode}>{children}</Collapse>
      </Stack>
    </Card>
  );
};
