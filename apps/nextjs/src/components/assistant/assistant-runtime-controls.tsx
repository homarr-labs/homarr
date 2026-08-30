"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Combobox,
  Divider,
  Group,
  Loader,
  Popover,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
  useCombobox,
} from "@mantine/core";
import {
  IconBattery1,
  IconBattery3,
  IconBatteryFilled,
  IconBatteryOff,
  IconCheck,
  IconPhoto,
} from "@tabler/icons-react";

import { useTimeAgo } from "@homarr/common";
import { assistantReasoningModes } from "@homarr/definitions";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import classes from "./assistant-panel.module.css";
import type { AssistantConversationControls } from "./assistant-conversation-controls";
import { useAssistantPreferences } from "./assistant-context";
import type { AssistantPendingAction } from "./assistant-pending-action";
import type { AssistantReasoningMode, AssistantRuntimeModelOption } from "./assistant-preferences";
import { getAssistantProviderQuotaLevel } from "./assistant-provider-quota";

type ComposerProps = AssistantConversationControls & { pendingAction: AssistantPendingAction | undefined };

const getModelProviderLabel = (modelId: string, fallback: string) => {
  const separator = modelId.indexOf("/");
  if (separator <= 0) return fallback;
  const provider = modelId
    .slice(0, separator)
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replaceAll(/[-_]/gu, " ");
  if (!provider) return fallback;
  return `${provider.charAt(0).toLocaleUpperCase()}${provider.slice(1)}`;
};

const formatCompactModelNumber = (value: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);

export const RuntimeControls = ({
  modelId,
  models,
  modelOptionsLoading,
  reasoning,
  onModelChange,
  onReasoningChange,
}: ComposerProps) => {
  const t = useI18n("assistant");
  const [modelSearch, setModelSearch] = useState("");
  const selectedModel = models.find((model) => model.id === modelId);
  const normalizedModelSearch = modelSearch.trim().toLocaleLowerCase();
  const visibleModels =
    normalizedModelSearch.length === 0
      ? models
      : models.filter(
          (model) =>
            model.name.toLocaleLowerCase().includes(normalizedModelSearch) ||
            model.id.toLocaleLowerCase().includes(normalizedModelSearch),
        );
  const groupedModels = visibleModels.reduce((groups, model) => {
    const provider = getModelProviderLabel(model.id, t("runtime.otherModels"));
    const providerModels = groups.get(provider);
    if (providerModels) providerModels.push(model);
    else groups.set(provider, [model]);
    return groups;
  }, new Map<string, AssistantRuntimeModelOption[]>());
  const modelCombobox = useCombobox({
    onDropdownOpen: () => {
      modelCombobox.selectActiveOption();
      requestAnimationFrame(() => modelCombobox.focusSearchInput());
    },
    onDropdownClose: () => {
      modelCombobox.resetSelectedOption();
      setModelSearch("");
    },
  });

  const selectModel = (value: string) => {
    if (!models.some((model) => model.id === value)) return;
    onModelChange(value);
    modelCombobox.closeDropdown();
  };

  return (
    <Combobox store={modelCombobox} onOptionSubmit={selectModel} withinPortal position="top-start" width={340}>
      <Combobox.Target>
        <UnstyledButton
          className={classes.runtimeSelectorTrigger}
          type="button"
          disabled={modelOptionsLoading || models.length === 0}
          onClick={() => modelCombobox.toggleDropdown()}
          aria-label={`${t("runtime.model")}: ${selectedModel?.name ?? t("runtime.noModels")}. ${t("runtime.thinking")}: ${t(`runtime.reasoning.${reasoning}`)}`}
          aria-expanded={modelCombobox.dropdownOpened}
        >
          <Group gap="xs" wrap="nowrap">
            {modelOptionsLoading && <Loader size={12} />}
            <Text className={classes.runtimeSelectorName} size="xs" fw={650} lineClamp={1}>
              {selectedModel?.name ?? t("runtime.model")}
            </Text>
            <Badge className={classes.runtimeSelectorEffort} size="xs" variant="light" color="gray">
              {t(`runtime.reasoning.${reasoning}`)}
            </Badge>
            <Combobox.Chevron size="xs" />
          </Group>
        </UnstyledButton>
      </Combobox.Target>
      <Combobox.Dropdown className={classes.modelDropdown}>
        <Combobox.Search
          value={modelSearch}
          onChange={(event) => {
            setModelSearch(event.currentTarget.value);
            modelCombobox.updateSelectedOptionIndex();
          }}
          placeholder={t("runtime.searchModels")}
          aria-label={t("runtime.searchModels")}
          size="xs"
        />
        <Combobox.Options className={classes.modelOptions}>
          {[...groupedModels.entries()].map(([provider, providerModels]) => (
            <Combobox.Group key={provider} label={provider}>
              {providerModels.map((model) => (
                <Combobox.Option
                  className={classes.modelOption}
                  key={model.id}
                  value={model.id}
                  active={model.id === modelId}
                >
                  <Group gap="xs" wrap="nowrap">
                    <Divider
                      className={classes.modelOptionDivider}
                      orientation="vertical"
                      data-active={model.id === modelId || undefined}
                    />
                    <Stack gap={1} className={classes.modelOptionText}>
                      <Text size="sm" fw={model.id === modelId ? 650 : 500} lineClamp={1}>
                        {model.name}
                      </Text>
                      <Text size="xs" className={classes.modelOptionDescription} lineClamp={1}>
                        {model.description?.trim() || model.id}
                      </Text>
                    </Stack>
                    <Group className={classes.modelOptionMeta} gap={4} wrap="nowrap">
                      {model.inputModalities.includes("image") && (
                        <Tooltip label={t("runtime.imageInput")}>
                          <IconPhoto size={14} aria-label={t("runtime.imageInput")} />
                        </Tooltip>
                      )}
                      {model.contextLength && (
                        <Badge size="xs" variant="light" color="gray">
                          {formatCompactModelNumber(model.contextLength)}
                        </Badge>
                      )}
                      {model.id === modelId && <IconCheck size={15} className={classes.runtimeOptionCheck} />}
                    </Group>
                  </Group>
                </Combobox.Option>
              ))}
            </Combobox.Group>
          ))}
          {visibleModels.length === 0 && <Combobox.Empty>{t("runtime.noModels")}</Combobox.Empty>}
        </Combobox.Options>
        <Divider />
        <Box className={classes.reasoningSelector}>
          <Text size="xs" fw={650} mb={5}>
            {t("runtime.thinking")}
          </Text>
          <SegmentedControl
            className={classes.reasoningSegmentedControl}
            value={reasoning}
            onChange={(value) => {
              if (assistantReasoningModes.includes(value as AssistantReasoningMode)) {
                onReasoningChange(value as AssistantReasoningMode);
              }
            }}
            size="xs"
            fullWidth
            data={assistantReasoningModes.map((mode) => ({
              value: mode,
              label: t(`runtime.reasoning.${mode}`),
            }))}
          />
        </Box>
      </Combobox.Dropdown>
    </Combobox>
  );
};

