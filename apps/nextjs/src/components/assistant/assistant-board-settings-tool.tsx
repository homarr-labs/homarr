"use client";

import { useMemo, useState } from "react";
import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import {
  Alert,
  Badge,
  Box,
  Button,
  ColorInput,
  CopyButton,
  Group,
  InputWrapper,
  Select,
  SimpleGrid,
  Skeleton,
  Slider,
  Stack,
  Switch,
  Tabs,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconFileTypeCss,
  IconPalette,
  IconPhoto,
  IconRefresh,
  IconSettings,
} from "@tabler/icons-react";
import type { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { backgroundImageAttachments, backgroundImageRepeats, backgroundImageSizes } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { boardSavePartialSettingsSchema } from "@homarr/validation/board";

import {
  getAssistantBoardSettingsResult,
  getAssistantBoardSettingsDefaultTab,
  getChangedBoardSettings,
  getCustomCssWarnings,
} from "./assistant-board-settings";
import { useAssistantAutomaticAction } from "./assistant-auto-approval";
import { AssistantAutomaticActionProgress } from "./assistant-automatic-action-progress";
import { hasCompleteAssistantToolArguments, hasFailedAssistantToolArguments } from "./assistant-human-tool-status";
import { AssistantHumanToolError } from "./assistant-human-tools";
import classes from "./assistant-panel.module.css";
import type {
  AssistantBoardSettingsChanges,
  ConfigureBoardSettingsArgs,
  ConfigureBoardSettingsResult,
} from "./assistant-tool-contracts";

type BoardSettings = RouterOutputs["board"]["getBoardSettings"];
const completeSettingsSchema = boardSavePartialSettingsSchema.required();
type BoardSettingsFormValues = z.infer<typeof completeSettingsSchema>;

const normalizeFormValues = (
  current: BoardSettings,
  proposed: AssistantBoardSettingsChanges,
): BoardSettingsFormValues => {
  const values = { ...current, ...proposed };
  return {
    pageTitle: values.pageTitle ?? "",
    metaTitle: values.metaTitle ?? "",
    logoImageUrl: values.logoImageUrl ?? "",
    faviconImageUrl: values.faviconImageUrl ?? "",
    backgroundImageUrl: values.backgroundImageUrl ?? "",
    backgroundImageAttachment: values.backgroundImageAttachment,
    backgroundImageRepeat: values.backgroundImageRepeat,
    backgroundImageSize: values.backgroundImageSize,
    primaryColor: values.primaryColor,
    secondaryColor: values.secondaryColor,
    opacity: values.opacity,
    customCss: values.customCss,
    iconColor: values.iconColor ?? "",
    itemRadius: values.itemRadius,
    disableStatus: values.disableStatus,
  };
};

const toCurrentValues = (current: BoardSettings): BoardSettingsFormValues => normalizeFormValues(current, {});

export const AssistantConfigureBoardSettingsTool = ({
  args,
  result,
  addResult,
  status,
  toolCallId,
}: ToolCallMessagePartProps<ConfigureBoardSettingsArgs, ConfigureBoardSettingsResult>) => {
  const t = useI18n("assistant.configureBoardSettings");
  const actionT = useI18n("common.action");
  const hasCompleteArguments = hasCompleteAssistantToolArguments(status);
  const boardId = args?.boardId ?? "";
  const settings = clientApi.board.getBoardSettings.useQuery(
    { id: boardId },
    { enabled: result === undefined && hasCompleteArguments && boardId.length > 0, retry: false },
  );
  const autoConfirming = useAssistantAutomaticAction({
    toolCallId,
    ready: result === undefined && settings.data !== undefined && hasCompleteArguments,
    completed: result !== undefined,
    confirm: () => {
      if (!settings.data || !args) return;
      const currentValues = toCurrentValues(settings.data);
      const proposedValues = normalizeFormValues(settings.data, args.changes);
      addResult(getAssistantBoardSettingsResult(settings.data.id, currentValues, proposedValues));
    },
  });

  if (result) {
    const cancelled = "cancelled" in result && result.cancelled;
    const changedCount = cancelled ? 0 : Math.max(0, Object.keys(result).length - 1);
    return (
      <Box className={classes.humanToolCompleted}>
        <ThemeIcon size="sm" radius="xl" variant="light" color="green">
          <IconCheck size={13} />
        </ThemeIcon>
        <Box miw={0}>
          <Text size="xs" c="dimmed">
            {cancelled ? t("cancelled") : t("ready")}
          </Text>
          <Text size="sm" fw={600} truncate>
            {cancelled ? args?.boardName : t("changeCount", { count: changedCount })}
          </Text>
        </Box>
      </Box>
    );
  }

  if (hasFailedAssistantToolArguments(status)) return <AssistantHumanToolError />;

  if (!hasCompleteArguments) {
    return <BoardSettingsSkeleton label={t("loading")} />;
  }

  if (!args?.boardId || !args.boardName) return <AssistantHumanToolError />;

  if (settings.isError) {
    return (
      <Alert color="red" variant="light" title={t("loadErrorTitle")} icon={<IconAlertTriangle size={18} />}>
        <Stack gap="sm">
          <Text size="sm">{t("loadErrorDescription")}</Text>
          <Button variant="light" color="red" size="compact-sm" w="fit-content" onClick={() => settings.refetch()}>
            {actionT("tryAgain")}
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (!settings.data) return <BoardSettingsSkeleton label={t("loading")} />;

  if (autoConfirming) {
    return (
      <Box className={classes.boardSettingsTool}>
        <AssistantAutomaticActionProgress label={t("automaticContinue")} />
      </Box>
    );
  }

  return (
    <BoardSettingsForm
      current={settings.data}
      args={args}
      onSubmit={(changes) => addResult({ id: settings.data.id, ...changes })}
      onCancel={() => addResult({ id: settings.data.id, cancelled: true })}
    />
  );
};

const BoardSettingsSkeleton = ({ label }: { label: string }) => (
  <Box className={classes.boardSettingsTool} aria-label={label}>
    <Stack gap="sm">
      <Skeleton height={20} width="45%" />
      <Skeleton height={14} width="78%" />
      <Skeleton height={38} />
      <Skeleton height={180} />
    </Stack>
  </Box>
);

const BoardSettingsForm = ({
  current,
  args,
  onSubmit,
  onCancel,
}: {
  current: BoardSettings;
  args: ConfigureBoardSettingsArgs;
  onSubmit: (changes: AssistantBoardSettingsChanges) => void;
  onCancel: () => void;
}) => {
  const t = useI18n("assistant.configureBoardSettings");
  const actionT = useI18n("common.action");
  const boardT = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const currentValues = useMemo(() => toCurrentValues(current), [current]);
  const form = useZodForm(completeSettingsSchema, {
    initialValues: normalizeFormValues(current, args.changes),
  });
  const changes = getChangedBoardSettings(currentValues, form.values);
  const changedCount = Object.keys(changes).length;
  const cssWarnings = getCustomCssWarnings(form.values.customCss);
  const proposedKeys = Object.keys(args.changes);
  const defaultTab = getAssistantBoardSettingsDefaultTab(args.changes);
  const optionData = <TValue extends string>(
    values: readonly TValue[],
    key: "backgroundImageAttachment" | "backgroundImageRepeat" | "backgroundImageSize",
  ) =>
    values.map((value) => ({
      value,
      label: boardT(`board.field.${key}.option.${value}.label` as never),
    }));

  return (
    <Box className={classes.boardSettingsTool}>
      <Group className={classes.boardSettingsHeader} align="flex-start" wrap="nowrap" gap="sm">
        <ThemeIcon size="lg" radius="xl" variant="light" color="red">
          <IconSettings size={18} />
        </ThemeIcon>
        <Box flex={1} miw={0}>
          <Group gap="xs" wrap="wrap">
            <Text fw={700}>{t("title")}</Text>
            <Badge variant="light" color="gray" size="sm">
              {args.boardName}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" mt={3}>
            {args.summary}
          </Text>
          {proposedKeys.length > 0 && (
            <Text size="xs" c="dimmed" mt="xs">
              {t("proposedCount", { count: proposedKeys.length })}
            </Text>
          )}
        </Box>
      </Group>

      <form
        onSubmit={form.onSubmit((values) => {
          if (submitting) return;
          const nextChanges = getChangedBoardSettings(currentValues, values);
          setSubmitting(true);
          if (Object.keys(nextChanges).length === 0) {
            onCancel();
            return;
          }
          onSubmit(nextChanges);
        })}
      >
        <Tabs defaultValue={defaultTab} mt="md" className={classes.boardSettingsTabs}>
          <Tabs.List grow>
            <Tabs.Tab value="css" leftSection={<IconFileTypeCss size={15} />}>
              {t("tabs.css")}
            </Tabs.Tab>
            <Tabs.Tab value="appearance" leftSection={<IconPalette size={15} />}>
              {t("tabs.appearance")}
            </Tabs.Tab>
            <Tabs.Tab value="background" leftSection={<IconPhoto size={15} />}>
              {t("tabs.background")}
            </Tabs.Tab>
            <Tabs.Tab value="general" leftSection={<IconSettings size={15} />}>
              {t("tabs.general")}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="css" pt="md">
            <Stack gap="sm">
              <Textarea
                label={boardT("board.field.customCss.label")}
                description={t("cssDescription")}
                autosize
                minRows={10}
                maxRows={20}
                classNames={{ input: classes.boardCssEditor }}
                {...form.getInputProps("customCss")}
              />
              <Group justify="space-between" gap="xs" wrap="wrap">
                <Text size="xs" c={form.values.customCss.length > 15_500 ? "orange" : "dimmed"}>
                  {t("cssCharacters", { count: form.values.customCss.length })}
                </Text>
                <Group gap="xs">
                  <CopyButton value={form.values.customCss}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? t("copied") : t("copyCss")}>
                        <Button
                          variant="subtle"
                          size="compact-sm"
                          leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                          onClick={copy}
                        >
                          {copied ? t("copied") : actionT("copy")}
                        </Button>
                      </Tooltip>
                    )}
                  </CopyButton>
                  <Button
                    variant="subtle"
                    color="gray"
                    size="compact-sm"
                    leftSection={<IconRefresh size={14} />}
                    disabled={form.values.customCss === currentValues.customCss}
                    onClick={() => form.setFieldValue("customCss", currentValues.customCss)}
                  >
                    {t("restoreCss")}
                  </Button>
                </Group>
              </Group>
              {(cssWarnings.importsStylesheet || cssWarnings.loadsRemoteResource) && (
                <Alert
                  variant="light"
                  color="yellow"
                  icon={<IconAlertTriangle size={18} />}
                  title={t("remoteCssTitle")}
                >
                  {t("remoteCssDescription")}
                </Alert>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="appearance" pt="md">
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <ColorInput
                  label={boardT("board.field.primaryColor.label")}
                  format="hex"
                  {...form.getInputProps("primaryColor")}
                />
                <ColorInput
                  label={boardT("board.field.secondaryColor.label")}
                  format="hex"
                  {...form.getInputProps("secondaryColor")}
                />
                <ColorInput
                  label={boardT("board.field.iconColor.label")}
                  format="hex"
                  {...form.getInputProps("iconColor")}
                />
                <Select
                  label={boardT("board.field.itemRadius.label")}
                  data={(["xs", "sm", "md", "lg", "xl"] as const).map((value) => ({
                    value,
                    label: boardT(`board.field.itemRadius.option.${value}`),
                  }))}
                  {...form.getInputProps("itemRadius")}
                />
              </SimpleGrid>
              <InputWrapper label={boardT("board.field.opacity.label")}>
                <Slider min={0} max={100} step={5} label={(value) => `${value}%`} {...form.getInputProps("opacity")} />
              </InputWrapper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="background" pt="md">
            <Stack gap="md">
              <TextInput
                label={boardT("board.field.backgroundImageUrl.label")}
                placeholder={boardT("board.field.backgroundImageUrl.placeholder")}
                {...form.getInputProps("backgroundImageUrl")}
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <Select
                  label={boardT("board.field.backgroundImageSize.label")}
                  data={optionData(backgroundImageSizes.values, "backgroundImageSize")}
                  {...form.getInputProps("backgroundImageSize")}
                />
                <Select
                  label={boardT("board.field.backgroundImageRepeat.label")}
                  data={optionData(backgroundImageRepeats.values, "backgroundImageRepeat")}
                  {...form.getInputProps("backgroundImageRepeat")}
                />
                <Select
                  label={boardT("board.field.backgroundImageAttachment.label")}
                  data={optionData(backgroundImageAttachments.values, "backgroundImageAttachment")}
                  {...form.getInputProps("backgroundImageAttachment")}
                />
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="general" pt="md">
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput label={boardT("board.field.pageTitle.label")} {...form.getInputProps("pageTitle")} />
                <TextInput label={boardT("board.field.metaTitle.label")} {...form.getInputProps("metaTitle")} />
                <TextInput label={boardT("board.field.logoImageUrl.label")} {...form.getInputProps("logoImageUrl")} />
                <TextInput
                  label={boardT("board.field.faviconImageUrl.label")}
                  {...form.getInputProps("faviconImageUrl")}
                />
              </SimpleGrid>
              <Switch
                label={boardT("board.field.disableStatus.label")}
                description={boardT("board.field.disableStatus.description")}
                {...form.getInputProps("disableStatus", { type: "checkbox" })}
              />
            </Stack>
          </Tabs.Panel>
        </Tabs>

        <Group className={classes.boardSettingsActions} justify="space-between" gap="sm" mt="md" wrap="wrap">
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconRefresh size={15} />}
            disabled={changedCount === 0 || submitting}
            onClick={() => form.setValues(currentValues)}
          >
            {t("resetAll")}
          </Button>
          <Group gap="sm" wrap="nowrap" className={classes.boardSettingsSubmitGroup}>
            <Text size="xs" c="dimmed">
              {changedCount === 0 ? t("noChanges") : t("changeCount", { count: changedCount })}
            </Text>
            <Button type="submit" loading={submitting}>
              {changedCount === 0 ? t("keepCurrent") : t("continue")}
            </Button>
          </Group>
        </Group>
      </form>
    </Box>
  );
};
