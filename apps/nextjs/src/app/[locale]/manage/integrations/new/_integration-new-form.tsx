"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Checkbox,
  Collapse,
  Fieldset,
  Group,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import type { IntegrationKind, IntegrationSecretKind } from "@homarr/definitions";
import {
  getAllSecretKindOptions,
  getIconUrl,
  getIntegrationDefaultUrl,
  getIntegrationName,
  integrationDefs,
} from "@homarr/definitions";
import type { UseFormReturnType } from "@homarr/form";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import { appHrefSchema } from "@homarr/validation/app";
import { integrationCreateSchema } from "@homarr/validation/integration";

import { IntegrationSecretInput } from "../_components/secrets/integration-secret-inputs";
import { IntegrationTestConnectionError } from "../_components/test-connection/integration-test-connection-error";
import type { AnyMappedTestConnectionError } from "../_components/test-connection/types";

interface NewIntegrationFormProps {
  searchParams: Partial<z.infer<typeof integrationCreateSchema>> & {
    kind: IntegrationKind;
  };
}

const formSchema = integrationCreateSchema.omit({ kind: true }).and(
  z.object({
    createApp: z.boolean(),
    appHref: appHrefSchema,
  }),
);

export const NewIntegrationForm = ({ searchParams }: NewIntegrationFormProps) => {
  const t = useI18n();
  const secretKinds = getAllSecretKindOptions(searchParams.kind);
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  const form = useZodForm(formSchema, {
    initialValues: {
      name: searchParams.name ?? getIntegrationName(searchParams.kind),
      url: searchParams.url ?? getIntegrationDefaultUrl(searchParams.kind) ?? "",
      secrets: secretKinds[0].map((kind) => ({
        kind,
        value: "",
      })),
      attemptSearchEngineCreation: true,
      createApp: false,
      appHref: "",
    },
    onValuesChange(values, previous) {
      if (values.createApp !== previous.createApp) {
        setOpened(values.createApp);
      }
    },
  });

  const { mutateAsync: createIntegrationAsync, isPending: isPendingIntegration } =
    clientApi.integration.create.useMutation();
  const { mutateAsync: createAppAsync, isPending: isPendingApp } = clientApi.app.create.useMutation();
  const isPending = isPendingIntegration || isPendingApp;
  const [error, setError] = useState<null | AnyMappedTestConnectionError>(null);

  const handleSubmitAsync = async (values: FormType) => {
    await createIntegrationAsync(
      {
        kind: searchParams.kind,
        ...values,
      },
      {
        async onSuccess(data) {
          // We do it this way as we are unable to send a typesafe error through onError
          if (data?.error) {
            setError(data.error);
            showErrorNotification({
              title: t("integration.page.create.notification.error.title"),
              message: t("integration.page.create.notification.error.message"),
            });
            return;
          }

          showSuccessNotification({
            title: t("integration.page.create.notification.success.title"),
            message: t("integration.page.create.notification.success.message"),
          });

          if (!values.createApp) {
            await revalidatePathActionAsync("/manage/integrations").then(() => router.push("/manage/integrations"));
            return;
          }

          const hasCustomHref = values.appHref !== null && values.appHref.trim().length >= 1;
          await createAppAsync(
            {
              name: values.name,
              href: hasCustomHref ? values.appHref : values.url,
              iconUrl: getIconUrl(searchParams.kind),
              description: null,
              pingUrl: values.url,
            },
            {
              async onSettled() {
                await revalidatePathActionAsync("/manage/integrations").then(() => router.push("/manage/integrations"));
              },
              onError() {
                showErrorNotification({
                  title: t("app.page.create.notification.error.title"),
                  message: t("app.page.create.notification.error.message"),
                });
              },
            },
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

        {error !== null && <IntegrationTestConnectionError error={error} url={form.values.url} />}

        {supportsSearchEngine && (
          <Checkbox
            label={t("integration.field.attemptSearchEngineCreation.label")}
            description={t("integration.field.attemptSearchEngineCreation.description", {
              kind: getIntegrationName(searchParams.kind),
            })}
            {...form.getInputProps("attemptSearchEngineCreation", { type: "checkbox" })}
          />
        )}

        <Checkbox
          {...form.getInputProps("createApp", { type: "checkbox" })}
          label={t("integration.field.createApp.label")}
          description={t("integration.field.createApp.description")}
        />

        <Collapse in={opened}>
          <TextInput placeholder={t("integration.field.appHref.placeholder")} {...form.getInputProps("appHref")} />
        </Collapse>

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

type FormType = z.infer<typeof formSchema>;
