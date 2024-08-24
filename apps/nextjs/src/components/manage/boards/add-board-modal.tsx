import { Button, Group, InputWrapper, Slider, Stack, Switch, TextInput } from "@mantine/core";

import { useZodForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { validation } from "@homarr/validation";
import { createCustomErrorParams } from "@homarr/validation/form";

interface InnerProps {
  boardNames: string[];
  onSuccess: (props: { name: string; columnCount: number; isPublic: boolean }) => Promise<void>;
}

export const AddBoardModal = createModal<InnerProps>(({ actions, innerProps }) => {
  const t = useI18n();
  const form = useZodForm(
    validation.board.create.refine((value) => !innerProps.boardNames.includes(value.name), {
      params: createCustomErrorParams("boardAlreadyExists"),
      path: ["name"],
    }),
    {
      initialValues: {
        name: "",
        columnCount: 10,
        isPublic: false,
      },
    },
  );

  const columnCountChecks = validation.board.create.shape.columnCount._def.checks;
  const minColumnCount = columnCountChecks.find((check) => check.kind === "min")?.value;
  const maxColumnCount = columnCountChecks.find((check) => check.kind === "max")?.value;

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        void innerProps.onSuccess(values);
        actions.closeModal();
      })}
    >
      <Stack>
        <TextInput label={t("board.field.name.label")} data-autofocus {...form.getInputProps("name")} />
        <InputWrapper label={t("board.field.columnCount.label")} {...form.getInputProps("columnCount")}>
          <Slider min={minColumnCount} max={maxColumnCount} step={1} {...form.getInputProps("columnCount")} />
        </InputWrapper>

        <Switch
          label={t("board.field.isPublic.label")}
          description={t("board.field.isPublic.description")}
          {...form.getInputProps("isPublic")}
        />

        <Group justify="right">
          <Button onClick={actions.closeModal} variant="subtle" color="gray">
            {t("common.action.cancel")}
          </Button>
          <Button type="submit" color="teal">
            {t("common.action.create")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle: (t) => t("management.page.board.action.new.label"),
});
