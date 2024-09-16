import { useState } from "react";
import { Button, Fieldset, FileInput, Grid, Group, Radio, Stack, Switch, TextInput } from "@mantine/core";
import { IconFileUpload } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { oldmarrConfigSchema } from "@homarr/old-schema";
import { useScopedI18n } from "@homarr/translation/client";
import { SelectWithDescription } from "@homarr/ui";
import type { OldmarrImportConfiguration } from "@homarr/validation";
import { oldmarrImportConfigurationSchema, superRefineJsonImportFile, z } from "@homarr/validation";

import { useBoardNameStatus } from "./add-board-modal";

export const ImportBoardModal = createModal(({ actions }) => {
  const tOldImport = useScopedI18n("board.action.oldImport");
  const tCommon = useScopedI18n("common");
  const [fileValid, setFileValid] = useState(true);
  const form = useZodForm(
    z.object({
      file: z.instanceof(File).nullable().superRefine(superRefineJsonImportFile),
      configuration: oldmarrImportConfigurationSchema,
    }),
    {
      mode: "controlled",
      initialValues: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        file: null!,
        configuration: {
          distinctAppsByHref: true,
          onlyImportApps: false,
          screenSize: "lg",
          sidebarBehaviour: "last-section",
          name: "",
        },
      },
      onValuesChange(values, previous) {
        // This is a workarround until async validation is supported by mantine
        void (async () => {
          if (values.file === previous.file) {
            return;
          }

          if (!values.file) {
            return;
          }

          const content = await values.file.text();
          const result = oldmarrConfigSchema.safeParse(JSON.parse(content));

          if (!result.success) {
            console.error(result.error.errors);
            setFileValid(false);
            return;
          }

          setFileValid(true);
          form.setFieldValue("configuration.name", result.data.configProperties.name);
        })();
      },
    },
  );

  const { mutateAsync, isPending } = clientApi.board.importOldmarrConfig.useMutation();
  const boardNameStatus = useBoardNameStatus(form.values.configuration.name);

  const handleSubmitAsync = async (values: { file: File; configuration: OldmarrImportConfiguration }) => {
    const formData = new FormData();
    formData.set("file", values.file);
    formData.set("configuration", JSON.stringify(values.configuration));

    await mutateAsync(formData, {
      async onSuccess() {
        actions.closeModal();
        await revalidatePathActionAsync("/manage/boards");
        showSuccessNotification({
          title: tOldImport("notification.success.title"),
          message: tOldImport("notification.success.message"),
        });
      },
      onError() {
        showErrorNotification({
          title: tOldImport("notification.error.title"),
          message: tOldImport("notification.error.message"),
        });
      },
    });
  };

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        if (!fileValid || !boardNameStatus.canSubmit) {
          return;
        }

        void handleSubmitAsync({
          // It's checked for null in the superrefine
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          file: values.file!,
          configuration: values.configuration,
        });
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
            (!fileValid && form.isDirty("file") ? tOldImport("form.file.invalidError") : undefined)
          }
          type="button"
          label={tOldImport("form.file.label")}
        />

        <Fieldset legend={tOldImport("form.apps.label")}>
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Switch
                label={tOldImport("form.apps.avoidDuplicates.label")}
                description={tOldImport("form.apps.avoidDuplicates.description")}
                {...form.getInputProps("configuration.distinctAppsByHref", { type: "checkbox" })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Switch
                label={tOldImport("form.apps.onlyImportApps.label")}
                description={tOldImport("form.apps.onlyImportApps.description")}
                {...form.getInputProps("configuration.onlyImportApps", { type: "checkbox" })}
              />
            </Grid.Col>
          </Grid>
        </Fieldset>

        <TextInput
          withAsterisk
          label={tOldImport("form.name.label")}
          description={
            boardNameStatus.description ? (
              <Group c={boardNameStatus.description.color} gap="xs" align="center">
                {boardNameStatus.description.icon ? <boardNameStatus.description.icon size={16} /> : null}
                <span>{boardNameStatus.description.label}</span>
              </Group>
            ) : null
          }
          {...form.getInputProps("configuration.name")}
        />

        <Radio.Group
          withAsterisk
          label={tOldImport("form.screenSize.label")}
          {...form.getInputProps("configuration.screenSize")}
        >
          <Group mt="xs">
            <Radio value="sm" label={tOldImport("form.screenSize.option.sm")} />
            <Radio value="md" label={tOldImport("form.screenSize.option.md")} />
            <Radio value="lg" label={tOldImport("form.screenSize.option.lg")} />
          </Group>
        </Radio.Group>

        <SelectWithDescription
          withAsterisk
          label={tOldImport("form.sidebarBehavior.label")}
          description={tOldImport("form.sidebarBehavior.description")}
          data={[
            {
              value: "last-section",
              label: tOldImport("form.sidebarBehavior.option.lastSection.label"),
              description: tOldImport("form.sidebarBehavior.option.lastSection.description"),
            },
            {
              value: "remove-items",
              label: tOldImport("form.sidebarBehavior.option.removeItems.label"),
              description: tOldImport("form.sidebarBehavior.option.removeItems.description"),
            },
          ]}
          {...form.getInputProps("configuration.sidebarBehaviour")}
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
  defaultTitle: (t) => t("board.action.oldImport.label"),
  size: "lg",
});
