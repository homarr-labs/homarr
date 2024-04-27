"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Fieldset, Group, Stack, TextInput } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import {
  getAllSecretKindOptions,
  getDefaultSecretKinds,
} from "@homarr/definitions";
import { useForm, zodResolver } from "@homarr/form";
import { useConfirmModal } from "@homarr/modals";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import type { z } from "@homarr/validation";
import { validation } from "@homarr/validation";

import { SecretCard } from "../../_integration-secret-card";
import { IntegrationSecretInput } from "../../_integration-secret-inputs";
import {
  TestConnection,
  TestConnectionNoticeAlert,
  useTestConnectionDirty,
} from "../../_integration-test-connection";
import { revalidatePathAction } from "../../../../../revalidatePathAction";

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
  const initialFormValues = {
    name: integration.name,
    url: integration.url,
    secrets: secretsKinds.map((kind) => ({
      kind,
      value:
        integration.secrets.find((secret) => secret.kind === kind)?.value ?? "",
    })),
  };
  const { isDirty, onValuesChange, removeDirty } = useTestConnectionDirty({
    defaultDirty: true,
    initialFormValue: initialFormValues,
  });

  const router = useRouter();
  const form = useForm<FormType>({
    initialValues: initialFormValues,
    validate: zodResolver(validation.integration.update.omit({ id: true })),
    onValuesChange,
  });
  const { mutateAsync, isPending } = clientApi.integration.update.useMutation();

  const secretsMap = new Map(
    integration.secrets.map((secret) => [secret.kind, secret]),
  );

  const handleSubmit = async (values: FormType) => {
    if (isDirty) return;
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
          void revalidatePathAction("/integrations").then(() =>
            router.push("/integrations"),
          );
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

  return (
    <form onSubmit={form.onSubmit((values) => void handleSubmit(values))}>
      <Stack>
        <TestConnectionNoticeAlert />

        <TextInput
          label={t("integration.field.name.label")}
          {...form.getInputProps("name")}
        />

        <TextInput
          label={t("integration.field.url.label")}
          {...form.getInputProps("url")}
        />

        <Fieldset legend={t("integration.secrets.title")}>
          <Stack gap="sm">
            {secretsKinds.map((kind, index) => (
              <SecretCard
                key={kind}
                secret={secretsMap.get(kind)!}
                onCancel={() =>
                  new Promise((res) => {
                    // When nothing changed, just close the secret card
                    if (
                      (form.values.secrets[index]?.value ?? "") ===
                      (secretsMap.get(kind)?.value ?? "")
                    ) {
                      return res(true);
                    }
                    openConfirmModal({
                      title: t("integration.secrets.reset.title"),
                      children: t("integration.secrets.reset.message"),
                      onCancel: () => res(false),
                      onConfirm: () => {
                        form.setFieldValue(
                          `secrets.${index}.value`,
                          secretsMap.get(kind)!.value ?? "",
                        );
                        res(true);
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

        <Group justify="space-between" align="center">
          <TestConnection
            isDirty={isDirty}
            removeDirty={removeDirty}
            integration={{
              id: integration.id,
              kind: integration.kind,
              ...form.values,
            }}
          />
          <Group>
            <Button variant="default" component={Link} href="/integrations">
              {t("common.action.backToOverview")}
            </Button>
            <Button type="submit" loading={isPending} disabled={isDirty}>
              {t("common.action.save")}
            </Button>
          </Group>
        </Group>
      </Stack>
    </form>
  );
};

type FormType = Omit<z.infer<typeof validation.integration.update>, "id">;
