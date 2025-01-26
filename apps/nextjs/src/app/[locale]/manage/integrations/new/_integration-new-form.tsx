"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Checkbox, Fieldset, Group, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { z } from "zod";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import type { IntegrationKind, IntegrationSecretKind } from "@homarr/definitions";
import { getAllSecretKindOptions, getIntegrationName, integrationDefs } from "@homarr/definitions";
import type { UseFormReturnType } from "@homarr/form";
import { useZodForm } from "@homarr/form";
import { convertIntegrationTestConnectionError } from "@homarr/integrations/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import { validation } from "@homarr/validation";

import { IntegrationSecretInput } from "../_components/secrets/integration-secret-inputs";

interface NewIntegrationFormProps {
  searchParams: Partial<z.infer<typeof validation.integration.create>> & {
    kind: IntegrationKind;
  };
}

export const NewIntegrationForm = ({ searchParams }: NewIntegrationFormProps) => {
  const t = useI18n();
  const secretKinds = getAllSecretKindOptions(searchParams.kind);
  const router = useRouter();
  const form = useZodForm(validation.integration.create.omit({ kind: true }), {
    initialValues: {
      name: searchParams.name ?? getIntegrationName(searchParams.kind),
      url: searchParams.url ?? "",
      secrets: secretKinds[0].map((kind) => ({
        kind,
        value: "",
      })),
      attemptSearchEngineCreation: true,
    },
  });
  const { mutateAsync, isPending } = clientApi.integration.create.useMutation();

  const handleSubmitAsync = async (values: FormType) => {
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
          void revalidatePathActionAsync("/manage/integrations").then(() => router.push("/manage/integrations"));
        },
        onError: (error) => {
          const testConnectionError = convertIntegrationTestConnectionError(error.data?.error);

          if (testConnectionError) {
            showErrorNotification({
              title: t(`integration.testConnection.notification.${testConnectionError.key}.title`),
              message: testConnectionError.message
                ? testConnectionError.message
                : t(`integration.testConnection.notification.${testConnectionError.key}.message`),
            });
            return;
          }

          showErrorNotification({
            title: t("integration.page.create.notification.error.title"),
            message: t("integration.page.create.notification.error.message"),
          });
        },
      },
    );
  };

  const supportsSearchEngine = integrationDefs[searchParams.kind].category.flat().includes("search");

  return (
    <form onSubmit={form.onSubmit((value) => void handleSubmitAsync(value))}>
      <Stack>
        <TextInput withAsterisk label={t("integration.field.name.label")} autoFocus {...form.getInputProps("name")} />

        <TextInput withAsterisk label={t("integration.field.url.label")} {...form.getInputProps("url")} />

        <Fieldset legend={t("integration.secrets.title")}>
          <Stack gap="sm">
            {secretKinds.length > 1 && <SecretKindsSegmentedControl secretKinds={secretKinds} form={form} />}
            {form.values.secrets.map(({ kind }, index) => (
              <IntegrationSecretInput
                withAsterisk
                key={kind}
                kind={kind}
                {...form.getInputProps(`secrets.${index}.value`)}
              />
            ))}
            {form.values.secrets.length === 0 && (
              <Alert icon={<IconInfoCircle size={"1rem"} />} color={"blue"}>
                <Text c={"blue"}>{t("integration.secrets.noSecretsRequired.text")}</Text>
              </Alert>
            )}
          </Stack>
        </Fieldset>

        {supportsSearchEngine && (
          <Checkbox
            label={t("integration.field.attemptSearchEngineCreation.label")}
            description={t("integration.field.attemptSearchEngineCreation.description", {
              kind: getIntegrationName(searchParams.kind),
            })}
            {...form.getInputProps("attemptSearchEngineCreation", { type: "checkbox" })}
          />
        )}

        <Group justify="end" align="center">
          <Button variant="default" component={Link} href="/manage/integrations">
            {t("common.action.backToOverview")}
          </Button>
          <Button type="submit" loading={isPending}>
            {t("integration.testConnection.action.create")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

interface SecretKindsSegmentedControlProps {
  secretKinds: IntegrationSecretKind[][];
  form: UseFormReturnType<FormType, (values: FormType) => FormType>;
}

const SecretKindsSegmentedControl = ({ secretKinds, form }: SecretKindsSegmentedControlProps) => {
  const t = useScopedI18n("integration.secrets");

  const secretKindGroups = secretKinds.map((kinds) => ({
    label:
      kinds.length === 0
        ? t("noSecretsRequired.segmentTitle")
        : kinds.map((kind) => t(`kind.${kind}.label`)).join(" & "),
    value: kinds.length === 0 ? "empty" : kinds.join("-"),
  }));

  const onChange = useCallback(
    (value: string) => {
      if (value === "empty") {
        form.setFieldValue("secrets", []);
        return;
      }

      const kinds = value.split("-") as IntegrationSecretKind[];
      const secrets = kinds.map((kind) => ({
        kind,
        value: "",
      }));
      form.setFieldValue("secrets", secrets);
    },
    [form],
  );

  return <SegmentedControl fullWidth data={secretKindGroups} onChange={onChange}></SegmentedControl>;
};

type FormType = Omit<z.infer<typeof validation.integration.create>, "kind">;
