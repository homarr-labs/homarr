"use client";

import { Button, Group, Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconBox, IconLayoutDashboard, IconPlug, IconResize } from "@tabler/icons-react";

import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useScopedI18n } from "@homarr/translation/client";

import { useBoardAddActions } from "./use-board-add-actions";
import classes from "./board-empty-state.module.css";

export const BoardEmptyState = () => {
  const board = useRequiredBoard();
  const [isEditMode] = useEditMode();
  const { addWidget, addApp, connectService, canConnectService } = useBoardAddActions();
  const t = useScopedI18n("board.emptyState");
  const hasBoardContent = board.items.length > 0 || board.sections.some((section) => section.kind !== "empty");

  if (!isEditMode || hasBoardContent) return null;

  return (
    <div className={classes.root}>
      <Paper className={classes.panel} withBorder radius="md" p="lg">
        <Stack align="center" gap="sm">
          <ThemeIcon variant="light" size="xl" radius="md">
            <IconLayoutDashboard size={24} />
          </ThemeIcon>
          <Stack align="center" gap={4}>
            <Title order={3} size="h4" ta="center">
              {t("title")}
            </Title>
            <Text c="dimmed" size="sm" ta="center" maw="60ch">
              {t("description")}
            </Text>
          </Stack>
          <Group justify="center">
            <Button leftSection={<IconResize size={18} />} onClick={addWidget}>
              {t("addWidget")}
            </Button>
            <Button variant="default" leftSection={<IconBox size={18} />} onClick={addApp}>
              {t("addApp")}
            </Button>
            {canConnectService && (
              <Button variant="default" leftSection={<IconPlug size={18} />} onClick={connectService}>
                {t("connectService")}
              </Button>
            )}
          </Group>
        </Stack>
      </Paper>
    </div>
  );
};
