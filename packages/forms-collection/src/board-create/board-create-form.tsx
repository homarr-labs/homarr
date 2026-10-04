"use client";

import { useRouter } from "next/navigation";
import { Button, Group, InputWrapper, Slider, Stack, Switch, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconAlertTriangle, IconCircleCheck } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";
import { boardColumnCountSchema, boardCreateSchema, boardNameSchema } from "@homarr/validation/board";

interface BoardCreateFormProps {
  onCancel?: () => void;
}

export const BoardCreateForm = ({ onCancel }: BoardCreateFormProps) => {
  const tBoard = useI18n("board");
  const tCommon = useI18n("common");
  const router = useRouter();
  const form = useZodForm(boardCreateSchema, {
    mode: "controlled",
    initialValues: {
      name: "",
      columnCount: 10,
      isPublic: false,
    },
  });
  const { mutate, isPending } = clientApi.board.createBoard.useMutation({
    onSettled: async () => {
      await revalidatePathActionAsync("/manage/boards");
    },
  });

  const boardNameStatus = useBoardNameStatus(form.values.name);

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        // Prevent submit before name availability check
        if (!boardNameStatus.canSubmit) return;
        mutate(values, {
          onSuccess: (result) => {
            showSuccessNotification({
              title: tBoard("action.create.notification.success.title"),
              message: tBoard("action.create.notification.success.message", { name: values.name }),
            });
            const name = encodeURIComponent(result.name);
            router.push(`/boards/${name}`);
          },
          onError() {
            showErrorNotification({
              title: tBoard("action.create.notification.error.title"),
              message: tBoard("action.create.notification.error.message", { name: values.name }),
            });
          },
        });
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
          {...form.getInputProps("isPublic")}
        />

        <Group justify="end" wrap="wrap">
          {onCancel && (
            <Button variant="default" onClick={onCancel}>
              {tCommon("action.cancel")}
            </Button>
          )}
          <Button type="submit" loading={isPending} disabled={!boardNameStatus.canSubmit}>
            {tCommon("action.create")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

export const useBoardNameStatus = (name: string) => {
  const tBoard = useI18n("board");
  const tCommon = useI18n("common");
  const [debouncedName] = useDebouncedValue(name, 250);
  const isValidName = boardNameSchema.safeParse(name).success;
  const isDebouncing = name !== debouncedName;
  const { data: boardExists, isLoading } = clientApi.board.exists.useQuery(debouncedName, {
    enabled: boardNameSchema.safeParse(debouncedName).success,
  });
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
    canSubmit: isValidName && !isDebouncing && boardExists === false && !isLoading,
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
