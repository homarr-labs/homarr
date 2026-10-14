"use client";

import type { ChangeEventHandler, FormEvent } from "react";
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react";
import { Button, Checkbox, Collapse, Group, Stack, Textarea, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { z } from "zod/v4";

import { useZodForm } from "@homarr/form";
import { invariantTechnicalLabels } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { appManageSchema } from "@homarr/validation/app";

import { IconPicker } from "../icon-picker/icon-picker";
import type { IconPickerResources } from "../icon-picker/icon-picker";

export type AppFormValues = z.infer<typeof appManageSchema>;
type FormType = AppFormValues;

const toFormValues = (values: FormType | undefined): FormType => ({
  name: values?.name ?? "",
  description: values?.description ?? "",
  iconUrl: values?.iconUrl ?? "",
  href: values?.href ?? "",
  pingUrl: values?.pingUrl ?? "",
});

const matchesFormValues = (current: FormType, submitted: FormType) =>
  current.name === submitted.name &&
  current.description === submitted.description &&
  current.iconUrl === submitted.iconUrl &&
  current.href === submitted.href &&
  current.pingUrl === submitted.pingUrl;

export interface AppFormHandle {
  submit: () => Promise<boolean>;
  isDirty: () => boolean;
}

export interface AppFormProps {
  showBackToOverview: boolean;
  buttonLabels: {
    submit: string;
    submitAndCreateAnother?: string;
  };
  initialValues?: FormType;
  handleSubmit: (values: FormType, redirect: boolean, afterSuccess?: () => void) => Promise<void>;
  isPending: boolean;
  hideButtons?: boolean;
  formRef?: React.Ref<AppFormHandle>;
  iconPickerProps: IconPickerResources;
  disabled?: boolean;
  isCurrentOwner: () => boolean;
  onDirtyChange: (dirty: boolean) => void;
  captureSubmissionOwner: () => { isCurrent: () => boolean };
}

export const AppForm = ({
  buttonLabels,
  showBackToOverview,
  handleSubmit: originalHandleSubmit,
  initialValues,
  isPending,
  hideButtons,
  formRef,
  iconPickerProps,
  disabled = false,
  isCurrentOwner,
  onDirtyChange,
  captureSubmissionOwner,
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
  const submitting = useRef(false);
  const binding = useMemo(
    () => ({ captureSubmissionOwner, initialValuesKey, isCurrentOwner, onDirtyChange }),
    [captureSubmissionOwner, initialValuesKey, isCurrentOwner, onDirtyChange],
  );
  const owner = useRef<{ active: boolean; binding: typeof binding } | null>(null);
  const currentForm = useRef(form);
  const reportedDirty = useRef<{ owner: object; dirty: boolean } | null>(null);
  useLayoutEffect(() => {
    const lease = { active: true, binding };
    owner.current = lease;
    return () => {
      lease.active = false;
    };
  }, [binding]);
  useLayoutEffect(() => {
    currentForm.current = form;
    const lease = owner.current;
    if (!lease?.active || lease.binding !== binding || !isCurrentOwner()) return;
    const dirty = form.isDirty();
    if (reportedDirty.current?.owner === lease && reportedDirty.current.dirty === dirty) return;
    reportedDirty.current = { owner: lease, dirty };
    onDirtyChange(dirty);
  });
  const submit = useCallback(
    (event?: FormEvent<HTMLFormElement>): Promise<boolean> => {
      event?.preventDefault();
      const lease = owner.current;
      if (!lease?.active || lease.binding !== binding || submitting.current || isPending || disabled)
        return Promise.resolve(false);
      submitting.current = true;
      const createAnother = shouldCreateAnother.current;
      shouldCreateAnother.current = false;
      try {
        const submissionOwner = captureSubmissionOwner();
        const isCurrent = () =>
          lease.active && owner.current === lease && submissionOwner.isCurrent() && isCurrentOwner();
        if (!isCurrent()) {
          submitting.current = false;
          return Promise.resolve(false);
        }
        const submitted = toFormValues(currentForm.current.getValues());
        return new Promise<boolean>((resolve) => {
          const finish = (success: boolean) => {
            try {
              resolve(success && isCurrent());
            } catch {
              resolve(false);
            } finally {
              submitting.current = false;
            }
          };
          const acknowledgeSubmitted = () => {
            if (!isCurrent()) return;
            const actual = currentForm.current.getValues();
            currentForm.current.resetDirty(submitted);
            currentForm.current.setDirty({
              name: actual.name !== submitted.name,
              description: actual.description !== submitted.description,
              iconUrl: actual.iconUrl !== submitted.iconUrl,
              href: actual.href !== submitted.href,
              pingUrl: actual.pingUrl !== submitted.pingUrl,
            });
          };
          const handleSubmit = async (values: FormType) => {
            try {
              if (!isCurrent() || !matchesFormValues(values, submitted)) return false;
              let didReset = false;
              const afterSuccess = createAnother
                ? () => {
                    if (!isCurrent()) return;
                    if (matchesFormValues(currentForm.current.getValues(), submitted)) {
                      currentForm.current.reset();
                      didReset = true;
                    } else {
                      acknowledgeSubmitted();
                    }
                  }
                : undefined;
              await originalHandleSubmit(submitted, !createAnother, afterSuccess);
              if (!isCurrent()) return false;
              if (!didReset) acknowledgeSubmitted();
              return isCurrent();
            } catch {
              return false;
            }
          };
          try {
            currentForm.current.onSubmit(
              (values) => {
                void handleSubmit(values).then(finish);
              },
              () => finish(false),
            )(event);
          } catch {
            finish(false);
          }
        });
      } catch {
        submitting.current = false;
        return Promise.resolve(false);
      }
    },
    [binding, captureSubmissionOwner, disabled, isCurrentOwner, isPending, originalHandleSubmit],
  );

  useImperativeHandle(
    formRef,
    () => ({
      submit: () => submit(),
      isDirty: () => form.isDirty(),
    }),
    [form, submit],
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
    <fieldset disabled={isPending || disabled} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <Stack>
        <TextInput {...form.getInputProps("name")} withAsterisk label={tCommon("field.name")} />
        <IconPicker
          {...iconPickerProps}
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
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      {formFields}
    </form>
  );
};
