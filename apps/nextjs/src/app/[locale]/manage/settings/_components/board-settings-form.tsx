"use client";

import { Group, Text } from "@mantine/core";
import { IconLayoutDashboard } from "@tabler/icons-react";
import { SelectWithCustomItems } from "node_modules/@homarr/ui/src/components/select-with-custom-items";

import { clientApi } from "@homarr/api/client";
import type { ServerSettings } from "@homarr/server-settings";

import { CommonSettingsForm } from "./common-form";

export const BoardSettingsForm = ({ defaultValues }: { defaultValues: ServerSettings["board"] }) => {
  const [selectableBoards] = clientApi.board.getPublicBoards.useSuspenseQuery();

  return (
    <CommonSettingsForm settingKey="board" defaultValues={defaultValues}>
      {(form) => (
        <>
          <SelectWithCustomItems
            label="Global default board"
            description="Only public boards are available for selection"
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
            {...form.getInputProps("defaultBoardId")}
          />
        </>
      )}
    </CommonSettingsForm>
  );
};
