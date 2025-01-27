"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Fieldset, Group, Stack, TextInput } from "@mantine/core";
import type { z } from "zod";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { getAllSecretKindOptions, getDefaultSecretKinds } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";
import { convertIntegrationTestConnectionError } from "@homarr/integrations/client";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { validation } from "@homarr/validation";

import { SecretCard } from "../../_components/secrets/integration-secret-card";
import { IntegrationSecretInput } from "../../_components/secrets/integration-secret-inputs";

interface EditIntegrationForm {
  integration: RouterOutputs["integration"]["byId"];
}

export const EditIntegrationForm = ({ integration }: EditIntegrationForm) => {
  const t = useI18n();
  const { openConfirmModal } = useConfirmModal();
  const secretsKinds =
    getAllSecretKindOptions(integration.kind).find((secretKinds) =>
      integration.secrets.every((secret) => secretKinds.includes(secret.kind)),
    ) ?? getDefaultSecretKinds(integration.kind);

  const router = useRouter();
  const form = useZodForm(validation.integration.update.omit({ id: true }), {
    initialValues: {
      name: integration.name,
      url: integration.url,
      secrets: secretsKinds.map((kind) => ({
        kind,
        value: integration.secrets.find((secret) => secret.kind === kind)?.value ?? "",
      })),
    },
  });
  const { mutateAsync, isPending } = clientApi.integration.update.useMutation();

  const secretsMap = new Map(integration.secrets.map((secret) => [secret.kind, secret]));

  const handleSubmitAsync = async (values: FormType) => {
    await mutateAsync(
      {
        id: integration.id,
        ...values,
        secrets: values.secrets.map((secret) => ({
          kind: secret.kind,
          value: secret.value === "" ? null : secret.value,
        })),
      },
      {
        onSuccess: () => {
          showSuccessNotification({
            title: t("integration.page.edit.notification.success.title"),
            message: t("integration.page.edit.notification.success.message"),
          });
          void revalidatePathActionAsync("/manage/integrations").then(() => router.push("/manage/integrations"));
        },
        onError: (error) => {
          const testConnectionError = convertIntegrationTestConnectionError(error.data?.error);

          if (testConnectionError) {
            showErrorNotification({
              title: t(`integration.testConnection.notification.${testConnectionError.key}.title`),
              message:
                testConnectionError.message ??
                t(`integration.testConnection.notification.${testConnectionError.key}.message`),
            });
            return;
          }

          showErrorNotification({
            title: t("integration.page.edit.notification.error.title"),
            message: t("integration.page.edit.notification.error.message"),
          });
        },
      },
    );
  };

  return (
    <form onSubmit={form.onSubmit((values) => void handleSubmitAsync(values))}>
      <Stack>
        <TextInput withAsterisk label={t("integration.field.name.label")} {...form.getInputProps("name")} />

        <TextInput withAsterisk label={t("integration.field.url.label")} {...form.getInputProps("url")} />

        <Fieldset legend={t("integration.secrets.title")}>
          <Stack gap="sm">
            {secretsKinds.map((kind, index) => (
              <SecretCard
                key={kind}
                secret={secretsMap.get(kind) ?? { kind, value: null, updatedAt: null }}
                onCancel={() =>
                  new Promise((resolve) => {
                    // When nothing changed, just close the secret card
                    if ((form.values.secrets[index]?.value ?? "") === (secretsMap.get(kind)?.value ?? "")) {
                      return resolve(true);
                    }
                    openConfirmModal({
                      title: t("integration.secrets.reset.title"),
                      children: t("integration.secrets.reset.message"),
                      onCancel: () => resolve(false),
                      onConfirm: () => {
                        form.setFieldValue(`secrets.${index}.value`, secretsMap.get(kind)?.value ?? "");
                        resolve(true);
                      },
                    });
                  })
                }
              >
                <IntegrationSecretInput
                  label={t(`integration.secrets.kind.${kind}.newLabel`)}
                  key={kind}
                  kind={kind}
                  {...form.getInputProps(`secrets.${index}.value`)}
                />
              </SecretCard>
            ))}
          </Stack>
        </Fieldset>

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

type FormType = Omit<z.infer<typeof validation.integration.update>, "id">;
