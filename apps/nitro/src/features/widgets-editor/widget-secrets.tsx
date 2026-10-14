import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Fieldset, Group, Modal, PasswordInput, Stack, Text } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  EditorInputs,
  EditorTranslate,
  WidgetEditorClient,
  WidgetEditorDomain,
  WidgetEditorQueryUtils,
} from "./contracts";

type ReleaseProviderKind = EditorInputs["widget"]["secrets"]["setSecret"]["kind"];

export function WidgetSecrets(props: {
  itemId?: string;
  canModifyBoard: boolean;
  writesAvailable?: boolean;
  client: WidgetEditorClient;
  queryUtils: WidgetEditorQueryUtils;
  domain: WidgetEditorDomain;
  t: EditorTranslate;
  onDirtyChange?(property: string, dirty: boolean): void;
}) {
  const { client, t } = props;
  const queryClient = useQueryClient();
  const queries = props.queryUtils;
  const [values, setValues] = useState<Partial<Record<ReleaseProviderKind, string>>>({});
  const [pendingKind, setPendingKind] = useState<ReleaseProviderKind | null>(null);
  const [removeKind, setRemoveKind] = useState<ReleaseProviderKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const notifyDirty = props.onDirtyChange;
  const providerKinds = props.domain.releaseProviderKinds;
  useEffect(
    () => () => {
      providerKinds.forEach((kind) => notifyDirty?.(kind, false));
    },
    [notifyDirty, providerKinds],
  );
  const queryOptions = queries.widget.secrets.getConfiguredKinds.queryOptions({
    input: { itemId: props.itemId ?? "" },
    enabled: Boolean(props.itemId) && props.canModifyBoard,
    retry: false,
  });
  const configured = useQuery(queryOptions);
  const changeSecret = async (kind: ReleaseProviderKind, remove: boolean) => {
    if (locked.current || !props.itemId || !props.canModifyBoard || !props.writesAvailable) return;
    const value = values[kind] ?? "";
    if (!remove && (value.length < 1 || value.length > 4096)) {
      setError(t("nitro.widgetEditor.secretLength"));
      return;
    }
    locked.current = true;
    setPendingKind(kind);
    setError(null);
    try {
      if (remove) await client.widget.secrets.deleteSecret({ itemId: props.itemId, kind });
      else await client.widget.secrets.setSecret({ itemId: props.itemId, kind, value });
      setValues((current) => {
        const next = { ...current };
        delete next[kind];
        return next;
      });
      notifyDirty?.(kind, false);
      void queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      setRemoveKind(null);
      void queryClient.invalidateQueries({ queryKey: queries.widget.releases.key() });
    } catch {
      setError(t("common.notification.update.error"));
    } finally {
      locked.current = false;
      setPendingKind(null);
    }
  };
  if (!props.itemId) return <Alert color="yellow">{t("nitro.widgetEditor.secretRequiresSavedItem")}</Alert>;
  if (!props.canModifyBoard) return <Alert color="yellow">{t("nitro.widgetEditor.modifyPermissionRequired")}</Alert>;
  return (
    <>
      <Fieldset legend={t("widget.releases.option.repositories.token.label")}>
        <Stack gap="sm">
          {!props.writesAvailable && <Alert color="yellow">{t("nitro.widgetEditor.draftWriterUnavailable")}</Alert>}
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          {configured.isError && (
            <Alert color="red">
              <Stack gap="xs">
                <Text>{t("common.notification.update.error")}</Text>
                <Button variant="subtle" onClick={() => void configured.refetch()}>
                  {t("common.action.tryAgain")}
                </Button>
              </Stack>
            </Alert>
          )}
          {props.domain.releaseProviderKinds.map((kind) => (
            <Stack key={kind} gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={600}>
                  {kind}
                </Text>
                {configured.data?.includes(kind) && (
                  <Badge color="green" variant="light">
                    {t("nitro.widgetEditor.secretConfigured")}
                  </Badge>
                )}
              </Group>
              <PasswordInput
                label={t("widget.releases.option.repositories.token.label")}
                aria-label={`${kind} ${t("widget.releases.option.repositories.token.label")}`}
                autoComplete="new-password"
                value={values[kind] ?? ""}
                onChange={(event) => {
                  const next = event.currentTarget.value;
                  notifyDirty?.(kind, next.length > 0);
                  setValues((current) => ({ ...current, [kind]: next }));
                }}
                disabled={pendingKind !== null || configured.isPending}
                maxLength={4096}
              />
              <Group justify="flex-end">
                <Button
                  variant="default"
                  disabled={!props.writesAvailable || !configured.data?.includes(kind) || pendingKind !== null}
                  onClick={() => setRemoveKind(kind)}
                >
                  {t("common.action.remove")}
                </Button>
                <Button
                  disabled={
                    !props.writesAvailable ||
                    !values[kind]?.length ||
                    configured.isError ||
                    configured.isPending ||
                    pendingKind !== null
                  }
                  loading={pendingKind === kind}
                  onClick={() => void changeSecret(kind, false)}
                >
                  {t("common.action.save")}
                </Button>
              </Group>
            </Stack>
          ))}
        </Stack>
      </Fieldset>
      <Modal
        opened={removeKind !== null}
        onClose={() => pendingKind === null && setRemoveKind(null)}
        title={t("nitro.widgetEditor.removeSecretTitle")}
        closeOnClickOutside={false}
        closeButtonProps={{ disabled: pendingKind !== null }}
      >
        <Stack>
          <Text>{t("nitro.widgetEditor.removeSecretDescription", { provider: removeKind ?? "" })}</Text>
          <Group justify="flex-end">
            <Button variant="default" disabled={pendingKind !== null} onClick={() => setRemoveKind(null)}>
              {t("common.action.cancel")}
            </Button>
            <Button
              color="red"
              loading={pendingKind !== null}
              onClick={() => removeKind && void changeSecret(removeKind, true)}
            >
              {t("common.action.remove")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
