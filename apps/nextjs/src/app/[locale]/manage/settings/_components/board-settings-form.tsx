"use client";

import { Switch, Text } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import type { UseFormReturnType } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";

import { BoardSelect } from "~/components/board/board-select";
import { SectionCard } from "~/components/manage/section-card";
import type { FormValues } from "./settings-form";

interface BoardSettingsFormProps {
  form: UseFormReturnType<FormValues>;
  selectableBoards: RouterOutputs["board"]["getPublicBoards"];
}

export const BoardSettingsForm = ({ form, selectableBoards }: BoardSettingsFormProps) => {
  const tBoard = useI18n("management.page.settings.section.board");
  const tEntities = useI18n("common.entity");

  return (
    <SectionCard title={tEntities("boards")}>
      <BoardSelect
        label={tBoard("homeBoard.label")}
        description={tBoard("homeBoard.description")}
        clearable
        boards={selectableBoards}
        {...form.getInputProps("homeBoardId")}
        withinPortal
      />

      <BoardSelect
        label={tBoard("homeBoard.mobileLabel")}
        description={tBoard("homeBoard.description")}
        clearable
        boards={selectableBoards}
        {...form.getInputProps("mobileHomeBoardId")}
        withinPortal
      />

      <Text fw={500}>{tBoard("status.title")}</Text>
      <Switch
        {...form.getInputProps("enableStatusByDefault", { type: "checkbox" })}
        label={tBoard("status.enableStatusByDefault.label")}
        description={tBoard("status.enableStatusByDefault.description")}
      />
      <Switch
        {...form.getInputProps("forceDisableStatus", { type: "checkbox" })}
        label={tBoard("status.forceDisableStatus.label")}
        description={tBoard("status.forceDisableStatus.description")}
      />
    </SectionCard>
  );
};
