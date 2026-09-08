"use client";

import { Menu } from "@mantine/core";
import { IconBox, IconLayoutGridAdd, IconPlug, IconResize } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";
import { useBoardAddActions } from "./use-board-add-actions";
import { useOptionalBoardEditing } from "~/app/[locale]/boards/(content)/_editing-provider";

export const BoardAddMenuItems = () => {
  const editing = useOptionalBoardEditing();
  const { addWidget, addApp, connectService, addContainer, canConnectService } = useBoardAddActions();
  const tBoard = useI18n("board");
  const tIntegration = useI18n("integration");
  const tContainer = useI18n("section.container");
  const run = async (action: () => void) => {
    if (await editing?.enter()) action();
  };
  return (
    <>
      <Menu.Item leftSection={<IconResize size={20} />} onClick={() => void run(addWidget)}>
        {tBoard("emptyState.addWidget")}
      </Menu.Item>
      <Menu.Item leftSection={<IconBox size={20} />} onClick={() => void run(addApp)}>
        {tBoard("emptyState.addApp")}
      </Menu.Item>
      {canConnectService && (
        <Menu.Item leftSection={<IconPlug size={20} />} onClick={() => void run(connectService)}>
          {tIntegration("action.create")}
        </Menu.Item>
      )}
      <Menu.Divider />
      <Menu.Item leftSection={<IconLayoutGridAdd size={20} />} onClick={() => void run(addContainer)}>
        {tContainer("action.create")}
      </Menu.Item>
    </>
  );
};
