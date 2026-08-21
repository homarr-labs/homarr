"use client";

import { useCallback, useImperativeHandle, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Anchor, Button, ButtonGroup, Fieldset, Group, Stack, Text, TextInput } from "@mantine/core";
import { IconInfoCircle, IconPencil, IconPlus, IconUnlink } from "@tabler/icons-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { getAllSecretKindOptions, getDefaultSecretKinds, invariantTechnicalLabels } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";
import { useConfirmModal, useModalAction } from "@homarr/modals";
import { AppSelectModal } from "@homarr/modals-collection";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { integrationUpdateSchema } from "@homarr/validation/integration";

import { SecretCard } from "../../_components/secrets/integration-secret-card";
import { IntegrationSecretInput } from "../../_components/secrets/integration-secret-inputs";
import { SecretKindsSegmentedControl } from "../../_components/secrets/integration-secret-segmented-control";
import { IntegrationTestConnectionError } from "../../_components/test-connection/integration-test-connection-error";
import type { AnyMappedTestConnectionError } from "../../_components/test-connection/types";

interface EditIntegrationFormProps {
  integration: RouterOutputs["integration"]["byId"];
  hideButtons?: boolean;
  onSuccess?: () => void;
  formRef?: React.Ref<EditIntegrationFormHandle>;
}

export interface EditIntegrationFormHandle {
  submit: () => Promise<boolean>;
  isDirty: () => boolean;
}

const formSchema = integrationUpdateSchema.omit({ id: true, appId: true }).and(
  z.object({
    app: z
      .object({
        id: z.string(),
        name: z.string(),
        iconUrl: z.string(),
        href: z.string().nullable(),
      })
      .nullable(),
  }),
);

export const EditIntegrationForm = ({
  integration,
  hideButtons = false,
  onSuccess,
  formRef,
}: EditIntegrationFormProps) => {
  const tCommon = useI18n("common");
  const tIntegration = useI18n("integration");
  const { openConfirmModal } = useConfirmModal();
  const allSecretKinds = getAllSecretKindOptions(integration.kind);

  const initialSecretsKinds =
    getAllSecretKindOptions(integration.kind).find((secretKinds) =>
      integration.secrets.every((secret) => secretKinds.includes(secret.kind)),
    ) ?? getDefaultSecretKinds(integration.kind);

  const hasUrlSecret = initialSecretsKinds.includes("url");

  const utils = clientApi.useUtils();
  const router = useRouter();
  const form = useZodForm(formSchema, {
    initialValues: {
      name: integration.name,
      url: integration.url,
      secrets: initialSecretsKinds.map((kind) => ({
        kind,
        value: integration.secrets.find((secret) => secret.kind === kind)?.value ?? "",
      })),
      app: integration.app ?? null,
    },
  });
  const { mutateAsync, isPending } = clientApi.integration.update.useMutation({
    onError() {
      showErrorNotification({
        title: tCommon("notification.update.error"),
        message: tIntegration("page.edit.notification.error.message"),
      });
    },
  });
  const [error, setError] = useState<null | AnyMappedTestConnectionError>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const secretsMap = new Map(integration.secrets.map((secret) => [secret.kind, secret]));

  const handleSubmitAsync = useCallback(
    async ({ app, ...values }: FormType) => {
      setError(null);
      let url: string;
      try {
        url = hasUrlSecret
          ? new URL(values.secrets.find((secret) => secret.kind === "url")?.value ?? values.url).origin
          : values.url;
      } catch {
        showErrorNotification({
          title: tCommon("notification.update.error"),
          message: tIntegration("page.edit.notification.error.message"),
        });
        return false;
      }

      const data = await mutateAsync({
        id: integration.id,
        ...values,
        url,
        secrets: values.secrets.map((secret) => ({
          kind: secret.kind,
          value: secret.value === "" ? null : secret.value,
        })),
        appId: app?.id ?? null,
      });

      // We do it this way as we are unable to send a typesafe error through onError
      if (data?.error) {
        setError(data.error);
        showErrorNotification({
          title: tCommon("notification.update.error"),
          message: tIntegration("page.edit.notification.error.message"),
        });
        requestAnimationFrame(() => errorRef.current?.focus());
        return false;
      }

      showSuccessNotification({
        title: tCommon("notification.update.success"),
        message: tIntegration("page.edit.notification.success.message"),
      });
      void Promise.allSettled([utils.integration.invalidate(), utils.widget.invalidate()]);
      onSuccess?.();
      if (!hideButtons) {
        void revalidatePathActionAsync("/manage/integrations").then(() => router.push("/manage/integrations"));
      }
      return true;
    },
    [
      hasUrlSecret,
      hideButtons,
      integration.id,
      mutateAsync,
      onSuccess,
      router,
      tCommon,
      tIntegration,
      utils.integration,
      utils.widget,
    ],
  );

  useImperativeHandle(
    formRef,
    () => ({
      submit: () =>
        new Promise<boolean>((resolve) => {
          form.onSubmit(
            async (values) => {
              try {
                resolve(await handleSubmitAsync(values));
              } catch {
                resolve(false);
              }
            },
            () => resolve(false),
          )();
        }),
      isDirty: () => form.isDirty(),
    }),
    [form, handleSubmitAsync],
  );

  const isInitialSecretKinds =
    initialSecretsKinds.every((kind) => form.values.secrets.some((secret) => secret.kind === kind)) &&
    form.values.secrets.length === initialSecretsKinds.length;

  const formFields = (
    <Stack>
      <TextInput withAsterisk label={tCommon("field.name")} {...form.getInputProps("name")} />

      {hasUrlSecret ? null : (
        <TextInput withAsterisk label={invariantTechnicalLabels.url} {...form.getInputProps("url")} />
      )}

      <Fieldset legend={tIntegration("secrets.title")}>
        <Stack gap="sm">
          {allSecretKinds.length > 1 && (
            <SecretKindsSegmentedControl defaultKinds={initialSecretsKinds} secretKinds={allSecretKinds} form={form} />
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
                        title: tIntegration("secrets.reset.title"),
                        children: tIntegration("secrets.reset.message"),
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
                    label={tIntegration(`secrets.kind.${secret.kind}.newLabel` as never)}
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
              <Text c={"blue"}>{tIntegration("secrets.noSecretsRequired.text")}</Text>
            </Alert>
          )}
        </Stack>
      </Fieldset>

      <IntegrationLinkApp value={form.values.app} onChange={(app) => form.setFieldValue("app", app)} />

      {error !== null && (
        <div ref={errorRef} role="alert" tabIndex={-1}>
          <IntegrationTestConnectionError error={error} url={form.values.url} />
        </div>
      )}

      {!hideButtons && (
        <Group justify="end" align="center">
          <Button variant="default" component={Link} href="/manage/integrations">
            {tCommon("action.backToOverview")}
          </Button>
          <Button type="submit" loading={isPending}>
            {tIntegration("testConnection.action.edit")}
          </Button>
        </Group>
      )}
    </Stack>
  );

  if (hideButtons) {
    return formFields;
  }

  return <form onSubmit={form.onSubmit(async (values) => await handleSubmitAsync(values))}>{formFields}</form>;
};

