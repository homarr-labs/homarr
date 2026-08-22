import { Fragment } from "react";
import { notFound, redirect } from "next/navigation";
import { ActionIcon, ActionIconGroup, Anchor, Avatar, Text } from "@mantine/core";
import { IconBox, IconPencil } from "@tabler/icons-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getSafeAppHref } from "@homarr/common";
import type { inferSearchParamsFromSchema } from "@homarr/common/types";
import { getI18n } from "@homarr/translation/server";
import { Link, SearchInput, TablePagination } from "@homarr/ui";

import { TourTarget } from "~/components/layout/header/tour-target";
import { ManageCollectionItem, ManageCollectionPage } from "~/components/manage/manage-collection";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { NoResults } from "~/components/no-results";
import { getAppsSectionAccess } from "../_access";
import { AppDeleteButton } from "./_app-delete-button";

const searchParamsSchema = z.object({
  search: z.string().optional(),
  pageSize: z
    .string()
    .regex(/^[1-9]\d*$/u)
    .transform(Number)
    .pipe(z.number().int().positive())
    .catch(10),
  page: z
    .string()
    .regex(/^[1-9]\d*$/u)
    .transform(Number)
    .pipe(z.number().int().positive())
    .catch(1),
});

interface AppsPageProps {
  searchParams: Promise<inferSearchParamsFromSchema<typeof searchParamsSchema>>;
}

export default async function AppsPage(props: AppsPageProps) {
  const session = await auth();
  if (!session) redirect("/auth/login");
  const { canManageAll, canCreate, canAccess } = getAppsSectionAccess(session);
  if (!canAccess) notFound();
  const canDelete = session.user.permissions.includes("app-full-all");

  const searchParams = searchParamsSchema.parse(await props.searchParams);
  // Without app-modify-all the user may add apps but not browse the ones they cannot manage,
  // so the list stays empty instead of leaking every app name and URL.
  const { items: apps, totalCount } = canManageAll
    ? await api.app.getPaginated(searchParams)
    : { items: [], totalCount: 0 };
  const t = await getI18n("app");
  const tCommon = await getI18n("common");
  const hasSearch = canManageAll && Boolean(searchParams.search?.trim());

  const emptyState = !canManageAll ? (
    <NoResults
      icon={IconBox}
      title={t("page.list.noResults.createOnlyTitle")}
      description={t("page.list.noResults.createOnlyDescription")}
      action={{ label: t("page.list.noResults.action"), href: "/manage/apps/new" }}
    />
  ) : hasSearch ? (
    <NoResults
      icon={IconBox}
      title={t("page.list.noResults.filteredTitle")}
      description={t("page.list.noResults.filteredDescription", { search: searchParams.search ?? "" })}
      action={{ label: tCommon("action.clearSearch"), href: "/manage/apps" }}
    />
  ) : (
    <NoResults
      icon={IconBox}
      title={t("page.list.noResults.title")}
      description={t("page.list.noResults.description")}
      action={{ label: t("page.list.noResults.action"), href: "/manage/apps/new", hidden: !canCreate }}
    />
  );

  const page = (
    <ManageCollectionPage
      title={tCommon("entity.apps")}
      ariaLabel={t("page.list.ariaLabel")}
      itemCount={apps.length}
      emptyState={emptyState}
      primaryAction={
        canCreate ? (
          <TourTarget id="manage-apps-create">
            <MobileAffixButton component={Link} href="/manage/apps/new">
              {t("page.create.title")}
            </MobileAffixButton>
          </TourTarget>
        ) : undefined
      }
      toolbar={
        canManageAll ? (
          <SearchInput
            placeholder={`${t("search")}...`}
            ariaLabel={t("search")}
            defaultValue={searchParams.search}
            flexExpand
          />
        ) : undefined
      }
      footer={
        totalCount > searchParams.pageSize ? (
          <TablePagination total={Math.ceil(totalCount / searchParams.pageSize)} />
        ) : undefined
      }
      floatingPrimaryAction={canCreate}
    >
      {apps.map((app) => (
        <AppItem
          key={app.id}
          app={app}
          canDelete={canDelete}
          editLabel={tCommon("action.editNamed", { name: app.name })}
        />
      ))}
    </ManageCollectionPage>
  );

  return apps.length > 0 ? <TourTarget id="manage-apps-list">{page}</TourTarget> : page;
}

interface AppItemProps {
  app: RouterOutputs["app"]["getPaginated"]["items"][number];
  canDelete: boolean;
  editLabel: string;
}

const AppItem = ({ app, canDelete, editLabel }: AppItemProps) => {
  const descriptionLines = app.description?.split("\n");
  const safeHref = getSafeAppHref(app.href);

  return (
    <ManageCollectionItem
      leading={<Avatar size={36} src={app.iconUrl} radius="sm" styles={{ image: { objectFit: "contain" } }} alt="" />}
      title={
        <Text component="span" fw={600} lineClamp={1}>
          {app.name}
        </Text>
      }
      description={
        descriptionLines ? (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {descriptionLines.map((line, index) => (
              <Fragment key={index}>
                {line}
                {index < descriptionLines.length - 1 && <br />}
              </Fragment>
            ))}
          </Text>
        ) : undefined
      }
      metadata={
        safeHref ? (
          <Anchor
            href={safeHref}
            target="_blank"
            rel="noreferrer"
            lineClamp={1}
            size="sm"
            style={{ wordBreak: "break-all" }}
          >
            {app.href}
          </Anchor>
        ) : undefined
      }
      actions={
        <ActionIconGroup>
          <ActionIcon
            component={Link}
            href={`/manage/apps/edit/${app.id}`}
            variant="subtle"
            color="gray"
            size={44}
            aria-label={editLabel}
          >
            <IconPencil size={18} stroke={1.5} />
          </ActionIcon>
          {canDelete && <AppDeleteButton app={app} />}
        </ActionIconGroup>
      }
    />
  );
};
