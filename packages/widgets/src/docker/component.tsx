"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useOptionalBoard } from "@homarr/boards/context";
import type { DockerEndpointCapability } from "@homarr/docker";
import { createModal, useModalAction } from "@homarr/modals";
import { useDockerContainerRemovalConfirmation } from "@homarr/modals-collection";
import {
  AddDockerAppToHomarrContent,
  AddDockerAppToHomarrModal,
} from "@homarr/modals-collection/docker/add-docker-app-to-homarr";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useByteFormatter } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { captureLegacyWidgetSession, isLegacyWidgetSessionCurrent } from "../_inputs/widget-app-input";
import { getUsableWidgetQueryData } from "../common/query-state";
import { HomarrDataTable } from "../common/homarr-data-table";
import { usePersistedTableLayout, useTableLayoutPersistence } from "../common/use-persisted-table-layout";
import { DockerView } from "./native-view";
import type { ContainerAction, ContainerActionHandlers } from "./native-view";

type DockerContainer = RouterOutputs["docker"]["getContainers"]["containers"][number];
type DockerEndpoint = RouterOutputs["docker"]["getContainers"]["endpoints"][number];

const createContainerLogsPath = (container: Pick<DockerContainer, "endpointId" | "id" | "name">) =>
  `/manage/tools/docker/logs/${container.id}?name=${encodeURIComponent(container.name)}&endpointId=${encodeURIComponent(container.endpointId)}`;

const getContainerTarget = ({ endpointId, id }: DockerContainer) => ({ endpointId, id });

const getContainersQueryInput = (endpointIds: string[]) => {
  if (endpointIds.length === 0) return undefined;
  return { endpointIds };
};

const getContainerCreationIdentity = (container: DockerContainer) =>
  JSON.stringify([
    container.endpointId,
    container.id,
    container.name,
    container.host,
    container.iconUrl,
    container.ports,
  ]);

interface LegacyDockerAppProps {
  selectedContainers: DockerContainer[];
  endpointIds: string[];
  session: ReturnType<typeof captureLegacyWidgetSession>;
}

