"use client";

import { useState } from "react";
import { Button, Card, Code, FileInput, Group, Stack, Switch, Text, TextInput, Title } from "@mantine/core";
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
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { boardNameSchema } from "@homarr/validation/board";

export const ImportHomepageCard = () => {
  const t = useI18n() as unknown as (key: string) => string;
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
          if (values.file === previous.file) return;
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (!values.file) return;

          const content = await values.file.text();
          setRawContent(content);

          const vars = extractHomepageEnvVariables(content);
          setEnvVars(vars);
          setEnvValues(Object.fromEntries(vars.map((v: string) => [v, ""])));

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

  const allEnvVarsFilled = envVars.length === 0 || envVars.every((v) => (envValues[v] ?? "").trim().length > 0);

  return (
    <Card withBorder>
      <form
        onSubmit={form.onSubmit((values) => {
          if (!fileValid || !allEnvVarsFilled) return;

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
                  showSuccessNotification({
                    title: t("management.page.importExport.importHomepage.notification.success.title"),
                    message: t("management.page.importExport.importHomepage.notification.success.message"),
                  });
                  form.reset();
                  setRawContent("");
                  setEnvVars([]);
                  setEnvValues({});
                },
                onError() {
                  showErrorNotification({
                    title: t("management.page.importExport.importHomepage.notification.error.title"),
                    message: t("management.page.importExport.importHomepage.notification.error.message"),
                  });
                },
              },
            );
          })();
        })}
      >
        <Stack>
          <Stack gap="xs">
            <Title order={3}>{t("management.page.importExport.importHomepage.title")}</Title>
            <Text size="sm" c="dimmed">
              {t("management.page.importExport.importHomepage.description")}
            </Text>
          </Stack>

          <FileInput
            rightSection={<IconFileUpload />}
            withAsterisk
            accept=".yaml,.yml"
            {...form.getInputProps("file")}
            error={
              (form.getInputProps("file").error as string | undefined) ??
              (!fileValid && form.isDirty("file") ? t("management.page.importExport.importHomepage.invalidFile") : undefined)
            }
            type="button"
            label={t("management.page.importExport.importHomepage.fileLabel")}
          />

          {envVars.length > 0 && (
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                {t("management.page.importExport.importHomepage.envVariables.label")}
              </Text>
              <Text size="xs" c="dimmed">
                {t("management.page.importExport.importHomepage.envVariables.description")}
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
            label={t("management.page.importExport.importHomepage.boardNameLabel")}
            {...form.getInputProps("boardName")}
          />

          <Switch
            label={t("management.page.importExport.importHomepage.createIntegrations")}
            {...form.getInputProps("createIntegrations", { type: "checkbox" })}
          />

          <Group justify="end">
            <Button type="submit" loading={isPending} disabled={!allEnvVarsFilled}>
              {t("common.action.import")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
};
