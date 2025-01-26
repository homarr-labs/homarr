"use client";

import Link from "next/link";
import { Button, Group, Stack, Textarea, TextInput } from "@mantine/core";
import type { z } from "zod";

import { useZodForm } from "@homarr/form";
import type { TranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import { validation } from "@homarr/validation";

import { IconPicker } from "~/components/icons/picker/icon-picker";

type FormType = z.infer<typeof validation.app.manage>;

interface AppFormProps {
  submitButtonTranslation: (t: TranslationFunction) => string;
  initialValues?: FormType;
  handleSubmit: (values: FormType) => void;
  isPending: boolean;
}

export const AppForm = (props: AppFormProps) => {
  const { submitButtonTranslation, handleSubmit, initialValues, isPending } = props;
  const t = useI18n();

  const form = useZodForm(validation.app.manage, {
    initialValues: {
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      iconUrl: initialValues?.iconUrl ?? "",
      href: initialValues?.href ?? "",
    },
  });

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput {...form.getInputProps("name")} withAsterisk label={t("app.field.name.label")} />
        <IconPicker initialValue={initialValues?.iconUrl} {...form.getInputProps("iconUrl")} />
        <Textarea {...form.getInputProps("description")} label={t("app.field.description.label")} />
        <TextInput {...form.getInputProps("href")} label={t("app.field.url.label")} />

        <Group justify="end">
          <Button variant="default" component={Link} href="/manage/apps">
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