type FormType = z.infer<typeof formSchema>;

interface IntegrationAppSelectProps {
  value: FormType["app"];
  onChange: (app: FormType["app"]) => void;
}

const IntegrationLinkApp = ({ value, onChange }: IntegrationAppSelectProps) => {
  const { openModal } = useModalAction(AppSelectModal);
  const tIntegration = useI18n("integration");
  const tCommon = useI18n("common");
  const { data: session } = useSession();
  const canCreateApps = session?.user.permissions.includes("app-create") ?? false;

  const handleChange = () =>
    openModal(
      {
        onSelect: onChange,
        withCreate: canCreateApps,
      },
      {
        title: tIntegration("page.edit.app.action.select"),
      },
    );

  if (!value) {
    return (
      <Button
        variant="subtle"
        color="gray"
        leftSection={<IconPlus size={16} stroke={1.5} />}
        fullWidth
        onClick={handleChange}
      >
        {tIntegration("page.edit.app.action.add")}
      </Button>
    );
  }

  return (
    <Fieldset legend={tIntegration("field.app.sectionTitle")}>
      <Group justify="space-between">
        <Group gap="sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.iconUrl} alt={value.name} width={32} height={32} />
          <Stack gap={0}>
            <Text size="sm" fw="bold">
              {value.name}
            </Text>
            {value.href !== null && (
              <Anchor href={value.href} target="_blank" rel="noopener noreferrer" size="sm">
                {value.href}
              </Anchor>
            )}
          </Stack>
        </Group>
        <ButtonGroup>
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconUnlink size={16} stroke={1.5} />}
            onClick={() => onChange(null)}
          >
            {tIntegration("page.edit.app.action.remove")}
          </Button>
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconPencil size={16} stroke={1.5} />}
            onClick={handleChange}
          >
            {tCommon("action.change")}
          </Button>
        </ButtonGroup>
      </Group>
    </Fieldset>
  );
};
