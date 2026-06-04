import { useState } from "react";
import { Button, FileInput, Group, Stack, TextInput } from "@mantine/core";
import { IconFileUpload } from "@tabler/icons-react";
import { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import { homarrBundleSchema } from "@homarr/board-portability/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { boardNameSchema } from "@homarr/validation/board";

import { useBoardNameStatus } from "./add-board-modal";

export const ImportBundleModal = createModal(({ actions }) => {
  const t = useScopedI18n("board.action.importBundle" as never) as unknown as (key: string) => string;
  const tCommon = useScopedI18n("common");
  const [fileValid, setFileValid] = useState(true);
  const form = useZodForm(
    z.object({
      file: z.file(),
      name: boardNameSchema,
    }),
    {
      mode: "controlled",
      initialValues: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        file: null!,
        name: "",
      },
      onValuesChange(values, previous) {
        void (async () => {
          if (values.file === previous.file) {
            return;
          }

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (!values.file) {
            return;
          }

          const content = await values.file.text();
          const result = homarrBundleSchema.safeParse(JSON.parse(content));

          if (!result.success) {
            setFileValid(false);
            return;
          }

          setFileValid(true);
          const boardName = result.data.boards[0]?.name.replaceAll(" ", "-") ?? "";
          form.setFieldValue("name", boardName);
        })();
      },
    },
  );

  const { mutateAsync, isPending } = clientApi.board.importBundle.useMutation({
    async onSuccess() {
      await revalidatePathActionAsync("/manage/boards");
    },
  });
  const boardNameStatus = useBoardNameStatus(form.values.name);

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        if (!fileValid || !boardNameStatus.canSubmit) {
          return;
        }

        void (async () => {
          const content = await values.file.text();
          await mutateAsync(
            { content, name: values.name },
            {
              onSuccess() {
                actions.closeModal();
                showSuccessNotification({
                  title: t("notification.success.title"),
                  message: t("notification.success.message"),
                });
              },
              onError() {
                showErrorNotification({
                  title: t("notification.error.title"),
                  message: t("notification.error.message"),
                });
              },
            },
          );
        })();
      })}
    >
      <Stack>
        <FileInput
          rightSection={<IconFileUpload />}
          withAsterisk
          accept="application/json"
          {...form.getInputProps("file")}
          error={
            (form.getInputProps("file").error as string | undefined) ??
            (!fileValid && form.isDirty("file") ? t("form.file.invalidError") : undefined)
          }
          type="button"
          label={t("form.file.label")}
        />

        <TextInput
          withAsterisk
          label={t("form.name.label")}
          description={
            boardNameStatus.description ? (
              <Group c={boardNameStatus.description.color} gap="xs" align="center">
                {boardNameStatus.description.icon ? <boardNameStatus.description.icon size={16} /> : null}
                <span>{boardNameStatus.description.label}</span>
              </Group>
            ) : null
          }
          {...form.getInputProps("name")}
        />

        <Group justify="end">
          <Button variant="subtle" color="gray" onClick={actions.closeModal}>
            {tCommon("action.cancel")}
          </Button>
          <Button type="submit" loading={isPending}>
            {tCommon("action.import")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle: (t) => (t as (key: string) => string)("board.action.importBundle.label"),
  size: "lg",
});
