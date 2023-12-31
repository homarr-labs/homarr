"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { IntegrationKind } from "@homarr/db/schema/items";
import { getSecretKinds } from "@homarr/db/schema/items";
import { useForm, zodResolver } from "@homarr/form";
import { Button, Fieldset, Group, Stack, TextInput } from "@homarr/ui";
import type { z } from "@homarr/validation";
import { v } from "@homarr/validation";

import { api } from "~/trpc/react";
import { IntegrationSecretInput } from "../_secret-inputs";
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
  const router = useRouter();
  const form = useForm<FormType>({
    initialValues: {
      name: searchParams.name ?? "",
      url: searchParams.url ?? "",
      secrets: secretKinds.map((kind) => ({
        kind,
        value: "",
      })),
    },
    validate: zodResolver(v.integration.create.omit({ kind: true })),
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

        <Group justify="flex-end">
          <Button variant="default" component={Link} href="/integrations">
            Back to overview
          </Button>
          <Button type="submit" loading={isPending}>
            Create
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

type FormType = Omit<z.infer<typeof v.integration.create>, "kind">;
