import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Anchor, Group, Stack, Table, TableTbody, TableTd, TableTh, TableThead, TableTr, Title } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { humanFileSize } from "@homarr/common";
import { getI18n } from "@homarr/translation/server";
import { SearchInput, TablePagination, UserAvatar } from "@homarr/ui";
import { z } from "@homarr/validation";

import { ManageContainer } from "~/components/manage/manage-container";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { CopyMedia } from "./_actions/copy-media";
import { DeleteMedia } from "./_actions/delete-media";
import { IncludeFromAllUsersSwitch } from "./_actions/show-all";
import { UploadMedia } from "./_actions/upload-media";

const searchParamsSchema = z.object({
  search: z.string().optional(),
  includeFromAllUsers: z
    .string()
    .regex(/true|false/)
    .catch("false")
    .transform((value) => value === "true"),
  pageSize: z.string().regex(/\d+/).transform(Number).catch(10),
  page: z.string().regex(/\d+/).transform(Number).catch(1),
});

type SearchParamsSchemaInputFromSchema<TSchema extends Record<string, unknown>> = Partial<{
  [K in keyof TSchema]: Exclude<TSchema[K], undefined> extends unknown[] ? string[] : string;
}>;

interface MediaListPageProps {
  searchParams: SearchParamsSchemaInputFromSchema<z.infer<typeof searchParamsSchema>>;
}

export default async function GroupsListPage(props: MediaListPageProps) {
  const session = await auth();

  if (!session) {
    return notFound();
  }

  const t = await getI18n();
  const searchParams = searchParamsSchema.parse(props.searchParams);
  const { items: medias, totalCount } = await api.media.getPaginated(searchParams);
  const isAdmin = session.user.permissions.includes("admin");

  return (
    <ManageContainer size="xl">
      <DynamicBreadcrumb />
      <Stack>
        <Title>{t("media.plural")}</Title>
        <Group justify="space-between">
          <Group>
            <SearchInput placeholder={`${t("media.search")}...`} defaultValue={searchParams.search} />
            {isAdmin && <IncludeFromAllUsersSwitch defaultChecked={searchParams.includeFromAllUsers} />}
          </Group>

          <UploadMedia />
        </Group>
        <Table striped highlightOnHover>
          <TableThead>
            <TableTr>
              <TableTh></TableTh>
              <TableTh>{t("media.field.name")}</TableTh>
              <TableTh>{t("media.field.size")}</TableTh>
              <TableTh>{t("media.field.creator")}</TableTh>
              <TableTh></TableTh>
            </TableTr>
          </TableThead>
          <TableTbody>
            {medias.map((media) => (
              <Row key={media.id} media={media} />
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
  media: RouterOutputs["media"]["getPaginated"]["items"][number];
}

const Row = ({ media }: RowProps) => {
  return (
    <TableTr>
      <TableTd w={64}>
        <Image
          src={`/api/user-medias/${media.id}`}
          alt={media.name}
          width={64}
          height={64}
          style={{ objectFit: "contain" }}
        />
      </TableTd>
      <TableTd>{media.name}</TableTd>
      <TableTd>{humanFileSize(media.size)}</TableTd>
      <TableTd>
        <Group gap="sm">
          <UserAvatar user={media.creator} size="sm" />
          <Anchor component={Link} href={`/manage/users/${media.creator.id}/general`} size="sm">
            {media.creator.name}
          </Anchor>
        </Group>
      </TableTd>
      <TableTd w={64}>
        <Group wrap="nowrap" gap="xs">
          <CopyMedia media={media} />
          <DeleteMedia media={media} />
        </Group>
      </TableTd>
    </TableTr>
  );
};
