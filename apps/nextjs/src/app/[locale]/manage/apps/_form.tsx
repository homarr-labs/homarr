"use client";

import Link from "next/link";
import { Button, Group, Stack, Textarea, TextInput } from "@mantine/core";
import type { z } from "zod";

import { useZodForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { validation } from "@homarr/validation";

import { IconPicker } from "~/components/icons/picker/icon-picker";

type FormType = z.infer<typeof validation.app.manage>;

interface AppFormProps {
  buttonLabels: {
    submit: string;
    submitAndCreateAnother?: string;
  };
  initialValues?: FormType;
  handleSubmit: (values: FormType, redirect: boolean, afterSuccess?: () => void) => void;
  isPending: boolean;
}

export const AppForm = ({
  buttonLabels,
  handleSubmit: originalHandleSubmit,
  initialValues,
  isPending,
}: AppFormProps) => {
  const t = useI18n();

  const form = useZodForm(validation.app.manage, {
    initialValues: {
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      iconUrl: initialValues?.iconUrl ?? "",
      href: initialValues?.href ?? "",
    },
  });

  const handleSubmitAndCreateAnother = () => {
    originalHandleSubmit(form.values, false, () => {
      form.reset();
    });
  };

  return (
    <form onSubmit={form.onSubmit((values) => originalHandleSubmit(values, true))}>
      <Stack>
        <TextInput {...form.getInputProps("name")} withAsterisk label={t("app.field.name.label")} />
        <IconPicker initialValue={initialValues?.iconUrl} {...form.getInputProps("iconUrl")} />
        <Textarea {...form.getInputProps("description")} label={t("app.field.description.label")} />
        <TextInput {...form.getInputProps("href")} label={t("app.field.url.label")} />

        <Group justify="end">
          <Button variant="default" component={Link} href="/manage/apps">
            {t("common.action.backToOverview")}
          </Button>
          {buttonLabels.submitAndCreateAnother && (
            <Button disabled={!form.isValid()} onClick={handleSubmitAndCreateAnother} loading={isPending}>
              {buttonLabels.submitAndCreateAnother}
            </Button>
          )}
          <Button disabled={!form.isValid()} type="submit" loading={isPending}>
            {buttonLabels.submit}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
