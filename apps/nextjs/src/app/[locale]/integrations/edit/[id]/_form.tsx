"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDisclosure } from "@mantine/hooks";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import type { RouterOutputs } from "@homarr/api";
import {
  getSecretKinds,
  integrationSecretKindObject,
} from "@homarr/definitions";
import { useForm, zodResolver } from "@homarr/form";
import {
  ActionIcon,
  Avatar,
  Button,
  Card,
  Collapse,
  Fieldset,
  Group,
  IconEye,
  IconEyeOff,
  Kbd,
  Stack,
  Text,
  TextInput,
} from "@homarr/ui";
import type { z } from "@homarr/validation";
import { v } from "@homarr/validation";

import { api } from "~/trpc/react";
import { integrationSecretIcons } from "../../_secret-icons";
import { IntegrationSecretInput } from "../../_secret-inputs";
import { TestConnection, useTestConnectionDirty } from "../../_test-connection";
import { revalidatePathAction } from "../../new/action";

dayjs.extend(relativeTime);

interface EditIntegrationForm {
  integration: RouterOutputs["integration"]["byId"];
}

export const EditIntegrationForm = ({ integration }: EditIntegrationForm) => {
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
        <TextInput label="Name" {...form.getInputProps("name")} />

        <TextInput label="Url" {...form.getInputProps("url")} />

        <Fieldset legend="Secrets">
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
                  label={`New ${kind}`}
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
              Back to overview
            </Button>
            <Button type="submit" loading={isPending} disabled={isDirty}>
              Update
            </Button>
          </Group>
        </Group>
      </Stack>
    </form>
  );
};

interface SecretCardProps {
  secret: RouterOutputs["integration"]["byId"]["secrets"][number];
  children: React.ReactNode;
  onCancel: () => Promise<boolean>;
}

const SecretCard = ({ secret, children, onCancel }: SecretCardProps) => {
  const { isPublic } = integrationSecretKindObject[secret.kind];
  const [publicSecretDisplayOpened, { toggle: togglePublicSecretDisplay }] =
    useDisclosure(false);
  const [editMode, setEditMode] = useState(false);
  const DisplayIcon = publicSecretDisplayOpened ? IconEye : IconEyeOff;
  const KindIcon = integrationSecretIcons[secret.kind];

  return (
    <Card>
      <Stack>
        <Group justify="space-between">
          <Group>
            <Avatar>
              <KindIcon size={16} />
            </Avatar>
            <Text fw={500}>{secret.kind}</Text>
            {publicSecretDisplayOpened ? <Kbd>{secret.value}</Kbd> : null}
          </Group>
          <Group>
            <Text c="gray.6" size="sm">
              Last updated {dayjs().to(dayjs(secret.updatedAt))}
            </Text>
            {isPublic ? (
              <ActionIcon
                color="gray"
                variant="subtle"
                onClick={togglePublicSecretDisplay}
              >
                <DisplayIcon size={16} stroke={1.5} />
              </ActionIcon>
            ) : null}
            <Button
              variant="default"
              onClick={async () => {
                if (!editMode) {
                  setEditMode(true);
                  return;
                }

                const shouldCancel = await onCancel();
                if (!shouldCancel) return;
                setEditMode(false);
              }}
            >
              {editMode ? "Cancel" : "Edit"}
            </Button>
          </Group>
        </Group>
        <Collapse in={editMode}>{children}</Collapse>
      </Stack>
    </Card>
  );
};

type FormType = Omit<z.infer<typeof v.integration.update>, "id">;
