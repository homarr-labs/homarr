import Link from "next/link";
import { notFound } from "next/navigation";
import { Anchor, Group, Stack, Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Title } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";
import { SearchInput, TablePagination, UserAvatarGroup } from "@homarr/ui";
import { z } from "@homarr/validation";

import { ManageContainer } from "~/components/manage/manage-container";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { AddGroup } from "./_add-group";

const searchParamsSchema = z.object({
  search: z.string().optional(),
  pageSize: z.string().regex(/\d+/).transform(Number).catch(10),
  page: z.string().regex(/\d+/).transform(Number).catch(1),
});

type SearchParamsSchemaInputFromSchema<TSchema extends Record<string, unknown>> = Partial<{
  [K in keyof TSchema]: Exclude<TSchema[K], undefined> extends unknown[] ? string[] : string;
}>;

interface GroupsListPageProps {
  searchParams: Promise<SearchParamsSchemaInputFromSchema<z.infer<typeof searchParamsSchema>>>;
}

export default async function GroupsListPage(props: GroupsListPageProps) {
  const session = await auth();

  if (!session?.user.permissions.includes("admin")) {
    return notFound();
  }

  const t = await getI18n();
  const searchParams = searchParamsSchema.parse((await props.searchParams));
  const { items: groups, totalCount } = await api.group.getPaginated(searchParams);

  return (
    <ManageContainer size="xl">
      <DynamicBreadcrumb />
      <Stack>
        <Title>{t("group.title")}</Title>
        <Group justify="space-between">
          <SearchInput placeholder={`${t("group.search")}...`} defaultValue={searchParams.search} />
          <AddGroup />
        </Group>
        <Table striped highlightOnHover>
          <TableThead>
            <TableTr>
              <TableTh>{t("group.field.name")}</TableTh>
              <TableTh>{t("group.field.members")}</TableTh>
            </TableTr>
          </TableThead>
          <TableTbody>
            {groups.map((group) => (
              <Row key={group.id} group={group} />
            ))}
          </TableTbody>
        </Table>

        <Group justify="end">
          <TablePagination total={Math.ceil(totalCount / searchParams.pageSize)} />
        </Group>
      </Stack>
    </ManageContainer>
  );
}

interface RowProps {
  group: RouterOutputs["group"]["getPaginated"]["items"][number];
}

const Row = ({ group }: RowProps) => {
  return (
    <TableTr>
      <TableTd>
        <Anchor component={Link} href={`/manage/users/groups/${group.id}`}>
          {group.name}
        </Anchor>
      </TableTd>
      <TableTd>
        <UserAvatarGroup users={group.members} size="sm" limit={5} />
      </TableTd>
    </TableTr>
  );
};
