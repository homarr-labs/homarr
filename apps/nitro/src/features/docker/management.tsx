import { useState } from "react";
import { Alert, Badge, Button, Group, MultiSelect, Stack, Text } from "@mantine/core";

import { useI18n } from "@homarr/translation/standalone/client";

import { DockerManagementView } from "../../source-ui/docker";
import type { DockerFeatureAdmission, DockerFeatureBinding } from "./binding";
import { getDockerFeatureScope } from "./binding";
import type { DockerContainer, DockerFeatureClient } from "./client";
import { endpointHasCapability } from "./client";
import { DockerLoadError, DockerLoading } from "./feedback";
import { DockerInventoryTable } from "./inventory";
import { DockerLogsPage } from "./logs";
import { useDockerEndpoints, useDockerInventory, useDockerRefresh } from "./queries";
import { DockerReconciliationPanel } from "./reconciliation";
import "mantine-react-table/styles.css";

export function DockerManagementPage({ admission }: { admission: DockerFeatureAdmission }) {
  if (admission.kind === "held")
    return (
      <Alert color="yellow" title="Docker frontend admission is held">
        <Stack gap="xs">
          {admission.reasons.map((reason) => (
            <Text key={reason} size="sm">
              {reason}
            </Text>
          ))}
        </Stack>
      </Alert>
    );
  const binding = admission.binding;
  if (!binding.principal.user.permissions.includes("admin"))
    return (
      <Alert color="red" title="Docker access denied">
        Docker management requires current administrator permission.
      </Alert>
    );
  if (!binding.enabled)
    return (
      <Alert color="yellow" title="Docker is unavailable">
        Docker management is not enabled by the owned host configuration.
      </Alert>
    );
  return (
    <DockerManagementScope
      key={JSON.stringify([...getDockerFeatureScope(binding), binding.enabled, binding.logStreaming.kind])}
      binding={binding}
    />
  );
}

function DockerManagementScope({ binding }: { binding: DockerFeatureBinding }) {
  const t = useI18n();
  const [endpointIds, setEndpointIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<DockerContainer | null>(null);
  const endpoints = useDockerEndpoints(binding);
  const inventory = useDockerInventory(binding, endpointIds);
  const refresh = useDockerRefresh(binding);
  const liveContainer = logs && inventory.data?.containers.find(({ resourceId }) => resourceId === logs.resourceId);
  const logEndpoint = liveContainer && inventory.data?.endpoints.find(({ id }) => id === liveContainer.endpointId);
  if (logs && liveContainer && logEndpoint && endpointHasCapability(logEndpoint, "logs") && !inventory.isError) {
    return (
      <DockerLogsPage
        key={liveContainer.resourceId}
        binding={binding}
        container={liveContainer}
        onBack={() => setLogs(null)}
      />
    );
  }
  return (
    <DockerManagementView
      title={t("docker.title")}
      unavailableReason={binding.readOnly ? "Docker mutations and setup actions are read-only." : undefined}
      reconciliation={<DockerReconciliationPanel binding={binding} />}
      inventory={
        <Stack>
          {logs && (
            <Alert color="yellow" title="Container logs are unavailable">
              <Stack gap="xs">
                <Text size="sm">
                  The selected container or its endpoint log capability is no longer available in this inventory.
                </Text>
                <Button variant="default" w="fit-content" onClick={() => setLogs(null)}>
                  Back to containers
                </Button>
              </Stack>
            </Alert>
          )}
          {refresh.isError && <DockerLoadError error={refresh.error} />}
          {refresh.isSuccess && (
            <Alert color="green" title={t("docker.action.refresh.notification.success.title")}>
              {t("docker.action.refresh.notification.success.message")}
            </Alert>
          )}
          {endpoints.isPending && <DockerLoading />}
          {endpoints.isError && <DockerLoadError error={endpoints.error} retry={() => void endpoints.refetch()} />}
          {endpoints.data && (
            <>
              <MultiSelect
                label="Docker endpoints"
                placeholder="All endpoints"
                value={endpointIds}
                maxValues={100}
                clearable
                searchable
                data={endpoints.data.map(({ id, name }) => ({ value: id, label: name }))}
                onChange={setEndpointIds}
              />
              <DockerEndpointList endpoints={endpoints.data} />
            </>
          )}
          {inventory.isPending && <DockerLoading />}
          {inventory.isError && <DockerLoadError error={inventory.error} retry={() => void inventory.refetch()} />}
          {inventory.data && !inventory.isError && (
            <DockerInventoryTable
              key={JSON.stringify(endpointIds)}
              binding={binding}
              inventory={inventory.data}
              fetching={inventory.isFetching || refresh.isPending}
              onLogs={setLogs}
              onRefresh={binding.readOnly ? undefined : () => refresh.mutate()}
            />
          )}
        </Stack>
      }
    />
  );
}

function DockerEndpointList({
  endpoints,
}: {
  endpoints: Awaited<ReturnType<DockerFeatureClient["docker"]["getEndpoints"]>>;
}) {
  return (
    <Stack gap="xs">
      {endpoints.length === 0 && <Text size="sm">No Docker endpoints were returned.</Text>}
      {endpoints.map((endpoint) => (
        <Group key={endpoint.id} gap="xs">
          <Text fw={500} size="sm">
            {endpoint.name}
          </Text>
          <Badge
            variant="light"
            color={endpoint.status === "available" ? "green" : endpoint.status === "degraded" ? "yellow" : "red"}
          >
            {endpoint.status}
          </Badge>
          {endpoint.kind && <Text size="xs">{endpoint.kind}</Text>}
          {endpoint.transport && <Text size="xs">{endpoint.transport}</Text>}
          {endpoint.capabilities?.map((capability) => (
            <Badge key={capability} variant="outline" color="gray">
              {capability}
            </Badge>
          ))}
        </Group>
      ))}
      {endpoints.length > 0 && (
        <Text size="sm">
          Endpoint availability here describes configured client initialization. Inventory reports endpoint discovery
          failures separately.
        </Text>
      )}
    </Stack>
  );
}
