"use client";

import { ActionIcon, Affix, Button, Group, Paper, Progress, Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { IconCheck, IconChevronDown, IconChecklist } from "@tabler/icons-react";

import { useIntegrationsWithUseAccess } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useI18n } from "@homarr/translation/client";

import { useSetupAnalytics } from "~/components/create/setup-analytics";
import { getBoardSetupProgress } from "./board-setup-progress";
import { useBoardAddActions } from "./use-board-add-actions";
import classes from "./board-setup-checklist.module.css";

export const BoardSetupChecklist = () => {
  const board = useRequiredBoard();
  const [isEditMode] = useEditMode();
  const integrations = useIntegrationsWithUseAccess();
  const { addWidget, addApp, connectService, canConnectService } = useBoardAddActions();
  const [collapsed, setCollapsed] = useLocalStorage({
    key: `homarr-board-setup-checklist-${board.id}`,
    defaultValue: false,
  });
  const t = useI18n("board.setupChecklist");
  const tCommon = useI18n("common.action");
  const trackSetup = useSetupAnalytics();
  const progress = getBoardSetupProgress({
    itemKinds: board.items.map((item) => item.kind),
    usableIntegrationCount: integrations.length,
  });

  if (!isEditMode || progress.isComplete) return null;

  if (collapsed) {
    return (
      <Affix position={{ bottom: 16, left: 16 }} className={classes.root}>
        <Button
          variant="default"
          leftSection={<IconChecklist size={18} />}
          onClick={() => {
            trackSetup("checklist-resumed", { entryPoint: "board", outcome: "continued", hasBoardContext: true });
            setCollapsed(false);
          }}
        >
          {t("resume", { completed: progress.completedCount, total: progress.totalCount })}
        </Button>
      </Affix>
    );
  }

  return (
    <Affix position={{ bottom: 16, left: 16 }} className={classes.root}>
      <Paper className={classes.panel} withBorder shadow="md" radius="md" p="md">
        <Stack gap="sm">
          <Group justify="space-between" wrap="nowrap">
            <div>
              <Text fw={600}>{t("title")}</Text>
              <Text c="dimmed" size="xs">
                {t("description")}
              </Text>
            </div>
            <Tooltip label={t("collapse")}>
              <ActionIcon variant="subtle" aria-label={t("collapse")} onClick={() => setCollapsed(true)}>
                <IconChevronDown size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Progress
            value={progress.totalCount === 0 ? 0 : (progress.completedCount / progress.totalCount) * 100}
            aria-label={t("progress")}
          />
          <ChecklistStep
            complete={progress.steps.content}
            label={t("step.content.label")}
            description={t("step.content.description")}
            actionLabel={tCommon("add")}
            onAction={addWidget}
          />
          <ChecklistStep
            complete={progress.steps.app}
            label={t("step.app.label")}
            description={t("step.app.description")}
            actionLabel={tCommon("add")}
            onAction={addApp}
          />
          <ChecklistStep
            complete={progress.steps.service}
            label={t("step.service.label")}
            description={canConnectService ? t("step.service.description") : t("step.service.permissionDescription")}
            actionLabel={canConnectService ? t("step.service.action") : undefined}
            onAction={canConnectService ? connectService : undefined}
          />
        </Stack>
      </Paper>
    </Affix>
  );
};

const ChecklistStep = ({
  complete,
  label,
  description,
  actionLabel,
  onAction,
}: {
  complete: boolean;
  label: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <Group className={classes.step} data-complete={complete || undefined} wrap="nowrap" align="flex-start">
    <ThemeIcon variant={complete ? "filled" : "light"} color={complete ? "green" : "gray"} size="md" mt={2}>
      {complete ? <IconCheck size={14} /> : <IconChecklist size={14} />}
    </ThemeIcon>
    <Stack gap={1} style={{ flex: 1 }}>
      <Text size="sm" fw={600} td={complete ? "line-through" : undefined}>
        {label}
      </Text>
      <Text size="xs" c="dimmed">
        {description}
      </Text>
    </Stack>
    {!complete && onAction && actionLabel && (
      <Button variant="subtle" size="compact-xs" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </Group>
);
