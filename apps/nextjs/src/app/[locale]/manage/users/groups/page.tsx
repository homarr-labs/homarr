import { notFound } from "next/navigation";
import { Card, Group, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { IconChevronRight, IconUsersGroup } from "@tabler/icons-react";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { everyoneGroup } from "@homarr/definitions";
import { getI18n } from "@homarr/translation/server";
import { Link } from "@homarr/ui";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { AddGroupButton, GroupsList } from "./_client";
import classes from "./groups.module.css";

export default async function GroupsListPage() {
  const session = await auth();

  if (!session?.user.permissions.includes("admin")) {
    return notFound();
  }

  const t = await getI18n();
  const groups = await api.group.getAll();
  const dbEveryoneGroup = groups.find((group) => group.name === everyoneGroup);
  const groupsWithoutEveryone = groups.filter((group) => group.name !== everyoneGroup);

  return (
    <ManagePageLayout title={t("group.title")} primaryAction={<AddGroupButton />} floatingPrimaryAction>
      <Stack>
        {dbEveryoneGroup && (
          <UnstyledButton component={Link} href={`/manage/users/groups/${dbEveryoneGroup.id}`}>
            <Card className={classes.everyoneGroup}>
              <Group align="center">
                <ThemeIcon radius="xl" variant="light">
                  <IconUsersGroup size={16} />
                </ThemeIcon>

                <Stack gap={0} flex={1}>
                  <Text fw={500}>{t("group.defaultGroup.name")}</Text>
                  <Text size="sm" c="gray.6">
                    {t("group.defaultGroup.description", { name: everyoneGroup })}
                  </Text>
                </Stack>
                <IconChevronRight size={20} />
              </Group>
            </Card>
          </UnstyledButton>
        )}

        <GroupsList groups={groupsWithoutEveryone} />
      </Stack>
    </ManagePageLayout>
  );
}
