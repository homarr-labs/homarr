"use client";

import type { ChangeEventHandler } from "react";
import { useEffect, useImperativeHandle, useRef } from "react";
import { Button, Checkbox, Collapse, Group, Stack, Textarea, TextInput } from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import type { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import { useZodForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { appManageSchema } from "@homarr/validation/app";

import { IconPicker } from "../icon-picker/icon-picker";
import { findBestIconMatch } from "./icon-matcher";

type FormType = z.infer<typeof appManageSchema>;

const toFormValues = (values: FormType | undefined): FormType => ({
  name: values?.name ?? "",
  description: values?.description ?? "",
  iconUrl: values?.iconUrl ?? "",
  href: values?.href ?? "",
  pingUrl: values?.pingUrl ?? "",
});

export interface AppFormHandle {
  submit: () => Promise<boolean>;
  isDirty: () => boolean;
}

interface AppFormProps {
  showBackToOverview: boolean;
  buttonLabels: {
    submit: string;
    submitAndCreateAnother?: string;
  };
  initialValues?: FormType;
  handleSubmit: (values: FormType, redirect: boolean, afterSuccess?: () => void) => void | Promise<void>;
  isPending: boolean;
  hideButtons?: boolean;
  formRef?: React.Ref<AppFormHandle>;
}

export const AppForm = ({
  buttonLabels,
  showBackToOverview,
  handleSubmit: originalHandleSubmit,
  initialValues,
  isPending,
  hideButtons,
  formRef,
}: AppFormProps) => {
  const t = useI18n();

  const form = useZodForm(appManageSchema, {
    initialValues: toFormValues(initialValues),
  });

  const initialValuesKey = [
    initialValues?.name,
    initialValues?.description,
    initialValues?.iconUrl,
    initialValues?.href,
    initialValues?.pingUrl,
  ].join("\0");

  useEffect(() => {
    if (!initialValues || form.isDirty()) {
      return;
    }

    form.initialize(toFormValues(initialValues));
    // `form` is a new object every render (Mantine useForm returns a fresh literal),
    // so it must not be a dep here — it would re-run every render and, since
    // form.initialize() always calls clearErrors() (new {} object) internally,
    // trigger an infinite update loop. initialValuesKey (a primitive string)
    // already captures the only case this effect exists for: re-initializing
    // when initialValues actually changes (e.g. navigating between edit pages).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValuesKey]);

  // Debounce the name value with 200ms delay
  const [debouncedName] = useDebouncedValue(form.values.name, 200);

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

  useImperativeHandle(
    formRef,
    () => ({
      submit: () =>
        new Promise<boolean>((resolve) => {
          form.onSubmit(
            async (values) => {
              try {
                await Promise.resolve(handleSubmit(values));
                form.initialize(values);
                resolve(true);
              } catch {
                resolve(false);
              }
            },
            () => resolve(false),
          )();
        }),
      isDirty: () => form.isDirty(),
    }),
    [form, handleSubmit],
  );

  const [opened, { open, close }] = useDisclosure((initialValues?.pingUrl?.length ?? 0) > 0);

  const handleClickDifferentUrlPing: ChangeEventHandler<HTMLInputElement> = () => {
    if (!opened) {
      open();
    } else {
      close();
      form.setFieldValue("pingUrl", "");
    }
  };

  // Auto-select icon based on app name with debounced search
  const { data: iconsData } = clientApi.icon.findIcons.useQuery(
    {
      searchText: debouncedName,
    },
    {
      enabled: debouncedName.length > 3,
    },
  );

  useEffect(() => {
    if (debouncedName && !form.values.iconUrl && iconsData?.icons) {
      const bestMatch = findBestIconMatch(debouncedName, iconsData.icons);
      if (bestMatch) {
        form.setFieldValue("iconUrl", bestMatch);
      }
    }
  }, [debouncedName, iconsData]);

  const formFields = (
    <Stack>
      <TextInput {...form.getInputProps("name")} withAsterisk label={t("app.field.name.label")} />
      <IconPicker {...form.getInputProps("iconUrl")} />
      <Textarea
        {...form.getInputProps("description")}
        label={t("app.field.description.label")}
        autosize
        minRows={2}
        resize="vertical"
      />
      <TextInput {...form.getInputProps("href")} label={t("app.field.url.label")} />

      <Checkbox
        checked={opened}
        onChange={handleClickDifferentUrlPing}
        label={t("app.field.useDifferentUrlForPing.checkbox.label")}
        description={t("app.field.useDifferentUrlForPing.checkbox.description")}
        mt="md"
      />

      <Collapse expanded={opened}>
        <TextInput {...form.getInputProps("pingUrl")} />
      </Collapse>

      {!hideButtons && (
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
      )}
    </Stack>
  );

  if (hideButtons) {
    return formFields;
  }

  return <form onSubmit={form.onSubmit(handleSubmit)}>{formFields}</form>;
};
