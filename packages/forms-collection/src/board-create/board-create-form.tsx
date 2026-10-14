"use client";

import { useEffect, useRef, useState } from "react";
import type { z } from "zod/v4";
import { Button, Group, InputWrapper, Slider, Stack, Switch, Text, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconAlertTriangle, IconCircleCheck } from "@tabler/icons-react";

import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";
import { boardColumnCountSchema, boardCreateSchema, boardNameSchema } from "@homarr/validation/board";

export interface BoardExistsQuery {
  name: string;
  data?: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isPlaceholderData: boolean;
  isFetchedAfterMount: boolean;
}

export type UseBoardExists = (name: string, options: { enabled: boolean }) => BoardExistsQuery;
export type BoardCreateValues = z.infer<typeof boardCreateSchema>;

export type BoardCreateOutcome =
  | { kind: "idle" }
  | { kind: "unknown"; error: unknown }
  | { kind: "confirmed"; board: { id: string; name: string } }
  | { kind: "reconcileheld"; board: { id: string; name: string }; error: unknown }
  | { kind: "settled"; board: { id: string; name: string } };

export interface BoardCreateFormProps {
  onCancel?: () => void;
  useBoardExists: UseBoardExists;
  createBoard?: (values: BoardCreateValues) => Promise<{ id: string; name: string }>;
  onCreated: (board: { id: string; name: string }) => Promise<void>;
  navigate: (href: string) => Promise<void>;
  onSettled: () => Promise<void>;
  isPending: boolean;
  isCurrentOwner: () => boolean;
  outcomeLabels: { unknown: string; reconcileheld: string };
}

export const BoardCreateForm = ({
  onCancel,
  useBoardExists,
  createBoard,
  onCreated,
  navigate,
  onSettled,
  isPending,
  isCurrentOwner,
  outcomeLabels,
}: BoardCreateFormProps) => {
  const tBoard = useI18n("board");
  const tCommon = useI18n("common");
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const owner = useRef({ active: false });
  const outcomeRef = useRef<BoardCreateOutcome>({ kind: "idle" });
  const [outcome, setOutcome] = useState<BoardCreateOutcome>(outcomeRef.current);
  const retryReconciliation = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    const lease = { active: true };
    owner.current = lease;
    return () => {
      lease.active = false;
    };
  }, []);
  const form = useZodForm(boardCreateSchema, {
    mode: "controlled",
    initialValues: {
      name: "",
      columnCount: 10,
      isPublic: false,
    },
  });
  const boardNameStatus = useBoardNameStatus(form.values.name, useBoardExists);

  const publishOutcome = (next: BoardCreateOutcome) => {
    outcomeRef.current = next;
    if (owner.current.active) setOutcome(next);
  };

  const handleSubmit = async (values: BoardCreateValues) => {
    const lease = owner.current;
    const isCurrent = () => lease.active && isCurrentOwner();
    if (
      !createBoard ||
      !isCurrent() ||
      outcomeRef.current.kind !== "idle" ||
      !boardNameStatus.canSubmit ||
      isPending ||
      submitting.current
    )
      return;
    submitting.current = true;
    setIsSubmitting(true);
    let result: { id: string; name: string };
    try {
      result = await createBoard(values);
    } catch (error) {
      publishOutcome({ kind: "unknown", error });
      try {
        await onSettled();
      } finally {
        submitting.current = false;
        if (lease.active) setIsSubmitting(false);
        if (isCurrent()) showErrorNotification({ message: outcomeLabels.unknown });
      }
      return;
    }
    publishOutcome({ kind: "confirmed", board: result });
    let reconciled = false;
    let settled = false;
    let navigated = false;
    const reconcile = async () => {
      try {
        try {
          if (!reconciled) {
            await onCreated(result);
            reconciled = true;
          }
        } finally {
          if (!settled) {
            await onSettled();
            settled = true;
          }
        }
        if (isCurrent() && !navigated) {
          await navigate(`/boards/${encodeURIComponent(result.name)}`);
          navigated = true;
        }
      } catch (error) {
        publishOutcome({ kind: "reconcileheld", board: result, error });
        if (isCurrent()) showErrorNotification({ message: outcomeLabels.reconcileheld });
        throw error;
      } finally {
        submitting.current = false;
        if (lease.active) setIsSubmitting(false);
      }
      publishOutcome({ kind: "settled", board: result });
      retryReconciliation.current = null;
      if (!isCurrent()) return;
      showSuccessNotification({
        title: tBoard("action.create.notification.success.title"),
        message: tBoard("action.create.notification.success.message", { name: values.name }),
      });
    };
    retryReconciliation.current = async () => {
      if (!isCurrent() || submitting.current || outcomeRef.current.kind !== "reconcileheld") return;
      submitting.current = true;
      setIsSubmitting(true);
      await reconcile();
    };
    await reconcile();
  };

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        void handleSubmit(values).catch(() => {});
      })}
    >
      <Stack maw={720}>
        <TextInput
          label={tCommon("field.name")}
          withAsterisk
          autoFocus
          {...form.getInputProps("name")}
          description={<BoardNameAvailability status={boardNameStatus} />}
        />
        <InputWrapper label={tBoard("field.columnCount.label")} {...form.getInputProps("columnCount")}>
          <Slider
            aria-label={tBoard("field.columnCount.label")}
            min={boardColumnCountSchema.minValue ?? undefined}
            max={boardColumnCountSchema.maxValue ?? undefined}
            step={1}
            {...form.getInputProps("columnCount")}
          />
        </InputWrapper>

        <Switch
          label={tBoard("field.isPublic.label")}
          description={tBoard("field.isPublic.description")}
          {...form.getInputProps("isPublic", { type: "checkbox" })}
        />

        <Group justify="end" wrap="wrap">
          {onCancel && (
            <Button
              variant="default"
              onClick={() => {
                owner.current.active = false;
                onCancel();
              }}
            >
              {tCommon("action.cancel")}
            </Button>
          )}
          <Button
            type="submit"
            loading={isPending || isSubmitting}
            disabled={!createBoard || outcome.kind !== "idle" || !boardNameStatus.canSubmit}
          >
            {tCommon("action.create")}
          </Button>
        </Group>
        {(outcome.kind === "unknown" || outcome.kind === "reconcileheld") && (
          <Text component="output" aria-live="polite">
            {outcomeLabels[outcome.kind]}
          </Text>
        )}
        {outcome.kind === "reconcileheld" && (
          <Button
            variant="default"
            loading={isSubmitting}
            onClick={() => {
              void retryReconciliation.current?.().catch(() => {});
            }}
          >
            {tCommon("action.tryAgain")}
          </Button>
        )}
      </Stack>
    </form>
  );
};

