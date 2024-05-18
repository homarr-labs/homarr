"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Fieldset,
  Group,
  SegmentedControl,
  Stack,
  TextInput,
} from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type {
  IntegrationKind,
  IntegrationSecretKind,
} from "@homarr/definitions";
import { getAllSecretKindOptions } from "@homarr/definitions";
import type { UseFormReturnType } from "@homarr/form";
import { useZodForm } from "@homarr/form";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import type { z } from "@homarr/validation";
import { validation } from "@homarr/validation";

import { IntegrationSecretInput } from "../_integration-secret-inputs";
import {
  TestConnection,
  TestConnectionNoticeAlert,
  useTestConnectionDirty,
} from "../_integration-test-connection";
import { revalidatePathActionAsync } from "../../../../revalidatePathAction";

interface NewIntegrationFormProps {
  searchParams: Partial<z.infer<typeof validation.integration.create>> & {
    kind: IntegrationKind;
  };
}

export const NewIntegrationForm = ({
  searchParams,
}: NewIntegrationFormProps) => {
  const t = useI18n();
  const secretKinds = getAllSecretKindOptions(searchParams.kind);
  const initialFormValues = {
    name: searchParams.name ?? "",
    url: searchParams.url ?? "",
    secrets: secretKinds[0].map((kind) => ({
      kind,
      value: "",
    })),
  };
  const { isDirty, onValuesChange, removeDirty } = useTestConnectionDirty({
    defaultDirty: true,
    initialFormValue: initialFormValues,
  });
  const router = useRouter();
  const form = useZodForm(validation.integration.create.omit({ kind: true }), {
    initialValues: initialFormValues,
    onValuesChange,
  });
  const { mutateAsync, isPending } = clientApi.integration.create.useMutation();

  const handleSubmitAsync = async (values: FormType) => {
    if (isDirty) return;
    await mutateAsync(
      {
        kind: searchParams.kind,
        ...values,
      },
      {
        onSuccess: () => {
          showSuccessNotification({
            title: t("integration.page.create.notification.success.title"),
            message: t("integration.page.create.notification.success.message"),
          });
          void revalidatePathActionAsync("/manage/integrations").then(() =>
            router.push("/manage/integrations"),
          );
        },
        onError: () => {
          showErrorNotification({
            title: t("integration.page.create.notification.error.title"),
            message: t("integration.page.create.notification.error.message"),
          });
        },
      },
    );
  };

  return (
    <form onSubmit={form.onSubmit((value) => void handleSubmitAsync(value))}>
      <Stack>
        <TestConnectionNoticeAlert />

        <TextInput
          withAsterisk
          label={t("integration.field.name.label")}
          {...form.getInputProps("name")}
        />

        <TextInput
          withAsterisk
          label={t("integration.field.url.label")}
          {...form.getInputProps("url")}
        />

        <Fieldset legend={t("integration.secrets.title")}>
          <Stack gap="sm">
            {secretKinds.length > 1 && (
              <SecretKindsSegmentedControl
                secretKinds={secretKinds}
                form={form}
              />
            )}
            {form.values.secrets.map(({ kind }, index) => (
              <IntegrationSecretInput
                withAsterisk
                key={kind}
                kind={kind}
                {...form.getInputProps(`secrets.${index}.value`)}
              />
            ))}
          </Stack>
        </Fieldset>

        <Group justify="space-between" align="center">
          <TestConnection
            isDirty={isDirty}
            removeDirty={removeDirty}
            integration={{
              id: null,
              kind: searchParams.kind,
              ...form.values,
            }}
          />

          <Group>
            <Button
              variant="default"
              component={Link}
              href="/manage/integrations"
            >
              {t("common.action.backToOverview")}
            </Button>
            <Button type="submit" loading={isPending} disabled={isDirty}>
              {t("common.action.create")}
            </Button>
          </Group>
        </Group>
      </Stack>
    </form>
  );
};

interface SecretKindsSegmentedControlProps {
  secretKinds: IntegrationSecretKind[][];
  form: UseFormReturnType<FormType, (values: FormType) => FormType>;
}

const SecretKindsSegmentedControl = ({
  secretKinds,
  form,
}: SecretKindsSegmentedControlProps) => {
  const t = useScopedI18n("integration.secrets");

  const secretKindGroups = secretKinds.map((kinds) => ({
    label: kinds.map((kind) => t(`kind.${kind}.label`)).join(" & "),
    value: kinds.join("-"),
  }));

  const onChange = useCallback(
    (value: string) => {
      const kinds = value.split("-") as IntegrationSecretKind[];
      const secrets = kinds.map((kind) => ({
        kind,
        value: "",
      }));
      form.setFieldValue("secrets", secrets);
    },
    [form],
  );

  return (
    <SegmentedControl
      fullWidth
      data={secretKindGroups}
      onChange={onChange}
    ></SegmentedControl>
  );
};

type FormType = Omit<z.infer<typeof validation.integration.create>, "kind">;
