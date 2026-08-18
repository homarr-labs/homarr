"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";

import { useRequiredBoard } from "@homarr/boards/context";
import { useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

import { useBoardAddActions } from "~/components/board/use-board-add-actions";
import { UniversalCreateModal } from "~/components/create/universal-create-modal";
import { HeaderButton } from "~/components/layout/header/button";

export default function BoardEditActions() {
  return <AddMenu />;
}

const AddMenu = () => {
  const board = useRequiredBoard();
  const { addWidget, addApp, connectService, addContainer, canConnectService } = useBoardAddActions();
  const { openModal } = useModalAction(UniversalCreateModal);
  const t = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledInitialAdd = useRef(false);

  useEffect(() => {
    if (handledInitialAdd.current || searchParams.get("add") !== "true") return;
    handledInitialAdd.current = true;
    addWidget();

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("add");
    const query = nextSearchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [addWidget, board.id, pathname, router, searchParams]);

  return (
    <HeaderButton
      aria-label={t("board.action.addContent")}
      onClick={() =>
        openModal({
          boardActions: {
            widget: addWidget,
            app: addApp,
            integration: canConnectService ? connectService : undefined,
            container: addContainer,
          },
        })
      }
    >
      <IconPlus stroke={1.5} />
    </HeaderButton>
  );
};
