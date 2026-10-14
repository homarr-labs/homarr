import { Alert, Select, Stack } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { KubernetesClusterView } from "./cluster";
import { KubernetesContextSelector } from "../../source-ui/kubernetes/kubernetes-context-selector";
import { KubernetesReadContent, KubernetesTable } from "./components";
import type { KubernetesFeatureProps, KubernetesView } from "./contracts";
import { kubernetesViews } from "./contracts";
import { KubernetesInventoryViewContent } from "./inventory";
import { createKubernetesContextsModel, selectKubernetesContext } from "./models";
import { createKubernetesQueries } from "./queries";

export function KubernetesFeature(props: KubernetesFeatureProps) {
  return <KubernetesFeatureSession key={props.authorityKey} {...props} />;
}

function KubernetesFeatureSession({
  client,
  authorityKey,
  requestedContextId,
  onContextChange,
  view: requestedView,
  onViewChange,
  assetBase,
  onCheckLogs,
}: KubernetesFeatureProps) {
  const [storedView, setStoredView] = useState<KubernetesView>(requestedView ?? "cluster");
  const view = onViewChange ? (requestedView ?? storedView) : storedView;
  const changeView = (value: KubernetesView) => {
    if (onViewChange) onViewChange(value);
    else setStoredView(value);
  };
  const [storedContextId, setStoredContextId] = useLocalStorage<string | null>({
    key: "homarr-kubernetes-context",
    defaultValue: null,
  });
  const queries = createKubernetesQueries(client, authorityKey);
  const contexts = useQuery(queries.contexts());
  const context =
    contexts.data && !contexts.isError
      ? selectKubernetesContext(contexts.data, requestedContextId, storedContextId)
      : undefined;
  const selectedContextId = context?.contextId;

  useEffect(() => {
    if (selectedContextId && selectedContextId !== requestedContextId) onContextChange(selectedContextId);
  }, [selectedContextId, requestedContextId, onContextChange]);

  return (
    <Stack gap="lg">
      <KubernetesReadContent query={contexts} label="Contexts">
        {(data) =>
          data.contexts.length === 0 ? (
            <Alert title="No Kubernetes contexts configured">
              Configure Kubernetes contexts on the server before opening the inventory.
            </Alert>
          ) : (
            <Stack>
              <KubernetesContextSelector
                data={data}
                contextId={context?.contextId}
                onContextChange={(value) => {
                  setStoredContextId(value);
                  onContextChange(value);
                }}
              />
              <Select<KubernetesView>
                label="View"
                data={kubernetesViews.map((item) => ({ ...item }))}
                value={view}
                allowDeselect={false}
                onChange={(value) => {
                  if (value) changeView(value);
                }}
                style={{ flex: "1 1 180px", minWidth: 0 }}
              />
              {view === "contexts" ? (
                <KubernetesTable model={createKubernetesContextsModel(data)} />
              ) : context ? (
                <Stack key={`${context.contextId}:${view}`}>
                  {context.status === "unavailable" ? (
                    <Alert color="yellow">
                      Live resource reads are unavailable for this context. Select another configured context.
                    </Alert>
                  ) : view === "cluster" ? (
                    <KubernetesClusterView
                      queries={queries}
                      contextId={context.contextId}
                      onInventoryChange={changeView}
                      assetBase={assetBase}
                      onCheckLogs={onCheckLogs}
                    />
                  ) : (
                    <KubernetesInventoryViewContent
                      queries={queries}
                      contextId={context.contextId}
                      view={view}
                      onCheckLogs={onCheckLogs}
                    />
                  )}
                </Stack>
              ) : null}
            </Stack>
          )
        }
      </KubernetesReadContent>
    </Stack>
  );
}