export const useBoardNameStatus = (name: string, useBoardExists: UseBoardExists) => {
  const tBoard = useI18n("board");
  const tCommon = useI18n("common");
  const [debouncedName] = useDebouncedValue(name, 250);
  const isValidName = boardNameSchema.safeParse(name).success;
  const isDebouncing = name !== debouncedName;
  const query = useBoardExists(debouncedName, {
    enabled: boardNameSchema.safeParse(debouncedName).success,
  });
  const isCurrent = query.name === name && !query.isPlaceholderData && query.isFetchedAfterMount;
  const boardExists = isCurrent && !query.isError ? query.data : undefined;
  const isLoading = query.isLoading || query.isFetching;
  let description: { label: string; icon?: TablerIcon; color?: string } | undefined;

  if (debouncedName.trim() !== "") {
    if (isDebouncing || isLoading) {
      description = {
        label: tBoard("action.create.availability.checking"),
      };
    } else if (boardExists !== undefined) {
      if (boardExists) {
        description = {
          icon: IconAlertTriangle,
          label: tCommon("zod.errors.custom.boardAlreadyExists"),
          color: "red",
        };
      } else {
        description = {
          icon: IconCircleCheck,
          label: tBoard("action.create.availability.available", { name: debouncedName }),
          color: "green",
        };
      }
    }
  }

  return {
    canSubmit: isValidName && !isDebouncing && isCurrent && boardExists === false && !isLoading,
    description,
  };
};

export type BoardNameStatus = ReturnType<typeof useBoardNameStatus>;

export const BoardNameAvailability = ({ status }: { status: BoardNameStatus }) => {
  if (!status.description) return null;

  const Icon = status.description.icon;

  return (
    <Group component="output" c={status.description.color} gap="xs" align="center" aria-live="polite">
      {Icon && <Icon size={16} />}
      <span>{status.description.label}</span>
    </Group>
  );
};
