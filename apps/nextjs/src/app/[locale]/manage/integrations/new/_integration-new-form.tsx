"use client";

import { startTransition, useState } from "react";
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
import type { IntegrationKind } from "@homarr/definitions";
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
import { useI18n } from "@homarr/translation/client";
import { appHrefSchema } from "@homarr/validation/app";
import { integrationCreateSchema } from "@homarr/validation/integration";

import { IntegrationAppSelect } from "../_components/app/app-select";
import { IntegrationSecretInput } from "../_components/secrets/integration-secret-inputs";
import { SecretKindsSegmentedControl } from "../_components/secrets/integration-secret-segmented-control";
import { IntegrationTestConnectionError } from "../_components/test-connection/integration-test-connection-error";
import type { AnyMappedTestConnectionError } from "../_components/test-connection/types";

interface NewIntegrationFormProps {
  searchParams: Partial<z.infer<typeof integrationCreateSchema>> & {
    kind: IntegrationKind;
  };
}

const formSchema = integrationCreateSchema.omit({ kind: true, app: true }).and(
  z.object({
    hasApp: z.boolean(),
    appHref: appHrefSchema,
    appId: z.string().nullable(),
  }),
);

export const NewIntegrationForm = ({ searchParams }: NewIntegrationFormProps) => {
  const t = useI18n();
  const secretKinds = getAllSecretKindOptions(searchParams.kind);
  const hasUrlSecret = secretKinds.some((kinds) => kinds.includes("url"));
  const router = useRouter();

  let url = searchParams.url ?? getIntegrationDefaultUrl(searchParams.kind) ?? "";
  if (hasUrlSecret) {
    // Placeholder Url, replaced with origin of the secret Url on submit
    url = "http://localhost";
  }
  const form = useZodForm(formSchema, {
    initialValues: {
      name: searchParams.name ?? getIntegrationName(searchParams.kind),
      url,
      secrets: secretKinds[0].map((kind) => ({
        kind,
        value: "",
      })),
      attemptSearchEngineCreation: true,
      hasApp: false,
      appHref: url,
      appId: null,
    },
  });

  const { mutateAsync: createIntegrationAsync, isPending } = clientApi.integration.create.useMutation();
  const [error, setError] = useState<null | AnyMappedTestConnectionError>(null);

  const handleSubmitAsync = async ({ appId, appHref, hasApp, ...values }: FormType) => {
    const url = hasUrlSecret
      ? new URL(values.secrets.find((secret) => secret.kind === "url")?.value ?? values.url).origin
      : values.url;

    const hasCustomHref = appHref !== null && appHref.trim().length >= 1;

    const app = hasApp
      ? appId !== null
        ? { id: appId }
        : {
            name: values.name,
            href: hasCustomHref ? appHref : url,
            iconUrl: getIconUrl(searchParams.kind),
            description: null,
            pingUrl: url,
          }
      : undefined;

    await createIntegrationAsync(
      {
        kind: searchParams.kind,
        ...values,
        url,
        app,
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

          await revalidatePathActionAsync("/manage/integrations").then(() => router.push("/manage/integrations"));
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

        {hasUrlSecret ? null : (
          <TextInput withAsterisk label={t("integration.field.url.label")} {...form.getInputProps("url")} />
        )}

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

        <AppForm form={form} />

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

type FormType = z.infer<typeof formSchema>;

const AppForm = ({ form }: { form: UseFormReturnType<FormType> }) => {
  const t = useI18n();
  const checkboxInputProps = form.getInputProps("hasApp", { type: "checkbox" });

  return (
    <>
      <Checkbox
        {...checkboxInputProps}
        onChange={(event) => {
          startTransition(() => {
            form.setFieldValue("appHref", event.currentTarget.checked ? form.values.url : null);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            checkboxInputProps.onChange(event);
          });
        }}
        label={t("integration.field.createApp.label")}
        description={t("integration.field.createApp.description")}
      />

      <Collapse in={form.values.hasApp}>
        <Fieldset legend="Linked App">
          <Stack gap="sm">
            <SegmentedControl
              data={["New", "Existing"]}
              value={form.values.appHref === null ? "Existing" : "New"}
              onChange={(value) => {
                if (value === "Existing") {
                  form.setFieldValue("appId", null);
                  form.setFieldValue("appHref", null);
                } else {
                  form.setFieldValue("appId", null);
                  form.setFieldValue("appHref", form.values.url);
                }
              }}
            />

            {typeof form.values.appHref === "string" ? (
              <TextInput
                placeholder={t("integration.field.appHref.placeholder")}
                withAsterisk
                label="App url"
                description="The url the app will open when accessed from the dashboard"
                {...form.getInputProps("appHref")}
              />
            ) : (
              <IntegrationAppSelect {...form.getInputProps("appId")} />
            )}
          </Stack>
        </Fieldset>
      </Collapse>
    </>
  );
};
