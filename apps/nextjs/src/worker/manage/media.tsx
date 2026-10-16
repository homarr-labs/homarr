"use client";

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

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { defaultByteUnitSystem, formatBytes } from "@homarr/common";
import { createLocalImageUrl } from "@homarr/icons/local";
import { useI18n } from "@homarr/translation/client";
import { Link, SearchInput, TablePagination, UserAvatar } from "@homarr/ui";
import { useWorkerResourceUrl } from "@homarr/worker-client/resources";

import { CopyMedia } from "~/app/[locale]/manage/medias/_actions/copy-media";
import { DeleteMedia } from "~/app/[locale]/manage/medias/_actions/delete-media";
import { IncludeFromAllUsersSwitch } from "~/app/[locale]/manage/medias/_actions/show-all";
import { UploadMediaButton } from "~/app/[locale]/manage/medias/_actions/upload-media";
import { ManageMobilePrimaryAction } from "~/components/manage/manage-mobile-primary-action";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { NoResults } from "~/components/no-results";
import { useWorkerBootstrap } from "~/worker/context";

import { workerPagination } from "./collections";
import { WorkerQuery } from "./query-state";

export function WorkerMediaRoute({ searchParams }: { searchParams: URLSearchParams }) {
  const input = {
    ...workerPagination(searchParams),
    includeFromAllUsers: searchParams.get("includeFromAllUsers") === "true",
  };
  const query = clientApi.media.getPaginated.useQuery(input);
  const { session } = useWorkerBootstrap();
  const t = useI18n("media");
  const common = useI18n("common");
  const canUpload = session.user.permissions.includes("media-upload");
  return (
    <WorkerQuery query={query}>
      {({ items, totalCount }) => (
        <ManagePageLayout
          title={common("entity.media")}
          primaryAction={
            canUpload && (
              <ManageMobilePrimaryAction>
                <UploadMediaButton />
              </ManageMobilePrimaryAction>
            )
          }
          toolbar={
            <Group>
              <SearchInput placeholder={`${t("search")}...`} ariaLabel={t("search")} defaultValue={input.search} />
              {session.user.permissions.includes("media-view-all") && (
                <IncludeFromAllUsersSwitch defaultChecked={input.includeFromAllUsers} />
              )}
            </Group>
          }
          footer={totalCount > input.pageSize && <TablePagination total={Math.ceil(totalCount / input.pageSize)} />}
          floatingPrimaryAction={canUpload}
        >
          {items.length === 0 && <NoResults icon={IconPhoto} title={t("noResults.title")} />}
          {items.length > 0 && (
            <TableScrollContainer minWidth={680}>
              <Table striped highlightOnHover>
                <TableThead>
                  <TableTr>
                    <TableTh>
                      <VisuallyHidden>{t("field.preview")}</VisuallyHidden>
                    </TableTh>
                    <TableTh>{common("field.name")}</TableTh>
                    <TableTh>{t("field.size")}</TableTh>
                    <TableTh>{t("field.creator")}</TableTh>
                    <TableTh>
                      <VisuallyHidden>{t("field.actions")}</VisuallyHidden>
                    </TableTh>
                  </TableTr>
                </TableThead>
                <TableTbody>
                  {items.map((media) => (
                    <WorkerMediaRow media={media} key={media.id} />
                  ))}
                </TableTbody>
              </Table>
            </TableScrollContainer>
          )}
        </ManagePageLayout>
      )}
    </WorkerQuery>
  );
}

function WorkerMediaRow({ media }: { media: RouterOutputs["media"]["getPaginated"]["items"][number] }) {
  const { session, user } = useWorkerBootstrap();
  const t = useI18n("media");
  const imageUrl = useWorkerResourceUrl(createLocalImageUrl(media.id));
  const canDelete = media.creatorId === session.user.id || session.user.permissions.includes("media-full-all");
  return (
    <TableTr>
      <TableTd w={64}>
        <Image src={imageUrl} alt={media.name} w={64} h={64} fit="contain" />
      </TableTd>
      <TableTh scope="row">{media.name}</TableTh>
      <TableTd>{formatBytes(media.size, { unit: user?.byteUnitSystem ?? defaultByteUnitSystem })}</TableTd>
      <TableTd>
        {media.creator && (
          <Group gap="sm">
            <UserAvatar user={media.creator} size="sm" />
            <Anchor component={Link} href={`/manage/users/${media.creator.id}/general`} size="sm">
              {media.creator.name}
            </Anchor>
          </Group>
        )}
        {!media.creator && "-"}
      </TableTd>
      <TableTd w={64}>
        <Group wrap="nowrap" gap="xs">
          <CopyMedia media={media} />
          <Tooltip label={t("action.open.labelNamed", { name: media.name })} openDelay={500}>
            <ActionIcon
              aria-label={t("action.open.labelNamed", { name: media.name })}
              component="a"
              href={imageUrl}
              disabled={!imageUrl}
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
}