const providerQuotaIcons = {
  ok: IconBatteryFilled,
  warning: IconBattery3,
  bad: IconBattery1,
  dead: IconBatteryOff,
};

const providerQuotaColors = {
  ok: "green",
  warning: "yellow",
  bad: "orange",
  dead: "red",
} as const;

export const HomarrProviderQuota = () => {
  const t = useI18n("assistant");
  const locale = useCurrentIntlLocale();
  const preferences = useAssistantPreferences();
  const quota = preferences.quota;
  const resetAt = useMemo(() => new Date(quota?.resetsAt ?? Date.now()), [quota?.resetsAt]);
  const resetRelative = useTimeAgo(resetAt, 30_000);
  if (preferences.provider !== "homarr") return null;

  const level = preferences.quota ? getAssistantProviderQuotaLevel(preferences.quota) : "dead";
  const Icon = providerQuotaIcons[level];
  const color = providerQuotaColors[level];
  const percentage = preferences.quota
    ? Math.min(100, Math.max(0, (preferences.quota.remaining / Math.max(preferences.quota.limit, 1)) * 100))
    : 0;
  let label = t("providerQuota.signInRequired");
  if (preferences.providerUser && !quota) label = t("providerQuota.loading");
  if (preferences.providerUser && quota) {
    label = t("providerQuota.remainingLabel", {
      remaining: quota.remaining,
      limit: quota.limit,
    });
  }
  const resetTime = quota ? (
    <time dateTime={quota.resetsAt} title={new Date(quota.resetsAt).toLocaleString(locale)}>
      {new Date(quota.resetsAt).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      })}
    </time>
  ) : null;
  let quotaContent: ReactNode;
  if (!preferences.providerUser) {
    quotaContent = (
      <>
        <Text size="sm" c="dimmed">
          {t("providerQuota.signInDescription")}
        </Text>
        <Button
          size="compact-sm"
          loading={preferences.quotaLoading}
          onClick={() => void preferences.signInToProvider().catch(() => undefined)}
        >
          {t("providerQuota.signIn")}
        </Button>
      </>
    );
  } else if (quota) {
    quotaContent = (
      <>
        <Box>
          <Group justify="space-between" gap="xs" mb={5}>
            <Text size="xs" c="dimmed">
              {t("providerQuota.dailyAllowance")}
            </Text>
            <Text size="xs" fw={650}>
              {quota.remaining} / {quota.limit}
            </Text>
          </Group>
          <Progress value={percentage} color={color} size="sm" aria-label={label} />
        </Box>
        <Text size="xs" c="dimmed">
          {t.rich("providerQuota.reset", {
            relative: resetRelative,
            time: () => resetTime,
          })}
        </Text>
        <Text size="xs" c="dimmed">
          {t("providerQuota.toolCalls")}
        </Text>
      </>
    );
  } else {
    quotaContent = (
      <Button
        variant="light"
        size="compact-sm"
        loading={preferences.quotaLoading}
        onClick={() => void preferences.refreshQuota()}
      >
        {t("providerQuota.retry")}
      </Button>
    );
  }

  return (
    <Popover position="top" width={290} shadow="md" withinPortal>
      <Popover.Target>
        <UnstyledButton className={classes.providerQuotaTrigger} data-level={level} type="button" aria-label={label}>
          {preferences.quotaLoading && !preferences.quota ? <Loader size={14} /> : <Icon size={16} aria-hidden />}
          <Text component="span" size="xs" fw={650}>
            {preferences.quota?.remaining ?? "–"}
          </Text>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Group justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <ThemeIcon color={color} variant="light" size="sm" radius="xl">
                <Icon size={15} aria-hidden />
              </ThemeIcon>
              <Box>
                <Text size="sm" fw={700}>
                  {t("providerQuota.title")}
                </Text>
                <Text size="xs" c="dimmed">
                  {preferences.providerUser?.name || t("providerQuota.communityWorkshop")}
                </Text>
              </Box>
            </Group>
            {preferences.quota && (
              <Badge color={color} variant="light" size="sm">
                {t(`providerQuota.level.${level}`)}
              </Badge>
            )}
          </Group>

          {quotaContent}
          {preferences.quotaError && (
            <Text size="xs" c="red">
              {preferences.quotaError}
            </Text>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
