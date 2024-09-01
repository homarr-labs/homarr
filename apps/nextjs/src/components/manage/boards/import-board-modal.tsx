import { Button, Fieldset, FileInput, Grid, Group, Radio, Stack, Switch, TextInput } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useZodForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { importConfigurationSchema } from "@homarr/old-schema/shared";
import { SelectWithDescription } from "@homarr/ui";
import { z } from "@homarr/validation";

interface InnerProps {
  boardNames: string[];
}

export const ImportBoardModal = createModal<InnerProps>(({ actions, innerProps }) => {
  const form = useZodForm(
    z.object({
      file: z.custom<File>((value) => {}),
      configuration: importConfigurationSchema,
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
    },
  );

  const { mutateAsync } = clientApi.board.importOldmarrConfig.useMutation();
  /*const form = useForm<{ file: File | null; boardName: string }>({
    validateInputOnBlur: true,
    validateInputOnChange: true,
    validate: {
      // eslint-disable-next-line no-restricted-syntax
      async file(value, values, path) {
        if (!value) {
          return "File is required";
        }

        if (value.type !== "application/json") {
          return "File must be a JSON file";
        }

        try {
          const content = oldmarrConfigSchema.parse(JSON.parse(await value.text()));

          if (!("configProperties" in content)) {
            return "Invalid oldmarr config";
          }

          if (!("name" in content.configProperties)) {
            return "Invalid oldmarr config";
          }
        } catch {
          return "File must be a valid JSON file";
        }
      },
    },
  });*/

  const handleSubmitAsync = async (values: {
    file: File;
    configuration: z.infer<typeof importConfigurationSchema>;
  }) => {
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
    <form onSubmit={form.onSubmit((values) => void handleSubmitAsync(values))}>
      <Stack>
        <FileInput accept="application/json" {...form.getInputProps("file")} type="button" label="Select JSON file" />

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
