"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Group, Menu } from "@mantine/core";
import { IconBox, IconChevronDown, IconLayoutGridAdd, IconPlug, IconPlus, IconResize } from "@tabler/icons-react";

import { useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useModalAction } from "@homarr/modals";
import { AppSelectModal } from "@homarr/modals-collection";
import { useI18n } from "@homarr/translation/client";

import { useItemActions } from "~/components/board/items/item-actions";
import { ItemSelectModal } from "~/components/board/items/item-select-modal";
import { useContainerActions } from "~/components/board/sections/container/container-actions";
import { IntegrationSelectModal } from "~/components/integration/integration-select-modal";
import { HeaderButton } from "~/components/layout/header/button";

export default function BoardEditActions() {
  return <AddMenu />;
}

const AddMenu = () => {
  const { data: session } = useSession();
  const board = useRequiredBoard();
  const { openModal: openItemSelectModal } = useModalAction(ItemSelectModal);
  const { openModal: openAppSelectModal } = useModalAction(AppSelectModal);
  const { openModal: openIntegrationSelectModal } = useModalAction(IntegrationSelectModal);
  const { addContainer } = useContainerActions();
  const { createItem } = useItemActions();
  const tBoard = useI18n("board");
  const tIntegration = useI18n("integration");
  const tContainer = useI18n("section.container");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledInitialAdd = useRef(false);

  useEffect(() => {
    if (handledInitialAdd.current || searchParams.get("add") !== "true") return;
    handledInitialAdd.current = true;
    openItemSelectModal({ boardId: board.id });

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("add");
    const query = nextSearchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [board.id, openItemSelectModal, pathname, router, searchParams]);

  const handleSelectItem = () => {
    openItemSelectModal({ boardId: board.id });
  };

  const handleSelectApp = () => {
    openAppSelectModal({
      onSelect: (app) => {
        createItem({
          kind: "app",
          options: { appId: app.id },
        });
      },
      onSelectMany: (apps) => {
        for (const app of apps) {
          createItem({
            kind: "app",
            options: { appId: app.id },
          });
        }
      },
      withCreate: session?.user.permissions.includes("app-create") ?? false,
    });
  };

  const handleAddIntegration = () => {
    openIntegrationSelectModal({ completionBoardId: board.id });
  };

  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <HeaderButton w="auto" px={4} aria-label={tBoard("action.addContent")}>
          <Group gap={4} wrap="nowrap">
            <IconPlus stroke={1.5} />
            <IconChevronDown color="gray" size={16} />
          </Group>
        </HeaderButton>
      </Menu.Target>
      <Menu.Dropdown style={{ transform: "translate(-3px, 0)" }}>
        <Menu.Item leftSection={<IconResize size={20} />} onClick={handleSelectItem}>
          {tBoard("emptyState.addWidget")}
        </Menu.Item>
        <Menu.Item leftSection={<IconBox size={20} />} onClick={handleSelectApp}>
          {tBoard("emptyState.addApp")}
        </Menu.Item>
        {session?.user.permissions.includes("integration-create") && (
          <Menu.Item leftSection={<IconPlug size={20} />} onClick={handleAddIntegration}>
            {tIntegration("action.create")}
          </Menu.Item>
        )}
        <Menu.Divider />
        <Menu.Item leftSection={<IconLayoutGridAdd size={20} />} onClick={addContainer}>
          {tContainer("action.create")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
