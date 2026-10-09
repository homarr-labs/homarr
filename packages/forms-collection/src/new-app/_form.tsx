"use client";

import type { ChangeEventHandler } from "react";
import { useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { Button, Checkbox, Collapse, Group, Stack, Textarea, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { z } from "zod/v4";

import { useZodForm } from "@homarr/form";
import { invariantTechnicalLabels } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { appManageSchema } from "@homarr/validation/app";

import { IconPicker } from "../icon-picker/icon-picker";

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
  const tApp = useI18n("app");
  const tCommon = useI18n("common");

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

  const shouldCreateAnother = useRef(false);
  const handleSubmit = useCallback(
    async (values: FormType) => {
      const redirect = !shouldCreateAnother.current;
      const afterSuccess = shouldCreateAnother.current
        ? () => {
            form.reset();
            shouldCreateAnother.current = false;
          }
        : undefined;
      shouldCreateAnother.current = false;
      await originalHandleSubmit(values, redirect, afterSuccess);
    },
    [form, originalHandleSubmit],
  );

  useImperativeHandle(
    formRef,
    () => ({
      submit: () =>
        new Promise<boolean>((resolve) => {
          form.onSubmit(
            async (values) => {
              try {
                await Promise.resolve(handleSubmit(values));
                form.resetDirty(values);
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

  const formFields = (
    <fieldset disabled={isPending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <Stack>
        <TextInput {...form.getInputProps("name")} withAsterisk label={tCommon("field.name")} />
        <IconPicker
          {...form.getInputProps("iconUrl")}
          suggestedSearch={initialValues === undefined ? form.values.name : undefined}
        />
        <Textarea
          {...form.getInputProps("description")}
          label={tApp("field.description.label")}
          autosize
          minRows={2}
          resize="vertical"
        />
        <TextInput {...form.getInputProps("href")} label={invariantTechnicalLabels.url} />

        <Checkbox
          checked={opened}
          onChange={handleClickDifferentUrlPing}
          label={tApp("field.useDifferentUrlForPing.checkbox.label")}
          description={tApp("field.useDifferentUrlForPing.checkbox.description")}
          mt="md"
        />

        <Collapse expanded={opened}>
          <TextInput {...form.getInputProps("pingUrl")} />
        </Collapse>

        {!hideButtons && (
          <Group justify="end">
            {showBackToOverview && (
              <Button variant="default" component={Link} href="/manage/apps">
                {tCommon("action.backToOverview")}
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
            <Button
              type="submit"
              loading={isPending}
              onClick={() => {
                shouldCreateAnother.current = false;
              }}
            >
              {buttonLabels.submit}
            </Button>
          </Group>
        )}
      </Stack>
    </fieldset>
  );

  if (hideButtons) {
    return formFields;
  }

  return (
    <form
      onSubmit={form.onSubmit(
        (values) => {
          void handleSubmit(values).catch(() => {});
        },
        () => {
          shouldCreateAnother.current = false;
        },
      )}
    >
      {formFields}
    </form>
  );
};
