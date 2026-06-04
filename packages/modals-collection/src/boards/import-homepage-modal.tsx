import { useState } from "react";
import { Button, Code, FileInput, Group, Stack, Switch, Text, TextInput } from "@mantine/core";
import { IconFileUpload } from "@tabler/icons-react";
import { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import {
  extractHomepageEnvVariables,
  parseServicesYaml,
  replaceHomepageEnvVariables,
} from "@homarr/board-portability/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { boardNameSchema } from "@homarr/validation/board";

import { useBoardNameStatus } from "./add-board-modal";

export const ImportHomepageModal = createModal(({ actions }) => {
  const t = useScopedI18n("board.action.importHomepage" as never) as unknown as (key: string) => string;
  const tCommon = useScopedI18n("common");
  const [fileValid, setFileValid] = useState(true);
  const [rawContent, setRawContent] = useState("");
  const [envVars, setEnvVars] = useState<string[]>([]);
  const [envValues, setEnvValues] = useState<Record<string, string>>({});

  const form = useZodForm(
    z.object({
      file: z.file(),
      boardName: boardNameSchema,
      createIntegrations: z.boolean(),
    }),
    {
      mode: "controlled",
      initialValues: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        file: null!,
        boardName: "",
        createIntegrations: true,
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
          setRawContent(content);

          const vars = extractHomepageEnvVariables(content);
          setEnvVars(vars);
          setEnvValues(Object.fromEntries(vars.map((v) => [v, ""])));

          const result = parseServicesYaml(content);

          if (!result.success) {
            setFileValid(false);
            return;
          }

          setFileValid(true);
          const suggestedName =
            result.services[0]?.group.replaceAll(/[^A-Za-z0-9-_]/g, "-").replaceAll(/-+/g, "-") ?? "homepage";
          if (form.values.boardName.trim().length === 0) {
            form.setFieldValue("boardName", suggestedName.slice(0, 255));
          }
        })();
      },
    },
  );

  const { mutateAsync, isPending } = clientApi.board.importHomepageServices.useMutation({
    async onSuccess() {
      await revalidatePathActionAsync("/manage/boards");
    },
  });
  const boardNameStatus = useBoardNameStatus(form.values.boardName);

  const allEnvVarsFilled = envVars.length === 0 || envVars.every((v) => (envValues[v] ?? "").trim().length > 0);

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        if (!fileValid || !boardNameStatus.canSubmit || !allEnvVarsFilled) {
          return;
        }

        void (async () => {
          const resolvedContent =
            envVars.length > 0 ? replaceHomepageEnvVariables(rawContent, envValues) : rawContent;

          await mutateAsync(
            {
              content: resolvedContent,
              boardName: values.boardName,
              createIntegrations: values.createIntegrations,
            },
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
          accept=".yaml,.yml"
          {...form.getInputProps("file")}
          error={
            (form.getInputProps("file").error as string | undefined) ??
            (!fileValid && form.isDirty("file") ? t("field.file.invalidError") : undefined)
          }
          type="button"
          label={t("field.file.label")}
        />

        {envVars.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              {t("field.envVariables.label")}
            </Text>
            <Text size="xs" c="dimmed">
              {t("field.envVariables.description")}
            </Text>
            {envVars.map((varName) => (
              <TextInput
                key={varName}
                label={<Code>{`{{${varName}}}`}</Code>}
                placeholder={varName.replace("HOMEPAGE_VAR_", "").toLowerCase().replaceAll("_", ".")}
                value={envValues[varName] ?? ""}
                onChange={(event) => {
                  setEnvValues((prev) => ({ ...prev, [varName]: event.target.value }));
                }}
                withAsterisk
              />
            ))}
          </Stack>
        )}

        <TextInput
          withAsterisk
          label={t("field.boardName.label")}
          description={
            boardNameStatus.description ? (
              <Group c={boardNameStatus.description.color} gap="xs" align="center">
                {boardNameStatus.description.icon ? <boardNameStatus.description.icon size={16} /> : null}
                <span>{boardNameStatus.description.label}</span>
              </Group>
            ) : null
          }
          {...form.getInputProps("boardName")}
        />

        <Switch
          label={t("field.createIntegrations.label")}
          description={t("field.createIntegrations.description")}
          {...form.getInputProps("createIntegrations", { type: "checkbox" })}
        />

        <Group justify="end">
          <Button variant="subtle" color="gray" onClick={actions.closeModal}>
            {tCommon("action.cancel")}
          </Button>
          <Button type="submit" loading={isPending} disabled={!allEnvVarsFilled}>
            {tCommon("action.import")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle: (t) => (t as (key: string) => string)("board.action.importHomepage.modal.title"),
  size: "lg",
});
