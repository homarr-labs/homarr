"use client";

import { useRef } from "react";
import Link from "next/link";
import { Button, Group, Stack, Textarea, TextInput } from "@mantine/core";
import type { z } from "zod";

import { useZodForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { validation } from "@homarr/validation";

import { IconPicker } from "../icon-picker/icon-picker";

type FormType = z.infer<typeof validation.app.manage>;

interface AppFormProps {
  showBackToOverview: boolean;
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
  showBackToOverview,
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

  const shouldCreateAnother = useRef(false);
  const handleSubmit = (values: FormType) => {
    const redirect = !shouldCreateAnother.current;
    const afterSuccess = shouldCreateAnother.current
      ? () => {
          form.reset();
          shouldCreateAnother.current = false;
        }
      : undefined;
    originalHandleSubmit(values, redirect, afterSuccess);
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput {...form.getInputProps("name")} withAsterisk label={t("app.field.name.label")} />
        <IconPicker {...form.getInputProps("iconUrl")} />
        <Textarea {...form.getInputProps("description")} label={t("app.field.description.label")} />
        <TextInput {...form.getInputProps("href")} label={t("app.field.url.label")} />

        <Group justify="end">
          {showBackToOverview && (
            <Button variant="default" component={Link} href="/manage/apps">
              {t("common.action.backToOverview")}
            </Button>
          )}
          {buttonLabels.submitAndCreateAnother && (
            <Button
              type="submit"
              onClick={() => {
                shouldCreateAnother.current = true;
              }}
              loading={isPending}
            >
              {buttonLabels.submitAndCreateAnother}
            </Button>
          )}
          <Button type="submit" loading={isPending}>
            {buttonLabels.submit}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
