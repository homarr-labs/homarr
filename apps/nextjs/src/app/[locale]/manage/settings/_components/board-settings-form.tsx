"use client";

import { Group, Switch, Text } from "@mantine/core";
import { IconLayoutDashboard } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { ServerSettings } from "@homarr/server-settings";
import { useScopedI18n } from "@homarr/translation/client";
import { SelectWithCustomItems } from "@homarr/ui";

import { CommonSettingsForm } from "./common-form";

export const BoardSettingsForm = ({ defaultValues }: { defaultValues: ServerSettings["board"] }) => {
  const tBoard = useScopedI18n("management.page.settings.section.board");
  const [selectableBoards] = clientApi.board.getPublicBoards.useSuspenseQuery();

  return (
    <CommonSettingsForm settingKey="board" defaultValues={defaultValues}>
      {(form) => (
        <>
          <SelectWithCustomItems
            label={tBoard("homeBoard.label")}
            description={tBoard("homeBoard.description")}
            data={selectableBoards.map((board) => ({
              value: board.id,
              label: board.name,
              image: board.logoImageUrl,
            }))}
            SelectOption={({ label, image }: { value: string; label: string; image: string | null }) => (
              <Group>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {image ? <img width={16} height={16} src={image} alt={label} /> : <IconLayoutDashboard size={16} />}
                <Text fz="sm" fw={500}>
                  {label}
                </Text>
              </Group>
            )}
            {...form.getInputProps("homeBoardId")}
          />
          <SelectWithCustomItems
            label={tBoard("homeBoard.mobileLabel")}
            description={tBoard("homeBoard.description")}
            data={selectableBoards.map((board) => ({
              value: board.id,
              label: board.name,
              image: board.logoImageUrl,
            }))}
            SelectOption={({ label, image }: { value: string; label: string; image: string | null }) => (
              <Group>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {image ? <img width={16} height={16} src={image} alt={label} /> : <IconLayoutDashboard size={16} />}
                <Text fz="sm" fw={500}>
                  {label}
                </Text>
              </Group>
            )}
            {...form.getInputProps("mobileHomeBoardId")}
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
        </>
      )}
    </CommonSettingsForm>
  );
};