function LegacyDockerAppContent({
  innerProps,
  actions,
}: {
  innerProps: LegacyDockerAppProps;
  actions: { closeModal: () => void; capturePresentationOwner: () => { isCurrent: () => boolean } };
}) {
  const session = useSession();
  const inventory = clientApi.docker.getContainers.useQuery(getContainersQueryInput(innerProps.endpointIds), {
    enabled: session.status === "authenticated" && session.data.user.permissions.includes("admin"),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const mutation = clientApi.app.createMany.useMutation({ retry: false });
  const utils = clientApi.useUtils();
  const owner = useRef<{ active: boolean; presentation: { isCurrent: () => boolean } } | null>(null);
  const host = useRef({ session, inventory, mutation, utils, innerProps });
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const lease = { active: true, presentation: actions.capturePresentationOwner() };
    owner.current = lease;
    setReady(true);
    return () => {
      lease.active = false;
    };
  }, []);
  useLayoutEffect(() => {
    host.current = { session, inventory, mutation, utils, innerProps };
    const lease = owner.current;
    if (!lease) return;
    if (
      !isLegacyWidgetSessionCurrent(innerProps.session, session) ||
      session.data?.user.permissions.includes("app-create") !== true
    )
      lease.active = false;
    const containers = inventory.data?.containers;
    if (
      inventory.isSuccess &&
      !inventory.isFetching &&
      containers &&
      innerProps.selectedContainers.some((selected) => {
        const current = containers.find(
          (container) => container.id === selected.id && container.endpointId === selected.endpointId,
        );
        return !current || getContainerCreationIdentity(current) !== getContainerCreationIdentity(selected);
      })
    )
      lease.active = false;
  });
  const isCurrentOwner = useCallback(() => {
    const current = host.current;
    const lease = owner.current;
    const valid =
      lease !== null &&
      lease.active &&
      lease.presentation.isCurrent() &&
      isLegacyWidgetSessionCurrent(current.innerProps.session, current.session) &&
      current.session.data?.user.permissions.includes("app-create") === true;
    if (!valid && lease) lease.active = false;
    return valid;
  }, []);
  const canCreate =
    ready &&
    isCurrentOwner() &&
    inventory.isSuccess &&
    !inventory.isFetching &&
    innerProps.selectedContainers.length > 0;
  const closeOwner = owner.current;
  return (
    <AddDockerAppToHomarrContent
      actions={{
        closeModal() {
          if (!closeOwner || owner.current !== closeOwner || !closeOwner.presentation.isCurrent()) return;
          closeOwner.active = false;
          actions.closeModal();
        },
      }}
      innerProps={{
        selectedContainers: innerProps.selectedContainers,
        createMany: canCreate
          ? async (apps) => {
              const current = host.current;
              const containers = current.inventory.data?.containers;
              if (
                !isCurrentOwner() ||
                !current.inventory.isSuccess ||
                current.inventory.isFetching ||
                !containers ||
                apps.length !== current.innerProps.selectedContainers.length ||
                apps.some((app, index) => {
                  const selected = current.innerProps.selectedContainers[index];
                  if (!selected || app.name !== selected.name || app.iconUrl !== selected.iconUrl) return true;
                  const live = containers.find(
                    (container) => container.id === selected.id && container.endpointId === selected.endpointId,
                  );
                  return !live || getContainerCreationIdentity(live) !== getContainerCreationIdentity(selected);
                })
              )
                throw new Error("Docker app selection unavailable");
              await current.mutation.mutateAsync(apps);
            }
          : undefined,
        onCreated: async () => {
          const requireOwner = () => {
            if (!isCurrentOwner()) throw new Error("Docker app owner retired");
          };
          requireOwner();
          await host.current.utils.app.invalidate(
            undefined,
            {
              refetchType: host.current.session.data?.user.permissions.includes("app-modify-all") ? "active" : "none",
            },
            { throwOnError: true },
          );
          requireOwner();
          await host.current.utils.docker.reconcileServices.invalidate(
            undefined,
            {
              refetchType:
                host.current.session.data?.user.permissions.includes("admin") &&
                host.current.inventory.isSuccess &&
                !host.current.inventory.isFetching
                  ? "active"
                  : "none",
            },
            { throwOnError: true },
          );
          requireOwner();
          await host.current.utils.docker.getServiceHealth.invalidate(
            undefined,
            {
              refetchType:
                host.current.session.data?.user.permissions.includes("admin") &&
                host.current.inventory.isSuccess &&
                !host.current.inventory.isFetching
                  ? "active"
                  : "none",
            },
            { throwOnError: true },
          );
          requireOwner();
        },
        isPending: mutation.isPending || inventory.isFetching,
        isCurrentOwner,
        outcomeLabels: {
          unknown: "The app creation outcome could not be confirmed. Refresh and check before submitting again.",
          reconcileheld: "The apps were created, but refresh failed. Retry refresh, not app creation.",
        },
      }}
    />
  );
}

const LegacyDockerAppModal = createModal<LegacyDockerAppProps>(LegacyDockerAppContent).withOptions(
  AddDockerAppToHomarrModal.options,
);

const endpointHasCapability = (endpoint: DockerEndpoint | undefined, capability: DockerEndpointCapability) =>
  endpoint && "capabilities" in endpoint ? endpoint.capabilities.includes(capability) : true;

const useContainerAction = (action: ContainerAction) => {
  const t = useI18n("docker.action");
  const utils = clientApi.useUtils();
  return clientApi.docker[`${action}All`].useMutation({
    async onSettled() {
      await utils.docker.getContainers.invalidate();
    },
    onSuccess(results) {
      const failed = results.some((result) => !result.success);
      (failed ? showErrorNotification : showSuccessNotification)({
        title: t(`${action}.notification.${failed ? "error" : "success"}.title`),
        message: t(`${action}.notification.${failed ? "error" : "success"}.message`),
      });
    },
    onError() {
      showErrorNotification({
        title: t(`${action}.notification.error.title`),
        message: t(`${action}.notification.error.message`),
      });
    },
  });
};

