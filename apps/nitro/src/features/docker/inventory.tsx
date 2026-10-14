import { useMemo, useState } from "react";
import { Stack, Text } from "@mantine/core";

import { useI18n } from "@homarr/translation/standalone/client";

import { DockerTableView } from "../../source-ui/docker";
import {
  canRunDockerAction,
  DockerActionGroup,
  DockerActionResult,
  DockerContainerMenu,
  DockerRemovalConfirmation,
} from "./actions";
import type { DockerFeatureBinding } from "./binding";
import type { DockerAction, DockerContainer, DockerInventory } from "./client";
import { createDockerColumns } from "./columns";
import { DockerLoadError } from "./feedback";
import { useDockerAction } from "./queries";

export function DockerInventoryTable({
  binding,
  inventory,
  fetching,
  onLogs,
  onRefresh,
}: {
  binding: DockerFeatureBinding;
  inventory: DockerInventory;
  fetching: boolean;
  onLogs: (container: DockerContainer) => void;
  onRefresh?: () => void;
}) {
  const t = useI18n();
  const mutation = useDockerAction(binding);
  const [removal, setRemoval] = useState<DockerContainer[] | null>(null);
  const [submitted, setSubmitted] = useState<{ action: DockerAction; containers: DockerContainer[] } | null>(null);
  const columns = useMemo(() => createDockerColumns(t, binding.byteUnit), [t, binding.byteUnit]);
  const runAction = (action: DockerAction, containers: DockerContainer[]) => {
    const currentContainers = containers.map((container) =>
      inventory.containers.find(({ resourceId }) => resourceId === container.resourceId),
    );
    if (fetching || mutation.isPending || binding.readOnly || currentContainers.some((container) => !container)) return;
    const selected = currentContainers.filter((container): container is DockerContainer => container !== undefined);
    if (!canRunDockerAction(selected, inventory.endpoints, action)) return;
    if (action === "remove") {
      setRemoval(selected);
      return;
    }
    setSubmitted({ action, containers: selected });
    mutation.mutate({ action, containers: selected });
  };
  const unavailable = inventory.endpoints.filter(({ status }) => status === "unavailable");
  const removalTargets = removal?.map((container) =>
    inventory.containers.find(({ resourceId }) => resourceId === container.resourceId),
  );
  const currentRemoval =
    removalTargets?.filter((container): container is DockerContainer => container !== undefined) ?? [];
  const removalAllowed =
    !binding.readOnly &&
    !fetching &&
    !mutation.isPending &&
    currentRemoval.length === removal?.length &&
    canRunDockerAction(currentRemoval, inventory.endpoints, "remove");
  return (
    <Stack gap="sm">
      {mutation.isError && (
        <Stack gap="xs">
          <DockerLoadError error={mutation.error} />
          <Text size="sm">
            A failed or cancelled request does not establish whether Docker changed. Review the refreshed inventory
            before submitting another action.
          </Text>
        </Stack>
      )}
      {mutation.data && submitted && <DockerActionResult {...submitted} results={mutation.data} />}
      <DockerTableView
        containers={inventory.containers}
        columns={columns}
        localization={binding.tableLocalization}
        fetching={fetching}
        actionPending={mutation.isPending}
        searchLabel={t("docker.table.search", { count: String(inventory.containers.length) })}
        selectedLabel={(selected, total) =>
          t("docker.table.selected", { selectCount: String(selected), totalCount: String(total) })
        }
        updatedLabel={t("docker.table.updated", { when: inventory.timestamp.toLocaleString() })}
        emptyLabel={t("docker.reconciliation.empty")}
        unavailableLabel={
          unavailable.length > 0
            ? t("docker.error.endpointUnavailable", {
                count: String(unavailable.length),
                names: unavailable.map(({ name }) => name).join(", "),
              })
            : undefined
        }
        refreshLabel={t("common.action.refresh")}
        onRefresh={onRefresh}
        renderRowActions={(container) => (
          <DockerContainerMenu
            binding={binding}
            containers={[container]}
            container={container}
            endpoints={inventory.endpoints}
            pending={mutation.isPending || fetching}
            onAction={runAction}
            onLogs={onLogs}
          />
        )}
        renderSelectedActions={(selected) => (
          <Stack gap="xs">
            <DockerActionGroup
              binding={binding}
              containers={selected}
              endpoints={inventory.endpoints}
              pending={mutation.isPending || fetching}
              onAction={runAction}
            />
            {selected.length > 100 && <Text size="sm">Select at most 100 containers for a Docker action.</Text>}
          </Stack>
        )}
      />
      <DockerRemovalConfirmation
        containers={removal}
        pending={mutation.isPending}
        allowed={removalAllowed}
        onClose={() => setRemoval(null)}
        onConfirm={() => {
          if (!removalAllowed) return;
          setSubmitted({ action: "remove", containers: currentRemoval });
          mutation.mutate({ action: "remove", containers: currentRemoval });
          setRemoval(null);
        }}
      />
    </Stack>
  );
}
