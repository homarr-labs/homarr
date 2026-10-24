"use client";

import { useId, useState } from "react";
import { Alert, Button, Divider, Group, Stack, Text, Title } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmButton } from "@homarr/ui";

import { OAuthConnectionDetails } from "~/app/[locale]/manage/tools/api/components/oauth-connection-details";
import { formatOAuthDisplayText } from "~/app/[locale]/manage/tools/api/components/oauth-display";

type RevokeFeedback = "success" | "error" | null;

export const OAuthConnections = ({
  initialConnections,
}: {
  initialConnections?: RouterOutputs["apiKeys"]["getOwnOAuth"];
}) => {
  const t = useI18n("management.page.user.setting.general.item.oauthConnections");
  const tProvenance = useI18n("management.page.tool.api.tab.apiKey.provenance");
  const headingId = useId();
  const [feedback, setFeedback] = useState<RevokeFeedback>(null);
  const utils = clientApi.useUtils();
  const connections = clientApi.apiKeys.getOwnOAuth.useQuery(undefined, {
    initialData: initialConnections,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const connectionData = connections.isFetchedAfterMount ? connections.data : initialConnections;
  const canShowConnections = connectionData !== undefined && !connections.isError;
  const revoke = clientApi.apiKeys.revokeOwnOAuth.useMutation({
    onMutate() {
      setFeedback(null);
    },
    onSuccess(_result, { apiKeyId }) {
      utils.apiKeys.getOwnOAuth.setData(undefined, (current) => current?.filter(({ id }) => id !== apiKeyId));
      setFeedback("success");
      void utils.apiKeys.getOwnOAuth.invalidate();
      void utils.apiKeys.getAll.invalidate();
    },
    onError() {
      setFeedback("error");
    },
  });

  return (
    <section aria-labelledby={headingId}>
      <Stack mb="lg">
        <Title order={2} id={headingId}>
          {t("title")}
        </Title>
        <Text size="sm">{t("description")}</Text>
        <Text size="sm">{t("revocationHint")}</Text>

        {feedback !== null && (
          <Alert
            color={feedback === "success" ? "green" : "red"}
            variant="light"
            role={feedback === "success" ? "status" : "alert"}
            title={t(`${feedback}.title`)}
          >
            {t(`${feedback}.description`)}
          </Alert>
        )}

        {!canShowConnections && !connections.isError && <Text component="output">{t("loading")}</Text>}

        {connections.isError && (
          <Alert color="red" variant="light" icon={<IconExclamationCircle size={18} />} title={t("loadError.title")}>
            <Stack gap="sm">
              <Text size="sm">{t("loadError.description")}</Text>
              <Button
                type="button"
                variant="light"
                w="fit-content"
                mih={44}
                loading={connections.isFetching}
                onClick={() => void connections.refetch()}
              >
                {t("retry")}
              </Button>
            </Stack>
          </Alert>
        )}

        {canShowConnections && connectionData?.length === 0 && (
          <Stack gap="xs">
            <Text fw={500}>{t("empty.title")}</Text>
            <Text size="sm">{t("empty.description")}</Text>
          </Stack>
        )}

        {canShowConnections && (connectionData?.length ?? 0) > 0 && (
          <Text size="sm">{tProvenance("clientNameHint")}</Text>
        )}

        {canShowConnections &&
          connectionData?.map((connection) => (
            <Stack key={connection.id} gap="sm">
              <Divider />
              <Group align="flex-start" justify="space-between">
                <Stack gap="sm" style={{ flex: "1 1 18rem", minWidth: 0 }}>
                  <Text
                    id={`${headingId}-${connection.id}`}
                    fw={500}
                    style={{ overflowWrap: "anywhere", unicodeBidi: "isolate" }}
                  >
                    <bdi>{formatOAuthDisplayText(connection.oauthClientName ?? tProvenance("unnamedClient"))}</bdi>
                  </Text>
                  <OAuthConnectionDetails connection={connection} />
                </Stack>
                <InlineConfirmButton
                  type="button"
                  color="red"
                  variant="light"
                  mih={44}
                  aria-describedby={`${headingId}-${connection.id}`}
                  confirmLabel={t("confirmRevoke")}
                  disabled={revoke.isPending}
                  loading={revoke.isPending && revoke.variables.apiKeyId === connection.id}
                  onConfirm={() => revoke.mutateAsync({ apiKeyId: connection.id })}
                >
                  {t("revoke")}
                </InlineConfirmButton>
              </Group>
            </Stack>
          ))}
      </Stack>
    </section>
  );
};
