"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Group, Menu } from "@mantine/core";
import { IconChevronDown, IconPlus } from "@tabler/icons-react";

import { useRequiredBoard } from "@homarr/boards/context";
import { useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

import { ItemSelectModal } from "~/components/board/items/item-select-modal";
import { BoardAddMenuItems } from "~/components/board/board-add-menu-items";
import { HeaderButton } from "~/components/layout/header/button";

export default function BoardEditActions() {
  return <AddMenu />;
}

const AddMenu = () => {
  const board = useRequiredBoard();
  const { openModal: openItemSelectModal } = useModalAction(ItemSelectModal);
  const tBoard = useI18n("board");
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
        <BoardAddMenuItems />
      </Menu.Dropdown>
    </Menu>
  );
};
