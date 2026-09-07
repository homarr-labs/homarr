import { notFound, redirect } from "next/navigation";
import {
  ActionIcon,
  Anchor,
  Group,
  Image,
  Table,
  TableScrollContainer,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Tooltip,
  VisuallyHidden,
} from "@mantine/core";
import { IconExternalLink, IconPhoto } from "@tabler/icons-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { getRscUserSettingsAsync } from "@homarr/api/user-server";
import { auth } from "@homarr/auth/next";
import { defaultByteUnitSystem, formatBytes } from "@homarr/common";
import type { ByteUnitSystem } from "@homarr/common";
import type { inferSearchParamsFromSchema } from "@homarr/common/types";
import { createLocalImageUrl } from "@homarr/icons/local";
import { getI18n } from "@homarr/translation/server";
import { Link, SearchInput, TablePagination, UserAvatar } from "@homarr/ui";

import { ManageMobilePrimaryAction } from "~/components/manage/manage-mobile-primary-action";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { NoResults } from "~/components/no-results";
import { CopyMedia } from "./_actions/copy-media";
import { DeleteMedia } from "./_actions/delete-media";
import { IncludeFromAllUsersSwitch } from "./_actions/show-all";
import { UploadMediaButton } from "./_actions/upload-media";

const searchParamsSchema = z.object({
  search: z.string().optional(),
  includeFromAllUsers: z
    .string()
    .regex(/^(?:true|false)$/u)
    .catch("false")
    .transform((value) => value === "true"),
  pageSize: z
    .string()
    .regex(/^[1-9]\d*$/u)
    .transform(Number)
    .pipe(z.number().int().positive().max(100))
    .catch(10),
  page: z
    .string()
    .regex(/^[1-9]\d*$/u)
    .transform(Number)
    .pipe(z.number().int().positive())
    .catch(1),
});

interface MediaListPageProps {
  searchParams: Promise<inferSearchParamsFromSchema<typeof searchParamsSchema>>;
}

export default async function MediaListPage(props: MediaListPageProps) {
  const session = await auth();

  if (!session) {
    return notFound();
  }

  const tMedia = await getI18n("media");
  const [tCommon, tEntities] = await Promise.all([getI18n("common"), getI18n("common.entity")]);
  const searchParams = searchParamsSchema.parse(await props.searchParams);
  const [{ items: medias, totalCount }, userSettings] = await Promise.all([
    api.media.getPaginated(searchParams),
    getRscUserSettingsAsync(session.user.id),
  ]);
  const totalPages = Math.ceil(totalCount / searchParams.pageSize);

  if (totalPages > 0 && searchParams.page > totalPages) {
    const params = createPaginationSearchParams(searchParams, totalPages);
    redirect(`/manage/medias?${params.toString()}`);
  }

  const canUpload = session.user.permissions.includes("media-upload");

  return (
    <ManagePageLayout
      title={tEntities("media")}
      primaryAction={
        canUpload ? (
          <ManageMobilePrimaryAction>
            <UploadMediaButton />
          </ManageMobilePrimaryAction>
        ) : undefined
      }
      toolbar={
        <Group>
          <SearchInput
            placeholder={`${tMedia("search")}...`}
            ariaLabel={tMedia("search")}
            defaultValue={searchParams.search}
          />
          {session.user.permissions.includes("media-view-all") && (
            <IncludeFromAllUsersSwitch defaultChecked={searchParams.includeFromAllUsers} />
          )}
        </Group>
      }
      footer={totalPages > 1 ? <TablePagination total={totalPages} /> : undefined}
      floatingPrimaryAction={canUpload}
    >
      {medias.length === 0 && <NoResults icon={IconPhoto} title={tMedia("noResults.title")} />}
      {medias.length > 0 && (
        <TableScrollContainer minWidth={680}>
          <Table striped highlightOnHover>
            <TableThead>
              <TableTr>
                <TableTh>
                  <VisuallyHidden>{tMedia("field.preview")}</VisuallyHidden>
                </TableTh>
                <TableTh>{tCommon("field.name")}</TableTh>
                <TableTh>{tMedia("field.size")}</TableTh>
                <TableTh>{tMedia("field.creator")}</TableTh>
                <TableTh>
                  <VisuallyHidden>{tMedia("field.actions")}</VisuallyHidden>
                </TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {medias.map((media) => (
                <Row
                  key={media.id}
                  media={media}
                  byteUnitSystem={userSettings?.byteUnitSystem ?? defaultByteUnitSystem}
                />
              ))}
            </TableTbody>
          </Table>
        </TableScrollContainer>
      )}
    </ManagePageLayout>
  );
}

interface RowProps {
  media: RouterOutputs["media"]["getPaginated"]["items"][number];
  byteUnitSystem: ByteUnitSystem;
}

const Row = async ({ media, byteUnitSystem }: RowProps) => {
  const session = await auth();
  const tMedia = await getI18n("media");
  const canDelete = media.creatorId === session?.user.id || session?.user.permissions.includes("media-full-all");

  return (
    <TableTr>
      <TableTd w={64}>
        <Image
          // Switched to mantine image because next/image doesn't support svgs
          src={createLocalImageUrl(media.id)}
          alt={media.name}
          w={64}
          h={64}
          fit="contain"
        />
      </TableTd>
      <TableTh scope="row">{media.name}</TableTh>
      <TableTd>{formatBytes(media.size, { unit: byteUnitSystem })}</TableTd>
      <TableTd>
        {media.creator ? (
          <Group gap="sm">
            <UserAvatar user={media.creator} size="sm" />
            <Anchor component={Link} href={`/manage/users/${media.creator.id}/general`} size="sm">
              {media.creator.name}
            </Anchor>
          </Group>
        ) : (
          "-"
        )}
      </TableTd>
      <TableTd w={64}>
        <Group wrap="nowrap" gap="xs">
          <CopyMedia media={media} />
          <Tooltip label={tMedia("action.open.labelNamed", { name: media.name })} openDelay={500}>
            <ActionIcon
              aria-label={tMedia("action.open.labelNamed", { name: media.name })}
              component="a"
              href={createLocalImageUrl(media.id)}
              target="_blank"
              rel="noopener noreferrer"
              color="gray"
              variant="subtle"
            >
              <IconExternalLink size={16} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
          {canDelete && <DeleteMedia media={media} />}
        </Group>
      </TableTd>
    </TableTr>
  );
};

const createPaginationSearchParams = (searchParams: z.infer<typeof searchParamsSchema>, page: number) => {
  const params = new URLSearchParams({ page: page.toString() });

  if (searchParams.search) params.set("search", searchParams.search);
  if (searchParams.includeFromAllUsers) params.set("includeFromAllUsers", "true");
  if (searchParams.pageSize !== 10) params.set("pageSize", searchParams.pageSize.toString());

  return params;
};
