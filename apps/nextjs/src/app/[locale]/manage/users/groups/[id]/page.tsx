import { api } from "@homarr/api/server";
import { getScopedI18n } from "@homarr/translation/server";
import {
  Card,
  CardSection,
  Divider,
  Group,
  Stack,
  Text,
  Title,
} from "@homarr/ui";

import { DeleteGroup } from "./_delete-group";
import { RenameGroupForm } from "./_rename-group-form";
import { TransferGroupOwnership } from "./_transfer-group-ownership";

interface GroupsDetailPageProps {
  params: {
    id: string;
  };
}

export default async function GroupsDetailPage({
  params,
}: GroupsDetailPageProps) {
  const group = await api.group.byId({ id: params.id });
  const tGeneral = await getScopedI18n("management.page.group.setting.general");
  const tGroupAction = await getScopedI18n("group.action");

  return (
    <Stack>
      <Title>{tGeneral("title")}</Title>

      <RenameGroupForm group={group} />

      <Stack gap="sm">
        <Title c="red.8" order={2}>
          {tGeneral("dangerZone")}
        </Title>
        <Card withBorder style={{ borderColor: "var(--mantine-color-red-8)" }}>
          <Stack gap="sm">
            <Group justify="space-between" px="md">
              <Stack gap={0}>
                <Text fw="bold" size="sm">
                  {tGroupAction("transfer.label")}
                </Text>
                <Text size="sm">{tGroupAction("transfer.description")}</Text>
              </Stack>
              <Group justify="end" w={{ base: "100%", xs: "auto" }}>
                <TransferGroupOwnership group={group} />
              </Group>
            </Group>

            <CardSection>
              <Divider />
            </CardSection>

            <Group justify="space-between" px="md">
              <Stack gap={0}>
                <Text fw="bold" size="sm">
                  {tGroupAction("delete.label")}
                </Text>
                <Text size="sm">{tGroupAction("delete.description")}</Text>
              </Stack>
              <Group justify="end" w={{ base: "100%", xs: "auto" }}>
                <DeleteGroup group={group} />
              </Group>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Stack>
  );
}
