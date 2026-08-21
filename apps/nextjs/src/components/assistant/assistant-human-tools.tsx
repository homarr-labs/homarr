"use client";

import { useEffect, useRef, useState } from "react";
import type { ToolCallMessagePartProps, ToolCallMessagePartStatus } from "@assistant-ui/react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Skeleton,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconMessageQuestion,
  IconPencil,
  IconX,
} from "@tabler/icons-react";
import type { z } from "zod/v4";

import { AppForm } from "@homarr/forms-collection";
import { useI18n } from "@homarr/translation/client";
import type { appManageSchema } from "@homarr/validation/app";

import { getAssistantAskUserOptionKind } from "./assistant-ask-user";
import { useAssistantAutomaticAction } from "./assistant-auto-approval";
import { AssistantAutomaticActionProgress } from "./assistant-automatic-action-progress";
import classes from "./assistant-panel.module.css";
import { AssistantPendingQuestionPortal } from "./assistant-question-portal";
import { hasCompleteAssistantToolArguments, hasFailedAssistantToolArguments } from "./assistant-human-tool-status";
import { normalizeAssistantAppIconUrl } from "./assistant-tool-contracts";
import type { AskUserArgs, AskUserResult, ConfigureAppArgs } from "./assistant-tool-contracts";

type AppValues = z.infer<typeof appManageSchema>;

export const toAssistantAppValues = (args: ConfigureAppArgs | undefined): AppValues => ({
  name: args?.name ?? "",
  description: args?.description ?? "",
  iconUrl: normalizeAssistantAppIconUrl(args?.iconUrl),
  href: args?.href ?? "",
  pingUrl: args?.pingUrl ?? "",
});

export const getAssistantAppFormValues = (
  args: ConfigureAppArgs | undefined,
  status: ToolCallMessagePartStatus | undefined,
) => (hasCompleteAssistantToolArguments(status) ? toAssistantAppValues(args) : null);

export const AssistantHumanToolError = () => {
  const t = useI18n("assistant.toolPreparationError");
  return (
    <Alert color="red" variant="light" title={t("title")} icon={<IconAlertTriangle size={18} />}>
      {t("description")}
    </Alert>
  );
};

export const AssistantAskUserTool = ({
  args,
  result,
  addResult,
  status,
}: ToolCallMessagePartProps<AskUserArgs, AskUserResult>) => {
  const t = useI18n("assistant.askUser");
  const [showOther, setShowOther] = useState(false);
  const [other, setOther] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const otherInputRef = useRef<HTMLInputElement>(null);
  const options = Array.isArray(args?.options) ? args.options : [];

  useEffect(() => {
    if (showOther) otherInputRef.current?.focus();
  }, [showOther]);

  if (result) {
    return (
      <Box className={classes.humanToolCompleted}>
        <ThemeIcon size="sm" radius="xl" variant="light" color="green">
          <IconCheck size={13} />
        </ThemeIcon>
        <Box>
          <Text size="xs" c="dimmed">
            {t("answered")}
          </Text>
          <Text size="sm" fw={600}>
            {result.answer}
          </Text>
        </Box>
      </Box>
    );
  }

  if (hasFailedAssistantToolArguments(status)) return <AssistantHumanToolError />;

  if (!hasCompleteAssistantToolArguments(status)) {
    return (
      <AssistantPendingQuestionPortal>
        <Box className={classes.humanTool} aria-label={t("preparing")}>
          <Stack gap="xs">
            <Skeleton height={18} width="62%" />
            <Skeleton height={52} />
            <Skeleton height={52} />
          </Stack>
        </Box>
      </AssistantPendingQuestionPortal>
    );
  }

  if (!args?.question || options.length < 2) {
    return (
      <AssistantPendingQuestionPortal>
        <AssistantHumanToolError />
      </AssistantPendingQuestionPortal>
    );
  }

  const submitResult = (answer: AskUserResult) => {
    if (submitting) return;
    setSubmitting(true);
    addResult(answer);
  };

  const submitOther = () => {
    const answer = other.trim();
    if (!answer) return;
    submitResult({ answer, optionKind: "alternative", source: "other" });
  };

  return (
    <AssistantPendingQuestionPortal>
      <Box className={classes.humanTool}>
        <Group align="flex-start" wrap="nowrap" gap="sm">
          <ThemeIcon size="lg" radius="xl" variant="light" color="red">
            <IconMessageQuestion size={18} />
          </ThemeIcon>
          <Box flex={1} miw={0}>
            <Text fw={700} className={classes.humanToolQuestion}>
              {args.question}
            </Text>
            {args.description && (
              <Text size="sm" c="dimmed" mt={3}>
                {args.description}
              </Text>
            )}
          </Box>
        </Group>

        <Stack gap="xs" mt="md">
          {options.map((option, index) => {
            const kind = getAssistantAskUserOptionKind(option);
            const icon =
              kind === "affirmative" ? (
                <IconCheck size={17} />
              ) : kind === "negative" ? (
                <IconX size={17} />
              ) : (
                <IconArrowRight size={17} />
              );
            const color = kind === "affirmative" ? "green" : kind === "negative" ? "red" : "gray";

            return (
              <UnstyledButton
                key={`${option.id}:${index}`}
                className={classes.humanToolOption}
                data-kind={kind}
                disabled={submitting}
                onClick={() =>
                  submitResult({ answer: option.label, optionId: option.id, optionKind: kind, source: "option" })
                }
              >
                <ThemeIcon className={classes.humanToolOptionIcon} variant="light" color={color} size="sm">
                  {icon}
                </ThemeIcon>
                <Box className={classes.humanToolOptionText} ta="start">
                  <Text component="span" size="sm" fw={650} className={classes.humanToolOptionLabel}>
                    {option.label}
                  </Text>
                  {option.description && (
                    <Text
                      component="span"
                      display="block"
                      size="xs"
                      c="dimmed"
                      fw={400}
                      className={classes.humanToolOptionDescription}
                    >
                      {option.description}
                    </Text>
                  )}
                </Box>
                <Badge
                  className={classes.humanToolOptionBadge}
                  classNames={{ label: classes.humanToolOptionBadgeLabel }}
                  variant="light"
                  color={color}
                  size="xs"
                >
                  {t(`optionKind.${kind}`)}
                </Badge>
              </UnstyledButton>
            );
          })}

          {args.allowOther !== false &&
            (showOther ? (
              <Group align="flex-end" gap="xs" wrap="nowrap">
                <TextInput
                  ref={otherInputRef}
                  className={classes.humanToolOtherInput}
                  value={other}
                  onChange={(event) => setOther(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      submitOther();
                    }
                  }}
                  label={t("otherLabel")}
                  placeholder={t("otherPlaceholder")}
                />
                <Button size="md" onClick={submitOther} disabled={!other.trim() || submitting} loading={submitting}>
                  {t("submit")}
                </Button>
                <Button
                  size="md"
                  variant="default"
                  px="sm"
                  aria-label={t("cancelOther")}
                  onClick={() => {
                    setShowOther(false);
                    setOther("");
                  }}
                >
                  <IconX size={17} />
                </Button>
              </Group>
            ) : (
              <Button
                className={classes.humanToolOption}
                variant="default"
                size="md"
                fullWidth
                leftSection={<IconPencil size={17} />}
                rightSection={
                  <Badge variant="light" color="gray" size="xs">
                    {t("optionKind.custom")}
                  </Badge>
                }
                justify="flex-start"
                onClick={() => setShowOther(true)}
              >
                {t("other")}
              </Button>
            ))}
        </Stack>
      </Box>
    </AssistantPendingQuestionPortal>
  );
};

