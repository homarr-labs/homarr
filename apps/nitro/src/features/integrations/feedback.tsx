import { Alert, Button, Skeleton, Stack, Text } from "@mantine/core";

import { useI18n } from "@homarr/translation/standalone/client";

import type { IntegrationWriteOutcome } from "./provider";

export function IntegrationOutcomeFeedback({
  outcome,
  retry,
}: {
  outcome: IntegrationWriteOutcome;
  retry: () => void;
}) {
  const t = useI18n();
  const scopeCurrent = outcome.isScopeCurrent();
  const retired =
    !scopeCurrent ||
    !outcome.origin.isCurrent() ||
    outcome.delivery === "retired" ||
    outcome.notification === "retired";
  let title = t("integration.outcome.savedTitle");
  if (outcome.settlement.state === "dispatched") title = t("integration.outcome.pendingTitle");
  if (outcome.settlement.state === "unconfirmed") title = t("integration.outcome.unconfirmedTitle");
  return (
    <Alert color="yellow" title={title} role="status">
      <Stack gap="sm">
        {outcome.settlement.state === "dispatched" && <Text size="sm">{t("integration.outcome.pending")}</Text>}
        {outcome.settlement.state === "unconfirmed" && <Text size="sm">{t("integration.outcome.unconfirmed")}</Text>}
        {scopeCurrent && outcome.settlement.state === "acknowledged" && outcome.settlement.mode === "create" && (
          <Text size="sm">
            {t("integration.outcome.integrationId", { id: outcome.settlement.result.integration.id })}
          </Text>
        )}
        {outcome.refresh === "pending" && <Text size="sm">{t("integration.outcome.refreshPending")}</Text>}
        {outcome.refresh === "failed" && <Text size="sm">{t("integration.outcome.refreshFailed")}</Text>}
        {outcome.refresh === "incomplete" && <Text size="sm">{t("integration.outcome.refreshIncomplete")}</Text>}
        {outcome.refresh === "complete" && <Text size="sm">{t("integration.outcome.refreshComplete")}</Text>}
        {(outcome.delivery === "failed" || outcome.notification === "failed") && (
          <Text size="sm">{t("integration.outcome.deliveryFailed")}</Text>
        )}
        {outcome.delivery === "entered" && <Text size="sm">{t("integration.outcome.deliveryPending")}</Text>}
        {retired && <Text size="sm">{t("integration.outcome.retired")}</Text>}
        {outcome.settlement.state !== "dispatched" && (
          <Button
            type="button"
            variant="light"
            color="yellow"
            disabled={!scopeCurrent || outcome.refresh === "pending"}
            loading={outcome.refresh === "pending"}
            onClick={retry}
          >
            {t("integration.outcome.refreshAction")}
          </Button>
        )}
      </Stack>
    </Alert>
  );
}

export function IntegrationLoading() {
  return (
    <Stack aria-busy="true">
      <Skeleton height={44} />
      <Skeleton height={90} />
      <Skeleton height={90} />
    </Stack>
  );
}

export function IntegrationLoadError({ retry }: { retry: () => void }) {
  const t = useI18n();
  return (
    <Alert color="red" title={t("common.error")} role="alert">
      <Stack gap="sm">
        <Text size="sm">{t("integration.grid.loadError")}</Text>
        <Button variant="light" color="red" onClick={retry}>
          {t("common.action.tryAgain")}
        </Button>
      </Stack>
    </Alert>
  );
}

export function IntegrationAccessDenied() {
  const t = useI18n();
  return (
    <Alert color="red" title={t("integration.testConnection.notification.forbidden.title")} role="alert">
      {t("integration.testConnection.notification.forbidden.message")}
    </Alert>
  );
}
