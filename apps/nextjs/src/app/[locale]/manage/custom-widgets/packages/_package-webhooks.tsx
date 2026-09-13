"use client";

import { useState } from "react";
import { Alert, Badge, Button, CopyButton, Group, PasswordInput, Select, Stack, Text, TextInput } from "@mantine/core";
import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

type IssuedWebhook = RouterOutputs["customWidget"]["package"]["createWebhook"];

export function PackageWebhooks({ itemId, handlers }: { itemId: string; handlers: string[] }) {
  const t = useI18n("customWidget.package.webhook");
  const commonT = useI18n("common.action");
  const hooks = clientApi.customWidget.package.webhooks.useQuery({ itemId });
  const create = clientApi.customWidget.package.createWebhook.useMutation();
  const revoke = clientApi.customWidget.package.revokeWebhook.useMutation();
  const [handler, setHandler] = useState<string | null>(null);
  const [issued, setIssued] = useState<IssuedWebhook | null>(null);
  const [error, setError] = useState("");
  return (
    <Stack gap="sm">
      <Text size="sm">{t("description")}</Text>
      <Group align="end">
        <Select
          flex={1}
          label={t("handler")}
          data={handlers}
          value={handler}
          onChange={setHandler}
          disabled={handlers.length === 0}
        />
        <Button
          size="sm"
          disabled={!handler}
          loading={create.isPending}
          onClick={() => {
            if (!handler) return;
            setError("");
            create.mutate(
              { itemId, handler },
              {
                onSuccess: (result) => {
                  setIssued(result);
                  create.reset();
                  void hooks.refetch();
                },
                onError: (cause) => setError(cause.message),
              },
            );
          }}
        >
          {t("create")}
        </Button>
      </Group>
      {handlers.length === 0 && (
        <Text size="xs" c="dimmed">
          {t("noHandlers")}
        </Text>
      )}
      {issued && (
        <Alert color="yellow" title={t("issued")} withCloseButton onClose={() => setIssued(null)}>
          <Stack gap="xs">
            <Text size="xs">{t("issuedDescription")}</Text>
            <TextInput label={t("url")} readOnly value={new URL(issued.path, window.location.origin).href} />
            <CopyButton value={new URL(issued.path, window.location.origin).href}>
              {({ copied, copy }) => (
                <Button size="xs" variant="subtle" onClick={copy}>
                  {copied ? commonT("copied") : t("copyUrl")}
                </Button>
              )}
            </CopyButton>
            <PasswordInput label={t("token")} readOnly value={issued.token} />
            <CopyButton value={issued.token}>
              {({ copied, copy }) => (
                <Button size="xs" variant="subtle" onClick={copy}>
                  {copied ? commonT("copied") : t("copyToken")}
                </Button>
              )}
            </CopyButton>
          </Stack>
        </Alert>
      )}
      {(hooks.data ?? []).map((hook) => (
        <Group key={hook.id} justify="space-between">
          <Text size="sm">{hook.handler}</Text>
          <Badge color={hook.current ? "green" : "yellow"}>{hook.current ? t("current") : t("reissue")}</Badge>
          <Button
            size="compact-xs"
            color="red"
            variant="subtle"
            loading={revoke.isPending}
            onClick={() =>
              revoke.mutate(
                { itemId, id: hook.id },
                {
                  onSuccess: () => {
                    if (issued?.id === hook.id) setIssued(null);
                    void hooks.refetch();
                  },
                  onError: (cause) => setError(cause.message),
                },
              )
            }
          >
            {t("revoke")}
          </Button>
        </Group>
      ))}
      {(error || hooks.error) && <Alert color="red">{error || hooks.error?.message}</Alert>}
    </Stack>
  );
}