export default function DockerWidget({
  options,
  width,
  isEditMode,
  displayMode,
  displayScale = 1,
  boardId,
  itemId,
  setOptions,
}: WidgetComponentProps<"dockerContainers">) {
  const t = useI18n("docker");
  const tWidget = useI18n("widget.dockerContainers");
  const { openModal } = useModalAction(LegacyDockerAppModal);
  const confirmRemoval = useDockerContainerRemovalConfirmation();
  const board = useOptionalBoard();
  const observedSession = useSession();
  const session = observedSession.data;
  const { formatBytes } = useByteFormatter();
  const hasChangeAccess = board ? constructBoardPermissions(board, session).hasChangeAccess : false;
  const utils = clientApi.useUtils();
  const containersQuery = clientApi.docker.getContainers.useQuery(getContainersQueryInput(options.endpointIds));
  const data = getUsableWidgetQueryData(containersQuery);
  const addHost = useRef<{
    active: boolean;
    session: typeof observedSession;
    query: typeof containersQuery;
    endpointIds: string[];
  } | null>(null);
  useLayoutEffect(() => {
    const host = {
      active: true,
      session: observedSession,
      query: containersQuery,
      endpointIds: [...options.endpointIds],
    };
    addHost.current = host;
    return () => {
      host.active = false;
    };
  });
  const refreshInventory = clientApi.docker.refreshInventory.useMutation({
    async onSuccess() {
      await Promise.all([
        utils.docker.getContainers.invalidate(),
        utils.docker.reconcileServices.invalidate(),
        utils.docker.getServiceHealth.invalidate(),
      ]);
    },
    onError() {
      showErrorNotification({
        title: t("action.refresh.notification.error.title"),
        message: t("action.refresh.notification.error.message"),
      });
    },
  });
  const { mutate: startContainer } = useContainerAction("start");
  const { mutate: stopContainer } = useContainerAction("stop");
  const { mutate: restartContainer } = useContainerAction("restart");
  const { mutate: removeContainer } = useContainerAction("remove");
  const handleContainerAction = useCallback(
    (action: ContainerAction, container: DockerContainer) => {
      const target = { targets: [getContainerTarget(container)] };
      if (action === "start") startContainer(target);
      else if (action === "stop") stopContainer(target);
      else if (action === "restart") restartContainer(target);
      else confirmRemoval([container], () => removeContainer(target));
    },
    [confirmRemoval, removeContainer, restartContainer, startContainer, stopContainer],
  );
  const handleOpenLogs = useCallback(
    (container: DockerContainer) => window.location.assign(createContainerLogsPath(container)),
    [],
  );
  const handleAddToHomarr = useCallback(
    (container: DockerContainer) => {
      const host = addHost.current;
      if (
        !host?.active ||
        host.session.status !== "authenticated" ||
        !host.session.data.user.permissions.includes("app-create") ||
        !host.query.isSuccess ||
        host.query.isFetching
      )
        return;
      const selected = host.query.data.containers.find(
        (candidate) => candidate.id === container.id && candidate.endpointId === container.endpointId,
      );
      if (!selected || getContainerCreationIdentity(selected) !== getContainerCreationIdentity(container)) return;
      openModal({
        selectedContainers: [{ ...selected, ports: selected.ports?.map((port) => ({ ...port })) }],
        endpointIds: [...host.endpointIds],
        session: captureLegacyWidgetSession(host.session.data),
      });
    },
    [openModal],
  );
  const actionHandlers = useMemo<ContainerActionHandlers>(
    () => ({
      canUse: (container, capability) =>
        endpointHasCapability(
          data?.endpoints.find(({ id }) => id === container.endpointId),
          capability,
        ),
      onAction: handleContainerAction,
      onAddToHomarr: handleAddToHomarr,
      onOpenLogs: handleOpenLogs,
    }),
    [data?.endpoints, handleAddToHomarr, handleContainerAction, handleOpenLogs],
  );
  const { mutate: saveItemOptions } = clientApi.widget.options.saveItemOptions.useMutation({
    onError: () =>
      showErrorNotification({
        title: tWidget("error.layoutSaveTitle"),
        message: tWidget("error.layoutSaveMessage"),
      }),
  });
  const persistLayout = useTableLayoutPersistence({
    boardId,
    hasChangeAccess,
    itemId,
    saveItemOptions,
    setOptions,
  });
  return (
    <DockerView
      options={options}
      width={width}
      isEditMode={isEditMode}
      displayMode={displayMode}
      displayScale={displayScale}
      itemId={itemId}
      data={data}
      isFetching={containersQuery.isFetching}
      refreshInventory={refreshInventory}
      actionHandlers={actionHandlers}
      formatBytes={formatBytes}
      persistLayout={persistLayout}
      HomarrDataTable={HomarrDataTable}
      usePersistedTableLayout={usePersistedTableLayout}
      zoomCompensatedSize={zoomCompensatedSize}
    />
  );
}
