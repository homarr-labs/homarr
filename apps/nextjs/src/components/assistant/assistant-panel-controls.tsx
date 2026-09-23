"use client";

import { useState } from "react";
import { ThreadPrimitive } from "@assistant-ui/react";
import { ActionIcon, Box, Button, Group, Popover, Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import {
  IconActivityHeartbeat,
  IconApps,
  IconPalette,
  IconRefresh,
  IconRobot,
  IconSearch,
  IconShieldCheck,
} from "@tabler/icons-react";

import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import classes from "./assistant-panel.module.css";
import { useAssistantAutoApproval } from "./assistant-auto-approval";
import type { AssistantConversationControls } from "./assistant-conversation-controls";

const compactSuggestionVars = () => ({
  root: {
    "--button-fz": "calc(var(--mantine-font-size-sm) * var(--board-canvas-ui-scale, 1))",
    "--button-bg": "rgb(from var(--mantine-color-default) r g b / var(--opacity, 1))",
    "--button-hover": "rgb(from var(--mantine-color-default-hover) r g b / var(--opacity, 1))",
    "--button-bd": "1px solid rgb(from var(--mantine-color-default-border) r g b / var(--opacity, 1))",
  },
});

export const AutoApprovalControl = () => {
  const t = useI18n("assistant.autoApproval");
  const [opened, setOpened] = useState(false);
  const { enabled, setEnabled } = useAssistantAutoApproval();

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      onDismiss={() => setOpened(false)}
      position="bottom-end"
      width="min(19rem, calc(100vw - 1rem))"
      shadow="md"
      withinPortal
    >
      <Popover.Target>
        <ActionIcon
          className={classes.panelAction}
          variant={enabled ? "light" : "subtle"}
          color={enabled ? "green" : "gray"}
          onClick={() => setOpened((current) => !current)}
          aria-label={t("label")}
          aria-pressed={enabled}
          title={enabled ? t("enabled") : t("label")}
        >
          <IconShieldCheck size={17} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Box>
            <Text size="sm" fw={700}>
              {t("title")}
            </Text>
            <Text size="xs" c="dimmed" mt={3}>
              {t("description")}
            </Text>
          </Box>
          <Button
            fullWidth
            variant={enabled ? "default" : "light"}
            color={enabled ? "gray" : "green"}
            leftSection={<IconShieldCheck size={16} />}
            onClick={() => {
              setEnabled(!enabled);
              setOpened(false);
            }}
          >
            {enabled ? t("disable") : t("enable")}
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};

export const ViewRefreshAction = ({
  isRefreshing,
  onRefresh,
}: Pick<AssistantConversationControls, "isRefreshing" | "onRefresh">) => {
  const t = useI18n("assistant.refresh");

  const refresh = async () => {
    try {
      await onRefresh();
      showSuccessNotification({ title: t("completeTitle"), message: t("completeDescription") });
    } catch {
      showErrorNotification({ title: t("failedTitle"), message: t("failedDescription") });
    }
  };

  return (
    <Tooltip label={isRefreshing ? t("working") : t("action")}>
      <ActionIcon
        className={classes.panelAction}
        variant="subtle"
        color="gray"
        loading={isRefreshing}
        loaderProps={{ type: "bars" }}
        onClick={() => void refresh()}
        aria-label={isRefreshing ? t("working") : t("action")}
      >
        <IconRefresh size={17} />
      </ActionIcon>
    </Tooltip>
  );
};

export const EmptyThread = ({ compact = false }: { compact?: boolean }) => {
  const t = useI18n("assistant");
  if (compact) {
    return (
      <ThreadPrimitive.Empty>
        <Box className={classes.empty} data-compact>
          <Group className={classes.compactEmptyIntro} wrap="nowrap" align="flex-start" gap="sm">
            <ThemeIcon size="md" radius="xl" variant="light" mt={2}>
              <IconRobot size="1em" />
            </ThemeIcon>
            <Stack gap={0} ta="start" miw={0}>
              <Text size="md" fw={700}>
                {t("emptyTitle")}
              </Text>
            </Stack>
          </Group>
          <Box className={classes.suggestions}>
            <ThreadPrimitive.Suggestion prompt={t("suggestions.health.prompt")} send={false} clearComposer asChild>
              <Button
                variant="default"
                size="sm"
                className={classes.compactSuggestion}
                vars={compactSuggestionVars}
                leftSection={<IconActivityHeartbeat size="1em" />}
              >
                {t("suggestions.health.label")}
              </Button>
            </ThreadPrimitive.Suggestion>
            <ThreadPrimitive.Suggestion prompt={t("suggestions.explore.prompt")} send={false} clearComposer asChild>
              <Button
                variant="default"
                size="sm"
                className={classes.compactSuggestion}
                vars={compactSuggestionVars}
                leftSection={<IconApps size="1em" />}
              >
                {t("suggestions.explore.label")}
              </Button>
            </ThreadPrimitive.Suggestion>
            <ThreadPrimitive.Suggestion prompt={t("suggestions.media.prompt")} send={false} clearComposer asChild>
              <Button
                variant="default"
                size="sm"
                className={classes.compactSuggestion}
                vars={compactSuggestionVars}
                leftSection={<IconSearch size="1em" />}
              >
                {t("suggestions.media.label")}
              </Button>
            </ThreadPrimitive.Suggestion>
            <ThreadPrimitive.Suggestion prompt={t("suggestions.style.prompt")} send={false} clearComposer asChild>
              <Button
                variant="default"
                size="sm"
                className={classes.compactSuggestion}
                vars={compactSuggestionVars}
                leftSection={<IconPalette size="1em" />}
              >
                {t("suggestions.style.label")}
              </Button>
            </ThreadPrimitive.Suggestion>
          </Box>
        </Box>
      </ThreadPrimitive.Empty>
    );
  }

  return (
    <ThreadPrimitive.Empty>
      <Box className={classes.empty}>
        <Stack align="center" gap="lg" maw={560} w="100%">
          <Stack align="center" gap="xs" maw={430} ta="center">
            <ThemeIcon size={52} radius="xl" variant="light">
              <IconRobot size={27} />
            </ThemeIcon>
            <Text size="xl" fw={700}>
              {t("emptyTitle")}
            </Text>
            <Text size="sm" className={classes.emptyDescription}>
              {t("emptyDescription")}
            </Text>
          </Stack>
          <Box className={classes.suggestions}>
            <ThreadPrimitive.Suggestion prompt={t("suggestions.health.prompt")} send={false} clearComposer asChild>
              <Button
                variant="default"
                className={classes.suggestion}
                leftSection={<IconActivityHeartbeat size={18} />}
              >
                {t("suggestions.health.label")}
              </Button>
            </ThreadPrimitive.Suggestion>
            <ThreadPrimitive.Suggestion prompt={t("suggestions.explore.prompt")} send={false} clearComposer asChild>
              <Button variant="default" className={classes.suggestion} leftSection={<IconApps size={18} />}>
                {t("suggestions.explore.label")}
              </Button>
            </ThreadPrimitive.Suggestion>
            <ThreadPrimitive.Suggestion prompt={t("suggestions.media.prompt")} send={false} clearComposer asChild>
              <Button variant="default" className={classes.suggestion} leftSection={<IconSearch size={18} />}>
                {t("suggestions.media.label")}
              </Button>
            </ThreadPrimitive.Suggestion>
            <ThreadPrimitive.Suggestion prompt={t("suggestions.style.prompt")} send={false} clearComposer asChild>
              <Button variant="default" className={classes.suggestion} leftSection={<IconPalette size={18} />}>
                {t("suggestions.style.label")}
              </Button>
            </ThreadPrimitive.Suggestion>
          </Box>
        </Stack>
      </Box>
    </ThreadPrimitive.Empty>
  );
};
