import Link from "next/link";
import {
  Anchor,
  Container,
  Group,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Title,
} from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { getI18n } from "@homarr/translation/server";
import { SearchInput, TablePagination, UserAvatarGroup } from "@homarr/ui";
import { z } from "@homarr/validation";

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
  searchParams: SearchParamsSchemaInputFromSchema<z.infer<typeof searchParamsSchema>>;
}

export default async function GroupsListPage(props: GroupsListPageProps) {
  const t = await getI18n();
  const searchParams = searchParamsSchema.parse(props.searchParams);
  const { items: groups, totalCount } = await api.group.getPaginated(searchParams);

  return (
    <Container size="xl">
      <Stack>
        <Title>{t("group.title")}</Title>
        <Group justify="space-between">
          <SearchInput
            placeholder={t("common.rtl", {
              value: t("group.search"),
              symbol: "...",
            })}
            defaultValue={searchParams.search}
          />
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
    </Container>
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
