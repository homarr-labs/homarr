import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { everyoneGroup } from "@homarr/definitions";
import { getScopedI18n } from "@homarr/translation/server";

import { DangerZoneItem, DangerZoneRoot } from "~/components/manage/danger-zone";
import { DeleteGroup } from "./_delete-group";
import { RenameGroupForm } from "./_rename-group-form";
import { ReservedGroupAlert } from "./_reserved-group-alert";
import { TransferGroupOwnership } from "./_transfer-group-ownership";

interface GroupsDetailPageProps {
  params: {
    id: string;
  };
}

export default async function GroupsDetailPage({ params }: GroupsDetailPageProps) {
  const group = await api.group.getById({ id: params.id });
  const tGeneral = await getScopedI18n("management.page.group.setting.general");
  const tGroupAction = await getScopedI18n("group.action");
  const isReserved = group.name === everyoneGroup;

  return (
    <Stack>
      <Title>{tGeneral("title")}</Title>

      {isReserved && <ReservedGroupAlert />}

      <RenameGroupForm group={group} disabled={isReserved} />

      {!isReserved && (
        <DangerZoneRoot>
          <DangerZoneItem
            label={tGroupAction("transfer.label")}
            description={tGroupAction("transfer.description")}
            action={<TransferGroupOwnership group={group} />}
          />

          <DangerZoneItem
            label={tGroupAction("delete.label")}
            description={tGroupAction("delete.description")}
            action={<DeleteGroup group={group} />}
          />
        </DangerZoneRoot>
      )}
    </Stack>
  );
}
