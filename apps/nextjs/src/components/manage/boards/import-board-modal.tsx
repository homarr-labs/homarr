import { useState } from "react";
import { Button, Fieldset, FileInput, Grid, Group, Radio, Stack, Switch, TextInput } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useZodForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { oldmarrConfigSchema } from "@homarr/old-schema";
import { SelectWithDescription } from "@homarr/ui";
import type { OldmarrImportConfiguration } from "@homarr/validation";
import { createOldmarrImportConfigurationSchema, z } from "@homarr/validation";
import { createCustomErrorParams } from "@homarr/validation/form";

interface InnerProps {
  boardNames: string[];
}

export const ImportBoardModal = createModal<InnerProps>(({ actions, innerProps }) => {
  const [fileValid, setFileValid] = useState(false);
  const form = useZodForm(
    z.object({
      file: z
        .instanceof(File)
        .nullable()
        .superRefine((value, context) => {
          if (!value) {
            return context.addIssue({
              code: "invalid_type",
              expected: "object",
              received: "null",
            });
          }

          if (value.type !== "application/json") {
            return context.addIssue({
              code: "custom",
              params: createCustomErrorParams({
                key: "invalidFileType",
                params: { expected: "JSON" },
              }),
            });
          }

          if (value.size > 1024 * 1024) {
            return context.addIssue({
              code: "custom",
              params: createCustomErrorParams({
                key: "fileTooLarge",
                params: { maxSize: "1 MB" },
              }),
            });
          }

          return null;
        }),
      configuration: createOldmarrImportConfigurationSchema(innerProps.boardNames),
    }),
    {
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

  const { mutateAsync } = clientApi.board.importOldmarrConfig.useMutation();

  const handleSubmitAsync = async (values: { file: File; configuration: OldmarrImportConfiguration }) => {
    const formData = new FormData();
    formData.set("file", values.file);
    formData.set("configuration", JSON.stringify(values.configuration));

    await mutateAsync(formData, {
      onSuccess() {
        actions.closeModal();
      },
    });
  };

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        if (!fileValid) {
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
          accept="application/json"
          {...form.getInputProps("file")}
          error={
            (form.getInputProps("file").error as string | undefined) ??
            (!fileValid ? "Invalid configuration file" : undefined)
          }
          type="button"
          label="Select JSON file"
        />

        <Fieldset legend="Apps">
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Switch
                label="Avoid duplicates"
                {...form.getInputProps("configuration.distinctAppsByHref", { type: "checkbox" })}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Switch
                label="Only import apps"
                {...form.getInputProps("configuration.onlyImportApps", { type: "checkbox" })}
              />
            </Grid.Col>
          </Grid>
        </Fieldset>

        <TextInput label="Board name" {...form.getInputProps("configuration.name")} />

        <Radio.Group label="Screen size" {...form.getInputProps("configuration.screenSize")}>
          <Group mt="xs">
            <Radio value="sm" label="Small" />
            <Radio value="md" label="Medium" />
            <Radio value="lg" label="Large" />
          </Group>
        </Radio.Group>

        <SelectWithDescription
          label="Sidebar behaviour"
          description="Sidebars were removed in 1.0, you can select what should happen with the items inside them."
          data={[
            {
              value: "last-section",
              label: "Last section",
              description: "Sidebar will be displayed below the last section",
            },
            {
              value: "remove-items",
              label: "Remove items",
              description: "Items contained in the sidebar will be removed",
            },
          ]}
          {...form.getInputProps("configuration.sidebarBehaviour")}
        />

        <pre>{JSON.stringify(form.values, null, 4)}</pre>

        <Button type="submit">Import</Button>
      </Stack>
    </form>
  );
}).withOptions({
  // TODO: translate
  defaultTitle: "Import board",
  size: "lg",
});
