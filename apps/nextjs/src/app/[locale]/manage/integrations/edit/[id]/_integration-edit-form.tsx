"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Fieldset, Group, Stack, Text, TextInput } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { getAllSecretKindOptions, getDefaultSecretKinds } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { integrationUpdateSchema } from "@homarr/validation/integration";

import { SecretCard } from "../../_components/secrets/integration-secret-card";
import { IntegrationSecretInput } from "../../_components/secrets/integration-secret-inputs";
import { SecretKindsSegmentedControl } from "../../_components/secrets/integration-secret-segmented-control";
import { IntegrationTestConnectionError } from "../../_components/test-connection/integration-test-connection-error";
import type { AnyMappedTestConnectionError } from "../../_components/test-connection/types";

interface EditIntegrationForm {
  integration: RouterOutputs["integration"]["byId"];
}

export const EditIntegrationForm = ({ integration }: EditIntegrationForm) => {
  const t = useI18n();
  const { openConfirmModal } = useConfirmModal();
  const allSecretKinds = getAllSecretKindOptions(integration.kind);

  const initialSecretsKinds =
    getAllSecretKindOptions(integration.kind).find((secretKinds) =>
      integration.secrets.every((secret) => secretKinds.includes(secret.kind)),
    ) ?? getDefaultSecretKinds(integration.kind);

  const hasUrlSecret = initialSecretsKinds.includes("url");

  const router = useRouter();
  const form = useZodForm(integrationUpdateSchema.omit({ id: true }), {
    initialValues: {
      name: integration.name,
      url: integration.url,
      secrets: initialSecretsKinds.map((kind) => ({
        kind,
        value: integration.secrets.find((secret) => secret.kind === kind)?.value ?? "",
      })),
    },
  });
  const { mutateAsync, isPending } = clientApi.integration.update.useMutation();
  const [error, setError] = useState<null | AnyMappedTestConnectionError>(null);

  const secretsMap = new Map(integration.secrets.map((secret) => [secret.kind, secret]));

  const handleSubmitAsync = async (values: FormType) => {
    const url = hasUrlSecret
      ? new URL(values.secrets.find((secret) => secret.kind === "url")?.value ?? values.url).origin
      : values.url;
    await mutateAsync(
      {
        id: integration.id,
        ...values,
        url,
        secrets: values.secrets.map((secret) => ({
          kind: secret.kind,
          value: secret.value === "" ? null : secret.value,
        })),
      },
      {
        onSuccess: (data) => {
          // We do it this way as we are unable to send a typesafe error through onError
          if (data?.error) {
            setError(data.error);
            showErrorNotification({
              title: t("integration.page.edit.notification.error.title"),
              message: t("integration.page.edit.notification.error.message"),
            });
            return;
          }

          showSuccessNotification({
            title: t("integration.page.edit.notification.success.title"),
            message: t("integration.page.edit.notification.success.message"),
          });
          void revalidatePathActionAsync("/manage/integrations").then(() => router.push("/manage/integrations"));
        },
        onError: () => {
          showErrorNotification({
            title: t("integration.page.edit.notification.error.title"),
            message: t("integration.page.edit.notification.error.message"),
          });
        },
      },
    );
  };

  const isInitialSecretKinds =
    initialSecretsKinds.every((kind) => form.values.secrets.some((secret) => secret.kind === kind)) &&
    form.values.secrets.length === initialSecretsKinds.length;

  return (
    <form onSubmit={form.onSubmit((values) => void handleSubmitAsync(values))}>
      <Stack>
        <TextInput withAsterisk label={t("integration.field.name.label")} {...form.getInputProps("name")} />

        {hasUrlSecret ? null : (
          <TextInput withAsterisk label={t("integration.field.url.label")} {...form.getInputProps("url")} />
        )}

        <Fieldset legend={t("integration.secrets.title")}>
          <Stack gap="sm">
            {allSecretKinds.length > 1 && (
              <SecretKindsSegmentedControl
                defaultKinds={initialSecretsKinds}
                secretKinds={allSecretKinds}
                form={form}
              />
            )}
            {!isInitialSecretKinds
              ? null
              : form.values.secrets.map((secret, index) => (
                  <SecretCard
                    key={secret.kind}
                    secret={secretsMap.get(secret.kind) ?? { kind: secret.kind, value: null, updatedAt: null }}
                    onCancel={() =>
                      new Promise((resolve) => {
                        // When nothing changed, just close the secret card
                        if ((secret.value ?? "") === (secretsMap.get(secret.kind)?.value ?? "")) {
                          return resolve(true);
                        }
                        openConfirmModal({
                          title: t("integration.secrets.reset.title"),
                          children: t("integration.secrets.reset.message"),
                          onCancel: () => resolve(false),
                          onConfirm: () => {
                            form.setFieldValue(`secrets.${index}.value`, secretsMap.get(secret.kind)?.value ?? "");
                            resolve(true);
                          },
                        });
                      })
                    }
                  >
                    <IntegrationSecretInput
                      label={t(`integration.secrets.kind.${secret.kind}.newLabel`)}
                      key={secret.kind}
                      kind={secret.kind}
                      {...form.getInputProps(`secrets.${index}.value`)}
                    />
                  </SecretCard>
                ))}
            {isInitialSecretKinds
              ? null
              : form.values.secrets.map(({ kind }, index) => (
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

        {error !== null && <IntegrationTestConnectionError error={error} url={form.values.url} />}

        <Group justify="end" align="center">
          <Button variant="default" component={Link} href="/manage/integrations">
            {t("common.action.backToOverview")}
          </Button>
          <Button type="submit" loading={isPending}>
            {t("integration.testConnection.action.edit")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

type FormType = Omit<z.infer<typeof integrationUpdateSchema>, "id">;
