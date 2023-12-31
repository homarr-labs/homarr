"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDisclosure } from "@mantine/hooks";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import type { RouterOutputs } from "@homarr/api";
import {
  getSecretSorts,
  IntegrationSecretSort,
  integrationSecretSortObject,
} from "@homarr/db/schema/items";
import { useForm, zodResolver } from "@homarr/form";
import {
  ActionIcon,
  ActionIconGroup,
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
import { ServiceSelect } from "../../new/_form";
import { revalidatePathAction } from "../../new/action";

dayjs.extend(relativeTime);

interface EditIntegrationForm {
  integration: RouterOutputs["integration"]["byId"];
  serviceData: { value: string; label: string; url: string }[];
}

export const EditIntegrationForm = ({
  serviceData,
  integration,
}: EditIntegrationForm) => {
  const secretsSorts = getSecretSorts(integration.sort);
  const router = useRouter();
  const form = useForm<FormType>({
    initialValues: {
      name: integration.name,
      serviceId: integration.service.id,
      secrets: secretsSorts.map((sort) => ({
        sort,
        value: integration.secrets.find((s) => s.sort === sort)?.value ?? "",
      })),
    },
    validate: zodResolver(v.integration.update.omit({ id: true, sort: true })),
  });
  const { mutateAsync, isPending } = api.integration.update.useMutation();

  const secretsMap = new Map(integration.secrets.map((s) => [s.sort, s]));

  const handleSubmit = async (values: FormType) => {
    await mutateAsync({
      id: integration.id,
      ...values,
      secrets: values.secrets.map((s) => ({
        sort: s.sort,
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

        <ServiceSelect
          data={serviceData}
          callbackUrl={createCallbackUrl(form.values)}
          {...form.getInputProps("serviceId")}
        />

        <Fieldset legend="Secrets">
          <Stack gap="sm">
            {secretsSorts.map((sort, index) => (
              <SecretCard
                key={sort}
                secret={secretsMap.get(sort)!}
                onCancel={() => {
                  // TODO: Add confirm dialog
                  form.setFieldValue(
                    `secrets.${index}.value`,
                    secretsMap.get(sort)!.value ?? "",
                  );
                  return Promise.resolve(true);
                }}
              >
                <IntegrationSecretInput
                  label={`New ${sort}`}
                  key={sort}
                  sort={sort}
                  {...form.getInputProps(`secrets.${index}.value`)}
                />
              </SecretCard>
            ))}
          </Stack>
        </Fieldset>

        <Group justify="flex-end">
          <Button variant="default" component={Link} href="/integrations">
            Back to overview
          </Button>
          <Button type="submit" loading={isPending}>
            Update
          </Button>
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
  const { isPublic } = integrationSecretSortObject[secret.sort];
  const [publicSecretDisplayOpened, { toggle: togglePublicSecretDisplay }] =
    useDisclosure(false);
  const [editMode, setEditMode] = useState(false);
  const DisplayIcon = publicSecretDisplayOpened ? IconEye : IconEyeOff;
  const SortIcon = integrationSecretIcons[secret.sort];

  return (
    <Card>
      <Stack>
        <Group justify="space-between">
          <Group>
            <Avatar>
              <SortIcon size={16} />
            </Avatar>
            <Text fw={500}>{secret.sort}</Text>
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

/*

<IntegrationSecretInput
                key={sort}
                sort={sort}
                {...form.getInputProps(`secrets.${index}.value`)}
              />

              */

const createCallbackUrl = (values: { name: string }) => {
  if (typeof window === "undefined") {
    return "";
  }

  const callbackUrl = new URL(window.location.href);
  callbackUrl.searchParams.set("name", values.name);
  callbackUrl.searchParams.set("serviceId", "%s");

  return callbackUrl.toString();
};

type FormType = Omit<z.infer<typeof v.integration.update>, "id">;
