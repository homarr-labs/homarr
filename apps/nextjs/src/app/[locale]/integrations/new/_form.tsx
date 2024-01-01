"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { IntegrationKind } from "@homarr/definitions";
import { getSecretKinds } from "@homarr/definitions";
import { useForm, zodResolver } from "@homarr/form";
import { Button, Fieldset, Group, Stack, TextInput } from "@homarr/ui";
import type { z } from "@homarr/validation";
import { v } from "@homarr/validation";

import { api } from "~/trpc/react";
import { IntegrationSecretInput } from "../_secret-inputs";
import { TestConnection, useTestConnectionDirty } from "../_test-connection";
import { revalidatePathAction } from "./action";

interface NewIntegrationFormProps {
  searchParams: Partial<z.infer<typeof v.integration.create>> & {
    kind: IntegrationKind;
  };
}

export const NewIntegrationForm = ({
  searchParams,
}: NewIntegrationFormProps) => {
  const secretKinds = getSecretKinds(searchParams.kind);
  const initialFormValues = {
    name: searchParams.name ?? "",
    url: searchParams.url ?? "",
    secrets: secretKinds.map((kind) => ({
      kind,
      value: "",
    })),
  };
  const { isDirty, onValuesChange, removeDirty } = useTestConnectionDirty({
    defaultDirty: true,
    initialFormValue: initialFormValues,
  });
  const router = useRouter();
  const form = useForm<FormType>({
    initialValues: initialFormValues,
    validate: zodResolver(v.integration.create.omit({ kind: true })),
    onValuesChange,
  });
  const { mutateAsync, isPending } = api.integration.create.useMutation();

  const handleSubmit = async (values: FormType) => {
    await mutateAsync({
      kind: searchParams.kind,
      ...values,
    });
    await revalidatePathAction("/integrations");
    router.push("/integrations");
  };

  return (
    <form onSubmit={form.onSubmit((v) => void handleSubmit(v))}>
      <Stack>
        <TextInput label="Name" {...form.getInputProps("name")} />

        <TextInput label="Url" {...form.getInputProps("url")} />

        <Fieldset legend="Secrets">
          <Stack gap="sm">
            {secretKinds.map((kind, index) => (
              <IntegrationSecretInput
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
            <Button variant="default" component={Link} href="/integrations">
              Back to overview
            </Button>
            <Button type="submit" loading={isPending}>
              Create
            </Button>
          </Group>
        </Group>
      </Stack>
    </form>
  );
};

type FormType = Omit<z.infer<typeof v.integration.create>, "kind">;
