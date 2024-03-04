"use client";

import Link from "next/link";

import { useForm, zodResolver } from "@homarr/form";
import type { TranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import { Button, Group, Stack, Textarea, TextInput } from "@homarr/ui";
import type { z } from "@homarr/validation";
import { validation } from "@homarr/validation";

// TODO: add icon picker
type FormType = z.infer<typeof validation.app.manage>;

interface AppFormProps {
  submitButtonTranslation: (t: TranslationFunction) => string;
  initialValues?: FormType;
  handleSubmit: (values: FormType) => void;
  isPending: boolean;
}

export const AppForm = (props: AppFormProps) => {
  const { submitButtonTranslation, handleSubmit, initialValues, isPending } =
    props;
  const t = useI18n();

  const form = useForm({
    initialValues: initialValues ?? {
      name: "",
      description: "",
      iconUrl: "",
      href: "",
    },
    validate: zodResolver(validation.app.manage),
  });

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput {...form.getInputProps("name")} withAsterisk label="Name" />
        <TextInput
          {...form.getInputProps("iconUrl")}
          withAsterisk
          label="Icon URL"
        />
        <Textarea {...form.getInputProps("description")} label="Description" />
        <TextInput {...form.getInputProps("href")} label="URL" />

        <Group justify="end">
          <Button variant="default" component={Link} href="/apps">
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