export const AssistantConfigureAppTool = ({
  args,
  result,
  addResult,
  status,
  toolCallId,
}: ToolCallMessagePartProps<ConfigureAppArgs, AppValues>) => {
  const t = useI18n("assistant.configureApp");
  const [submitting, setSubmitting] = useState(false);
  const initialValues = getAssistantAppFormValues(args, status);
  const autoConfirming = useAssistantAutomaticAction({
    toolCallId,
    ready: result === undefined && initialValues !== null,
    completed: result !== undefined,
    confirm: () => {
      if (!initialValues) return;
      addResult(initialValues);
    },
  });

  if (result) {
    return (
      <Box className={classes.humanToolCompleted}>
        <ThemeIcon size="sm" radius="xl" variant="light" color="green">
          <IconCheck size={13} />
        </ThemeIcon>
        <Box miw={0}>
          <Text size="xs" c="dimmed">
            {t("ready")}
          </Text>
          <Text size="sm" fw={600} truncate>
            {result.name}
          </Text>
        </Box>
      </Box>
    );
  }

  if (hasFailedAssistantToolArguments(status)) return <AssistantHumanToolError />;

  if (initialValues === null) {
    return (
      <Box className={classes.appTool} aria-label={t("preparing")}>
        <Stack gap="sm">
          <Skeleton height={18} width="42%" />
          <Skeleton height={36} />
          <Skeleton height={36} />
          <Skeleton height={72} />
          <Skeleton height={36} />
        </Stack>
      </Box>
    );
  }

  if (autoConfirming) {
    return (
      <Box className={classes.appTool}>
        <AssistantAutomaticActionProgress label={t("automaticContinue")} />
      </Box>
    );
  }

  return (
    <Box className={classes.appTool}>
      <Stack gap={2} mb="md">
        <Text fw={700}>{t("title")}</Text>
        <Text size="sm" c="dimmed">
          {t("description")}
        </Text>
      </Stack>
      <AppForm
        key={toolCallId}
        initialValues={initialValues}
        buttonLabels={{ submit: t("continue") }}
        showBackToOverview={false}
        handleSubmit={(values) => {
          if (submitting) return;
          setSubmitting(true);
          addResult(values);
        }}
        isPending={submitting}
      />
    </Box>
  );
};
