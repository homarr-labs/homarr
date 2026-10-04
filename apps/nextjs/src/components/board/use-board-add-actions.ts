"use client";

import { useCallback } from "react";

import { useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useModalAction } from "@homarr/modals";
import { AppSelectModal } from "@homarr/modals-collection";

import { IntegrationSelectModal } from "~/components/integration/integration-select-modal";
import { useItemActions } from "./items/item-actions";
import { ItemSelectModal } from "./items/item-select-modal";
import { useContainerActions } from "./sections/container/container-actions";

export const useBoardAddActions = () => {
  const { data: session } = useSession();
  const board = useRequiredBoard();
  const { openModal: openItemSelectModal } = useModalAction(ItemSelectModal);
  const { openModal: openAppSelectModal } = useModalAction(AppSelectModal);
  const { openModal: openIntegrationSelectModal } = useModalAction(IntegrationSelectModal);
  const { addContainer } = useContainerActions();
  const { createItem } = useItemActions();
  const canCreateApp = session?.user.permissions.includes("app-create") ?? false;
  const canConnectService = session?.user.permissions.includes("integration-create") ?? false;
  const addWidget = useCallback(() => openItemSelectModal({ boardId: board.id }), [board.id, openItemSelectModal]);
  const addApp = useCallback(
    () =>
      openAppSelectModal({
        onSelectMany: (apps) => {
          apps.forEach((app) => createItem({ kind: "app", options: { appId: app.id } }));
        },
        withCreate: canCreateApp,
      }),
    [canCreateApp, createItem, openAppSelectModal],
  );
  const connectService = useCallback(
    () => openIntegrationSelectModal({ completionBoardId: board.id }),
    [board.id, openIntegrationSelectModal],
  );

  return {
    addWidget,
    addApp,
    connectService,
    addContainer,
    canConnectService,
  };
};
