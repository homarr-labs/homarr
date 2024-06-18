import type { PropsWithChildren } from "react";
import Link from "next/link";
import { Button, Grid, GridCol, Group, Stack, Text, Title } from "@mantine/core";
import { IconLock, IconSettings, IconUsersGroup } from "@tabler/icons-react";

import { api } from "@homarr/api/server";
import { getI18n, getScopedI18n } from "@homarr/translation/server";

import { ManageContainer } from "~/components/manage/manage-container";
import { NavigationLink } from "./_navigation";

interface LayoutProps {
  params: { id: string };
}

export default async function Layout({ children, params }: PropsWithChildren<LayoutProps>) {
  const t = await getI18n();
  const tGroup = await getScopedI18n("management.page.group");
  const group = await api.group.getById({ id: params.id });

  return (
    <ManageContainer size="xl">
      <Grid>
        <GridCol span={12}>
          <Group justify="space-between" align="center">
            <Stack gap={0}>
              <Title order={3}>{group.name}</Title>
              <Text c="gray.5">{t("group.name")}</Text>
            </Stack>
            <Button component={Link} href="/manage/users/groups" color="gray" variant="light">
              {tGroup("back")}
            </Button>
          </Group>
        </GridCol>
        <GridCol span={{ xs: 12, md: 4, lg: 3, xl: 2 }}>
          <Stack>
            <Stack gap={0}>
              <NavigationLink
                href={`/manage/users/groups/${params.id}`}
                label={tGroup("setting.general.title")}
                icon={<IconSettings size="1rem" stroke={1.5} />}
              />
              <NavigationLink
                href={`/manage/users/groups/${params.id}/members`}
                label={tGroup("setting.members.title")}
                icon={<IconUsersGroup size="1rem" stroke={1.5} />}
              />
              <NavigationLink
                href={`/manage/users/groups/${params.id}/permissions`}
                label={tGroup("setting.permissions.title")}
                icon={<IconLock size="1rem" stroke={1.5} />}
              />
            </Stack>
          </Stack>
        </GridCol>
        <GridCol span={{ xs: 12, md: 8, lg: 9, xl: 10 }}>{children}</GridCol>
      </Grid>
    </ManageContainer>
  );
}
