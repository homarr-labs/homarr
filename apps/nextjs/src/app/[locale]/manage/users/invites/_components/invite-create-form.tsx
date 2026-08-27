"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Anchor, Button, CopyButton, Group, Mark, Stack, Text } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import dayjs from "dayjs";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { invariantTechnicalLabels } from "@homarr/definitions";
import { useForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";

type FormType = {
  expirationDate: string;
};

type CreatedInvite = RouterOutputs["invite"]["createInvite"];

interface InviteCreateFormProps {
  onClose: () => void;
}

export const InviteCreateForm = ({ onClose }: InviteCreateFormProps) => {
  const tInvite = useI18n("management.page.user.invite");
  const tCommon = useI18n("common");
  const [createdInvite, setCreatedInvite] = useState<CreatedInvite>();
  const utils = clientApi.useUtils();
  const { mutate, isPending } = clientApi.invite.createInvite.useMutation();
  const minDate = dayjs().add(1, "hour").toDate();
  const maxDate = dayjs().add(6, "months").toDate();
  const form = useForm<FormType>({
    initialValues: {
      expirationDate: dayjs().add(4, "hours").toDate().toISOString(),
    },
  });

  if (createdInvite) {
    return <CreatedInviteDetails invite={createdInvite} onClose={onClose} />;
  }

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        mutate(
          {
            expirationDate: new Date(values.expirationDate),
          },
          {
            onSuccess: (result) => {
              void utils.invite.getAll.invalidate();
              setCreatedInvite(result);
            },
          },
        );
      })}
    >
      <Stack>
        <Text>{tInvite("action.new.description")}</Text>
        <DateTimePicker
          popoverProps={{ withinPortal: true }}
          minDate={minDate}
          maxDate={maxDate}
          withAsterisk
          valueFormat="DD MMM YYYY HH:mm"
          label={tInvite("field.expirationDate.label")}
          variant="filled"
          {...form.getInputProps("expirationDate")}
        />
        <Group justify="end" wrap="wrap">
          <Button variant="default" onClick={onClose}>
            {tCommon("action.cancel")}
          </Button>
          <Button type="submit" loading={isPending}>
            {tCommon("action.create")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

const CreatedInviteDetails = ({ invite, onClose }: { invite: CreatedInvite; onClose: () => void }) => {
  const tInvite = useI18n("management.page.user.invite");
  const tCommon = useI18n("common");
  const inviteUrl = createInviteUrl(invite);

  return (
    <Stack component="output" aria-live="polite">
      <Text>
        {tInvite.rich("action.copy.description", {
          b: bold,
        })}
      </Text>
      <Stack gap="xs">
        <Text fw="bold">{tInvite("action.copy.link")}:</Text>
        <Mark style={{ borderRadius: 4, overflowWrap: "anywhere" }} color="gray" px={5}>
          <Anchor href={inviteUrl} target="_blank" rel="noreferrer">
            {inviteUrl}
          </Anchor>
        </Mark>
        <Text fw="bold">{invariantTechnicalLabels.id}:</Text>
        <Mark style={{ borderRadius: 4, overflowWrap: "anywhere" }} color="gray" px={5}>
          {invite.id}
        </Mark>
        <Text fw="bold">{tInvite("field.token.label")}:</Text>
        <Mark style={{ borderRadius: 4, overflowWrap: "anywhere" }} color="gray" px={5}>
          {invite.token}
        </Mark>
      </Stack>
      <Group justify="end" wrap="wrap">
        <Button variant="default" onClick={onClose}>
          {tCommon("action.close")}
        </Button>
        <CopyButton value={inviteUrl}>
          {({ copy }) => (
            <Button
              onClick={() => {
                copy();
                onClose();
              }}
            >
              {tInvite("action.copy.button")}
            </Button>
          )}
        </CopyButton>
      </Group>
    </Stack>
  );
};

const bold = (children: ReactNode) => <b>{children}</b>;

const createInviteUrl = ({ id, token }: CreatedInvite) => {
  const path = `/auth/invite/${id}?token=${token}`;
  return new URL(path, window.location.origin).toString();
};
