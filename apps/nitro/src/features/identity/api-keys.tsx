import { useState } from "react";
import { Stack } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@homarr/translation/client";

import { InlineConfirmActionIcon } from "../../../../../packages/ui/src/components/inline-confirm-action";
import { ApiKeysView, NewApiKeyView } from "../../source-ui/users/api-keys";
import type { UserAvatarRenderer } from "../../source-ui/users/contracts";
import { useIdentity, useIdentityKey } from "./boundary";
import { useIdentityAction } from "./feedback";
import {
  UserActionFeedbackView as ActionFeedback,
  UserUnavailableView as IdentityDenied,
  UserRequestErrorView as IdentityError,
  UserLoadingView as IdentityLoading,
  UserUnavailableView,
} from "../../source-ui/users/user-detail";

export function ApiKeyAdministration({
  mutationUnavailableReason,
  renderAvatar,
}: { mutationUnavailableReason?: string; renderAvatar?: UserAvatarRenderer } = {}) {
  const { client, principal, demo, isCurrent } = useIdentity();
  const key = useIdentityKey();
  const admin = principal.user.permissions.includes("admin");
  const [created, setCreated] = useState<string | null>(null);
  const action = useIdentityAction();
  const query = useQuery({
    queryKey: [...key, "api-keys"],
    queryFn: ({ signal }) => client.apiKeys.getAll(undefined, { signal }),
    enabled: admin,
  });
  if (!admin) return <IdentityDenied />;
  const loading = query.isPending && query.data === undefined;
  if (loading) return <IdentityLoading />;
  const disabled = Boolean(mutationUnavailableReason) || (demo.enabled && demo.readOnly);
  return (
    <ApiKeysView
      renderAvatar={renderAvatar}
      apiKeys={query.data ?? []}
      loading={loading}
      refreshing={query.isFetching && query.data !== undefined}
      creating={action.pending}
      createDisabled={disabled || created !== null}
      onCreate={() => {
        if (disabled || created !== null) return;
        void action.run((signal) => client.apiKeys.create(undefined, { signal }), {
          onSuccess: (result) => setCreated(result.apiKey),
        });
      }}
      createdKey={created && <NewApiKeyView apiKey={created} onDismiss={() => setCreated(null)} />}
      feedback={
        <Stack>
          {mutationUnavailableReason && <UserUnavailableView reason={mutationUnavailableReason} />}
          {query.isError && <IdentityError error={query.error} retry={() => void query.refetch()} />}
          <ActionFeedback action={action} />
        </Stack>
      }
      renderActions={(apiKey) => (
        <ApiKeyRevoke
          id={apiKey.id}
          disabled={disabled}
          onRevoked={(id) => {
            if (isCurrent() && created?.split(".")[0] === id) setCreated(null);
          }}
        />
      )}
    />
  );
}

function ApiKeyRevoke({ id, disabled, onRevoked }: { id: string; disabled: boolean; onRevoked: (id: string) => void }) {
  const t = useI18n("management.page.tool.api.tab.apiKey");
  const tCommon = useI18n("common");
  const { client } = useIdentity();
  const action = useIdentityAction();
  return (
    <Stack gap="xs">
      <InlineConfirmActionIcon
        aria-label={t("modal.delete.title")}
        confirmationAriaLabel={tCommon("action.confirm")}
        confirmLabel={tCommon("action.confirm")}
        loading={action.pending}
        disabled={disabled}
        color="red"
        variant="subtle"
        onConfirm={async () => {
          if (disabled) return;
          await action.run((signal) => client.apiKeys.delete({ apiKeyId: id }, { signal }), {
            onSuccess: () => onRevoked(id),
          });
        }}
      >
        <IconTrash size="1rem" />
      </InlineConfirmActionIcon>
      <ActionFeedback action={action} />
    </Stack>
  );
}
