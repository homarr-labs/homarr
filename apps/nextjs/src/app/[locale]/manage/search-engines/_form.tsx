"use client";

import Link from "next/link";
import { Button, Grid, Group, Stack, Textarea, TextInput } from "@mantine/core";

import { useZodForm } from "@homarr/form";
import type { TranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import type { z } from "@homarr/validation";
import { validation } from "@homarr/validation";

import { IconPicker } from "~/components/icons/picker/icon-picker";

type FormType = z.infer<typeof validation.searchEngine.manage>;

interface SearchEngineFormProps {
  submitButtonTranslation: (t: TranslationFunction) => string;
  initialValues?: FormType;
  handleSubmit: (values: FormType) => void;
  isPending: boolean;
  disableShort?: boolean;
}

export const SearchEngineForm = (props: SearchEngineFormProps) => {
  const { submitButtonTranslation, handleSubmit, initialValues, isPending, disableShort } = props;
  const t = useI18n();

  const form = useZodForm(validation.searchEngine.manage, {
    initialValues: initialValues ?? {
      name: "",
      short: "",
      iconUrl: "",
      urlTemplate: "",
      description: "",
    },
  });

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <Grid>
          <Grid.Col span={{ base: 12, md: 8, lg: 9, xl: 10 }}>
            <TextInput {...form.getInputProps("name")} withAsterisk label={t("search.engine.field.name.label")} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4, lg: 3, xl: 2 }}>
            <TextInput
              {...form.getInputProps("short")}
              disabled={disableShort}
              withAsterisk
              label={t("search.engine.field.short.label")}
            />
          </Grid.Col>
        </Grid>
        <IconPicker initialValue={initialValues?.iconUrl} {...form.getInputProps("iconUrl")} />
        <TextInput
          {...form.getInputProps("urlTemplate")}
          withAsterisk
          label={t("search.engine.field.urlTemplate.label")}
        />
        <Textarea {...form.getInputProps("description")} label={t("search.engine.field.description.label")} />

        <Group justify="end">
          <Button variant="default" component={Link} href="/manage/search-engines">
            {t("common.action.backToOverview")}
          </Button>
          <Button type="submit" loading={isPending}>
            {submitButtonTranslation(t)}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
