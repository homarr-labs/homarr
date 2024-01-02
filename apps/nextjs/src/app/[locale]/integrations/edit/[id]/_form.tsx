"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { RouterOutputs } from "@homarr/api";
import { getSecretKinds } from "@homarr/definitions";
import { useForm, zodResolver } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import { Button, Fieldset, Group, Stack, TextInput } from "@homarr/ui";
import type { z } from "@homarr/validation";
import { v } from "@homarr/validation";

import { api } from "~/trpc/react";
import { SecretCard } from "../../_secret-card";
import { IntegrationSecretInput } from "../../_secret-inputs";
import { TestConnection, useTestConnectionDirty } from "../../_test-connection";
import { revalidatePathAction } from "../../new/action";

interface EditIntegrationForm {
  integration: RouterOutputs["integration"]["byId"];
}

export const EditIntegrationForm = ({ integration }: EditIntegrationForm) => {
  const t = useI18n();
  const secretsKinds = getSecretKinds(integration.kind);
  const initialFormValues = {
    name: integration.name,
    url: integration.url,
    secrets: secretsKinds.map((kind) => ({
      kind,
      value: integration.secrets.find((s) => s.kind === kind)?.value ?? "",
    })),
  };
  const { isDirty, onValuesChange, removeDirty } = useTestConnectionDirty({
    defaultDirty: false,
    initialFormValue: initialFormValues,
  });

  const router = useRouter();
  const form = useForm<FormType>({
    initialValues: initialFormValues,
    validate: zodResolver(v.integration.update.omit({ id: true, kind: true })),
    onValuesChange,
  });
  const { mutateAsync, isPending } = api.integration.update.useMutation();

  const secretsMap = new Map(integration.secrets.map((s) => [s.kind, s]));

  const handleSubmit = async (values: FormType) => {
    await mutateAsync({
      id: integration.id,
      ...values,
      secrets: values.secrets.map((s) => ({
        kind: s.kind,
        value: s.value === "" ? null : s.value,
      })),
    });
    await revalidatePathAction("/integrations");
    router.push("/integrations");
  };

  return (
    <form onSubmit={form.onSubmit((v) => void handleSubmit(v))}>
      <Stack>
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
                onCancel={() => {
                  // TODO: Add confirm dialog
                  form.setFieldValue(
                    `secrets.${index}.value`,
                    secretsMap.get(kind)!.value ?? "",
                  );
                  return Promise.resolve(true);
                }}
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

type FormType = Omit<z.infer<typeof v.integration.update>, "id">;
