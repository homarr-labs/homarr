"use client";

import type { SegmentedControlItem } from "@mantine/core";
import { Button, Fieldset, Grid, Group, SegmentedControl, Stack, Textarea, TextInput } from "@mantine/core";
import { WidgetIntegrationSelect } from "@homarr/widgets/widget-integration-select";
import type { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import { searchEngineTypes } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";
import { IconPicker } from "@homarr/forms-collection";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { searchEngineManageSchema } from "@homarr/validation/search-engine";

type FormType = z.infer<typeof searchEngineManageSchema>;

interface SearchEngineFormProps {
  submitButtonTranslation: (t: ScopedTranslationFunction<"common">) => string;
  initialValues?: FormType;
  handleSubmit: (values: FormType) => void;
  isPending: boolean;
  disableShort?: boolean;
}

export const SearchEngineForm = (props: SearchEngineFormProps) => {
  const { submitButtonTranslation, handleSubmit, initialValues, isPending, disableShort } = props;
  const t = useI18n("search.engine");
  const tCommon = useI18n("common");

  const [integrationData] = clientApi.integration.allThatSupportSearch.useSuspenseQuery();

  const form = useZodForm(searchEngineManageSchema, {
    initialValues: initialValues ?? {
      name: "",
      short: "",
      iconUrl: "",
      urlTemplate: "",
      description: "",
      type: "generic",
    },
  });

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <Grid>
          <Grid.Col span={{ base: 12, md: 8, lg: 9, xl: 10 }}>
            <TextInput {...form.getInputProps("name")} withAsterisk label={tCommon("field.name")} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4, lg: 3, xl: 2 }}>
            <TextInput
              {...form.getInputProps("short")}
              disabled={disableShort}
              withAsterisk
              label={t("field.short.label")}
            />
          </Grid.Col>
        </Grid>
        <IconPicker
          {...form.getInputProps("iconUrl")}
          suggestedSearch={initialValues === undefined ? form.values.name : undefined}
        />

        <Fieldset legend={t("page.edit.configControl")}>
          <SegmentedControl
            data={searchEngineTypes.map(
              (type) =>
                ({
                  label: t(`page.edit.searchEngineType.${type}` as never),
                  value: type,
                }) satisfies SegmentedControlItem,
            )}
            {...form.getInputProps("type")}
            fullWidth
          />

          {form.values.type === "generic" && (
            <TextInput {...form.getInputProps("urlTemplate")} withAsterisk label={t("field.urlTemplate.label")} />
          )}

          {form.values.type === "fromIntegration" && (
            <WidgetIntegrationSelect
              label="Integration"
              data={integrationData}
              canSelectMultiple={false}
              onChange={(value) => form.setFieldValue("integrationId", value[0])}
              value={form.values.integrationId !== undefined ? [form.values.integrationId] : []}
              withAsterisk
            />
          )}
        </Fieldset>

        <Textarea {...form.getInputProps("description")} label={t("field.description.label")} />

        <Group justify="end">
          <Button variant="default" component={Link} href="/manage/search-engines">
            {tCommon("action.backToOverview")}
          </Button>
          <Button type="submit" loading={isPending}>
            {submitButtonTranslation(tCommon)}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
