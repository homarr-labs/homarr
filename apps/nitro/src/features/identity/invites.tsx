import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import { Button, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod/v4";
import { useFormatter, useI18n } from "@homarr/translation/client";

import { InlineConfirmActionIcon } from "../../../../../packages/ui/src/components/inline-confirm-action";
import { CreatedInviteView, InviteListView } from "../../source-ui/users/invites";
import type { CreatedInvite } from "./client";
import { useIdentity, useIdentityKey } from "./boundary";
import { useIdentityAction } from "./feedback";
import {
  UserActionFeedbackView as ActionFeedback,
  UserUnavailableView as IdentityDenied,
  UserRequestErrorView as IdentityError,
  UserUnavailableView,
} from "../../source-ui/users/user-detail";

export interface InviteExpirationPickerProps {
  value: string;
  onChange: (value: string) => void;
  min: string;
  max: string;
  disabled: boolean;
}

export interface InviteAdministrationProps {
  initiallyCreateOpen?: boolean;
  onCloseCreate?: () => void;
  mutationUnavailableReason?: string;
  renderExpirationPicker?: (props: InviteExpirationPickerProps) => ReactNode;
}

export function InviteAdministration({
  initiallyCreateOpen = false,
  onCloseCreate,
  mutationUnavailableReason,
  renderExpirationPicker,
}: InviteAdministrationProps = {}) {
  const tInvite = useI18n("management.page.user.invite");
  const { client, principal, enabledProviders, demo } = useIdentity();
  const key = useIdentityKey();
  const [opened, setOpened] = useState(initiallyCreateOpen);
  const [formKey, setFormKey] = useState(0);
  const [creationPending, setCreationPending] = useState(false);
  const creationPendingRef = useRef(false);
  const onCreationPendingChange = useCallback((pending: boolean) => {
    creationPendingRef.current = pending;
    setCreationPending(pending);
  }, []);
  const permitted = principal.user.permissions.includes("admin") && enabledProviders.includes("credentials");
  const query = useQuery({
    queryKey: [...key, "invites"],
    queryFn: ({ signal }) => client.invite.getAll(undefined, { signal }),
    enabled: permitted,
  });
  if (!permitted) return <IdentityDenied />;
  const disabled = Boolean(mutationUnavailableReason) || (demo.enabled && demo.readOnly);
  function close() {
    if (creationPendingRef.current) return;
    setOpened(false);
    setFormKey((value) => value + 1);
    onCloseCreate?.();
  }
  return (
    <Stack>
      <Title>{tInvite("title")}</Title>
      {mutationUnavailableReason && <UserUnavailableView reason={mutationUnavailableReason} />}
      {query.isError && <IdentityError error={query.error} retry={() => void query.refetch()} />}
      <InviteListView
        invites={query.data ?? []}
        loading={query.isPending && query.data === undefined}
        refreshing={query.isFetching && query.data !== undefined}
        createOpen={opened}
        createDisabled={disabled || creationPending}
        onToggleCreate={() => {
          if (disabled || creationPendingRef.current) return;
          if (opened) {
            close();
            return;
          }
          setFormKey((value) => value + 1);
          setOpened(true);
        }}
        createForm={
          opened && (
            <InviteCreateForm
              key={formKey}
              onClose={close}
              disabled={disabled}
              onPendingChange={onCreationPendingChange}
              renderExpirationPicker={renderExpirationPicker}
            />
          )
        }
        renderActions={(invite) => <InviteRevoke id={invite.id} disabled={disabled} />}
      />
    </Stack>
  );
}

function InviteRevoke({ id, disabled }: { id: string; disabled: boolean }) {
  const tInvite = useI18n("management.page.user.invite");
  const tCommon = useI18n("common");
  const { client } = useIdentity();
  const action = useIdentityAction();
  return (
    <Stack gap="xs">
      <InlineConfirmActionIcon
        variant="subtle"
        color="red"
        disabled={disabled}
        loading={action.pending}
        aria-label={tInvite("action.delete.title")}
        confirmationAriaLabel={tCommon("action.confirm")}
        confirmLabel={tCommon("action.confirm")}
        onConfirm={async () => {
          if (disabled) return;
          await action.run((signal) => client.invite.deleteInvite({ id }, { signal }));
        }}
      >
        <IconTrash color="red" size={20} stroke={1.5} />
      </InlineConfirmActionIcon>
      <ActionFeedback action={action} />
    </Stack>
  );
}

function localDateTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function InviteCreateForm({
  onClose,
  disabled = false,
  renderExpirationPicker,
  onPendingChange,
}: {
  onClose: () => void;
  disabled?: boolean;
  renderExpirationPicker?: (props: InviteExpirationPickerProps) => ReactNode;
  onPendingChange?: (pending: boolean) => void;
}) {
  const tInvite = useI18n("management.page.user.invite");
  const tCommon = useI18n("common");
  const formatter = useFormatter();
  const { client } = useIdentity();
  const [expiration, setExpiration] = useState(() => localDateTime(new Date(Date.now() + 4 * 3600000)));
  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const action = useIdentityAction();
  const submitting = useRef(false);
  const minDate = new Date(Date.now() + 3600000);
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 6);
  if (created)
    return (
      <Stack>
        <CreatedInviteDetails
          invite={created}
          disabled={action.pending}
          onDismiss={() => {
            if (submitting.current) return;
            setCreated(null);
            onClose();
          }}
        />
        <ActionFeedback action={action} />
      </Stack>
    );
  const pickerProps = {
    value: expiration,
    onChange: setExpiration,
    min: localDateTime(minDate),
    max: localDateTime(maxDate),
    disabled: disabled || action.pending,
  };
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (disabled || submitting.current || action.pending) return;
        const date = new Date(expiration);
        if (!Number.isFinite(date.getTime()) || date < minDate || date > maxDate) {
          setValidation(
            `${tCommon("zod.errors.default")}: ${tInvite("field.expirationDate.label")}, ${tCommon("information.min")}: ${formatter.dateTime(minDate, { dateStyle: "medium", timeStyle: "short" })}, ${tCommon("information.max")}: ${formatter.dateTime(maxDate, { dateStyle: "medium", timeStyle: "short" })}`,
          );
          return;
        }
        const expirationDate = z.iso.datetime({ offset: true }).parse(date.toISOString());
        setValidation(null);
        submitting.current = true;
        onPendingChange?.(true);
        try {
          await action.run((signal) => client.invite.createInvite({ expirationDate }, { signal }), {
            onSuccess: setCreated,
          });
        } finally {
          submitting.current = false;
          onPendingChange?.(false);
        }
      }}
    >
      <Stack>
        <Text>{tInvite("action.new.description")}</Text>
        {renderExpirationPicker ? (
          renderExpirationPicker(pickerProps)
        ) : (
          <TextInput
            label={tInvite("field.expirationDate.label")}
            type="datetime-local"
            variant="filled"
            required
            min={pickerProps.min}
            max={pickerProps.max}
            value={expiration}
            onChange={(event) => setExpiration(event.currentTarget.value)}
            disabled={pickerProps.disabled}
          />
        )}
        {validation && <IdentityError error={validation} />}
        <ActionFeedback action={action} />
        <Group justify="end" wrap="wrap">
          <Button
            variant="default"
            disabled={action.pending}
            onClick={() => {
              if (!submitting.current) onClose();
            }}
          >
            {tCommon("action.cancel")}
          </Button>
          <Button type="submit" loading={action.pending} disabled={disabled}>
            {tCommon("action.create")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function CreatedInviteDetails({
  invite,
  onDismiss,
  disabled = false,
}: {
  invite: CreatedInvite;
  onDismiss: () => void;
  disabled?: boolean;
}) {
  const path = `/auth/invite/${encodeURIComponent(invite.id)}?token=${encodeURIComponent(invite.token)}`;
  let url = path;
  if (typeof window !== "undefined") url = new URL(path, window.location.origin).toString();
  return <CreatedInviteView id={invite.id} token={invite.token} url={url} onDismiss={onDismiss} disabled={disabled} />;
}
