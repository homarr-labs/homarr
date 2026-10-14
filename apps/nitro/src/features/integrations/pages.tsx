import { useRef, useState } from "react";
import { Avatar, Badge, Button, Container, Fieldset, Group, List, Modal, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import type { IntegrationKind } from "@homarr/definitions";
import { getIconUrl, getIntegrationName, getWidgetKindsForIntegration, getWidgetName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/standalone/client";

import type { CreatedIntegration } from "./client";
import { IntegrationAccessSettings } from "./access";
import { IntegrationCatalog } from "./catalog";
import { IntegrationAccessDenied, IntegrationLoadError, IntegrationLoading } from "./feedback";
import { IntegrationForm } from "./form";
import { useIntegrationFeature, useIntegrationQueryKey } from "./provider";
import { useIntegrationRequestGeneration } from "./request-generation";

export interface IntegrationCreatePageProps {
  kind?: IntegrationKind;
  initialUrl?: string;
  initialName?: string;
  enableMockIntegration?: boolean;
}

export function IntegrationCreatePage({
  kind,
  initialUrl,
  initialName,
  enableMockIntegration,
}: IntegrationCreatePageProps) {
  const t = useI18n();
  const { principal, navigate } = useIntegrationFeature();
  if (principal.kind !== "authenticated" || !principal.user.permissions.includes("integration-create"))
    return <IntegrationAccessDenied />;
  return (
    <Container>
      <Stack>
        {kind ? (
          <>
            <Group>
              <Avatar src={getIconUrl(kind)} size="md" />
              <Title>{t("integration.page.create.title", { name: getIntegrationName(kind) })}</Title>
            </Group>
            <IntegrationForm
              key={kind}
              mode="create"
              kind={kind}
              initialUrl={initialUrl}
              initialName={initialName}
              onCreated={() => navigate("/manage/integrations")}
            />
          </>
        ) : (
          <>
            <Title>{t("integration.action.create")}</Title>
            <IntegrationCatalog
              enableMockIntegration={enableMockIntegration}
              onSelect={(selected) => {
                const params = new URLSearchParams({ kind: selected });
                if (initialUrl !== undefined) params.set("url", initialUrl);
                if (initialName !== undefined) params.set("name", initialName);
                navigate(`/manage/integrations/new?${params}`);
              }}
            />
          </>
        )}
      </Stack>
    </Container>
  );
}

export function IntegrationEditPage({ integrationId }: { integrationId: string }) {
  const t = useI18n();
  const { client, principal, navigate } = useIntegrationFeature();
  const key = useIntegrationQueryKey();
  const query = useQuery({
    queryKey: [...key, "byId", integrationId],
    queryFn: ({ signal }) => client.integration.byId({ id: integrationId }, { signal }),
    enabled: principal.kind === "authenticated",
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (principal.kind !== "authenticated") return <IntegrationAccessDenied />;
  if (query.isPending) return <IntegrationLoading />;
  if (query.isError) return <IntegrationLoadError retry={() => void query.refetch()} />;
  return (
    <Container>
      <Stack>
        <Group>
          <Avatar src={getIconUrl(query.data.kind)} size="md" />
          <Title>{t("integration.page.edit.title", { name: getIntegrationName(query.data.kind) })}</Title>
        </Group>
        <IntegrationForm
          key={integrationId}
          mode="edit"
          integration={query.data}
          onSaved={() => navigate("/manage/integrations")}
        />
        <Title order={2}>{t("permission.title")}</Title>
        <Fieldset>
          <IntegrationAccessSettings integrationId={integrationId} />
        </Fieldset>
      </Stack>
    </Container>
  );
}

export interface IntegrationCreateModalProps extends Omit<IntegrationCreatePageProps, "kind"> {
  opened: boolean;
  onClose: () => void;
  initialKind?: IntegrationKind;
  allowedKinds?: readonly IntegrationKind[];
  onCreated?: (result: CreatedIntegration) => void;
}

export function IntegrationCreateModal(props: IntegrationCreateModalProps) {
  if (!props.opened) return null;
  return (
    <IntegrationCreateModalContent
      key={JSON.stringify([props.initialKind, props.allowedKinds, props.initialName, props.initialUrl])}
      {...props}
    />
  );
}

function IntegrationCreateModalContent({
  onClose,
  initialKind,
  allowedKinds,
  initialName,
  initialUrl,
  enableMockIntegration,
  onCreated,
}: IntegrationCreateModalProps) {
  const t = useI18n();
  const { client, principal } = useIntegrationFeature();
  const key = useIntegrationQueryKey();
  const requests = useIntegrationRequestGeneration();
  const selectionGeneration = useRef(0);
  const generation = selectionGeneration.current;
  const directKind = initialKind ?? (allowedKinds?.length === 1 ? allowedKinds[0] : undefined);
  const [kind, setKind] = useState<IntegrationKind | undefined>(directKind);
  const [created, setCreated] = useState<CreatedIntegration | null>(null);
  const query = useQuery({
    queryKey: [...key, "all"],
    queryFn: ({ signal }) => client.integration.all(undefined, { signal }),
    enabled: principal.kind === "authenticated",
    retry: false,
  });
  const back = () => {
    selectionGeneration.current += 1;
    requests.invalidate();
    if (directKind || created) onClose();
    else setKind(undefined);
  };
  return (
    <Modal
      opened
      onClose={back}
      title={t(created ? "integration.completion.modalTitle" : "integration.action.create")}
      size={kind ? "lg" : "xl"}
      transitionProps={{ duration: 0 }}
    >
      {principal.kind !== "authenticated" || !principal.user.permissions.includes("integration-create") ? (
        <IntegrationAccessDenied />
      ) : created ? (
        <IntegrationCompletion result={created} onClose={onClose} />
      ) : kind ? (
        <Stack>
          <Button variant="subtle" color="gray" onClick={back}>
            {t(directKind ? "common.action.close" : "common.action.previous")}
          </Button>
          <Group>
            <Avatar src={getIconUrl(kind)} size="sm" />
            <Title order={4}>{getIntegrationName(kind)}</Title>
          </Group>
          <IntegrationForm
            key={kind}
            mode="create"
            kind={kind}
            initialName={initialName}
            initialUrl={initialUrl}
            onCancel={back}
            onCreated={async (result) => {
              const isSelectionCurrent = () => requests.isActive() && generation === selectionGeneration.current;
              if (!isSelectionCurrent()) return;
              if (onCreated) {
                await onCreated(result);
                if (isSelectionCurrent()) onClose();
              } else setCreated(result);
            }}
          />
        </Stack>
      ) : query.isPending ? (
        <IntegrationLoading />
      ) : query.isError ? (
        <IntegrationLoadError retry={() => void query.refetch()} />
      ) : (
        <IntegrationCatalog
          onSelect={(selected) => {
            selectionGeneration.current += 1;
            requests.invalidate();
            setKind(selected);
          }}
          allowedKinds={allowedKinds}
          enableMockIntegration={enableMockIntegration}
          integrations={query.data}
        />
      )}
    </Modal>
  );
}

export function IntegrationCompletion({ result, onClose }: { result: CreatedIntegration; onClose: () => void }) {
  const t = useI18n();
  const widgets = getWidgetKindsForIntegration(result.integration.kind);
  return (
    <Stack gap="lg">
      <Stack gap={2}>
        <Title order={3} size="h4">
          {t("integration.completion.title", { name: result.integration.name })}
        </Title>
        <Text c="dimmed" size="sm">
          {t("integration.completion.description")}
        </Text>
      </Stack>
      <List spacing="sm">
        <List.Item>{t("integration.completion.connectionReady")}</List.Item>
        {result.appId && <List.Item>{t("integration.completion.appReady")}</List.Item>}
        <List.Item>{t("integration.completion.compatibleWidgets", { count: widgets.length })}</List.Item>
      </List>
      <Group gap={4}>
        {widgets.map((widget) => (
          <Badge key={widget} variant="default" size="sm">
            {getWidgetName(widget, t)}
          </Badge>
        ))}
      </Group>
      <Group justify="end">
        <Button variant="default" onClick={onClose}>
          {t("common.action.close")}
        </Button>
      </Group>
    </Stack>
  );
}
