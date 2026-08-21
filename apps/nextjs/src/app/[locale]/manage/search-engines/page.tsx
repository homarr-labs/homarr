import { redirect } from "next/navigation";
import { ActionIcon, ActionIconGroup, Anchor, Avatar, Badge, Text } from "@mantine/core";
import { IconPencil, IconSearch } from "@tabler/icons-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getSafeApplicationUrl } from "@homarr/common";
import type { inferSearchParamsFromSchema } from "@homarr/common/types";
import { getI18n } from "@homarr/translation/server";
import { Link, SearchInput, TablePagination } from "@homarr/ui";

import { ManageCollectionItem, ManageCollectionPage } from "~/components/manage/manage-collection";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { NoResults } from "~/components/no-results";
import { SearchEngineDeleteButton } from "./_search-engine-delete-button";

const searchParamsSchema = z.object({
  search: z.string().optional(),
  pageSize: z.string().regex(/\d+/).transform(Number).catch(10),
  page: z.string().regex(/\d+/).transform(Number).catch(1),
});

interface SearchEnginesPageProps {
  searchParams: Promise<inferSearchParamsFromSchema<typeof searchParamsSchema>>;
}

export default async function SearchEnginesPage(props: SearchEnginesPageProps) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const searchParams = searchParamsSchema.parse(await props.searchParams);
  const { items: searchEngines, totalCount } = await api.searchEngine.getPaginated(searchParams);
  const t = await getI18n("search.engine");
  const tCommon = await getI18n("common");
  const canCreate = session.user.permissions.includes("search-engine-create");
  const canModify = session.user.permissions.includes("search-engine-modify-all");
  const canDelete = session.user.permissions.includes("search-engine-full-all");
  const hasSearch = Boolean(searchParams.search?.trim());

  return (
    <ManageCollectionPage
      title={tCommon("entity.searchEngines")}
      ariaLabel={t("page.list.ariaLabel")}
      itemCount={searchEngines.length}
      emptyState={
        hasSearch ? (
          <NoResults
            icon={IconSearch}
            title={t("page.list.noResults.filteredTitle")}
            description={t("page.list.noResults.filteredDescription", { search: searchParams.search ?? "" })}
            action={{ label: tCommon("action.clearSearch"), href: "/manage/search-engines" }}
          />
        ) : (
          <NoResults
            icon={IconSearch}
            title={t("page.list.noResults.title")}
            description={t("page.list.noResults.description")}
            action={{
              label: t("page.list.noResults.action"),
              href: "/manage/search-engines/new",
              hidden: !canCreate,
            }}
          />
        )
      }
      primaryAction={
        canCreate ? (
          <MobileAffixButton component={Link} href="/manage/search-engines/new">
            {t("page.create.title")}
          </MobileAffixButton>
        ) : undefined
      }
      toolbar={
        <SearchInput
          placeholder={`${t("search")}...`}
          ariaLabel={t("search")}
          defaultValue={searchParams.search}
          flexExpand
        />
      }
      footer={
        totalCount > searchParams.pageSize ? (
          <TablePagination total={Math.ceil(totalCount / searchParams.pageSize)} />
        ) : undefined
      }
      floatingPrimaryAction={canCreate}
    >
      {searchEngines.map((searchEngine) => (
        <SearchEngineItem
          key={searchEngine.id}
          searchEngine={searchEngine}
          canModify={canModify}
          canDelete={canDelete}
        />
      ))}
    </ManageCollectionPage>
  );
}

interface SearchEngineItemProps {
  searchEngine: RouterOutputs["searchEngine"]["getPaginated"]["items"][number];
  canModify: boolean;
  canDelete: boolean;
}

const SearchEngineItem = async ({ searchEngine, canModify, canDelete }: SearchEngineItemProps) => {
  const t = await getI18n("search.engine");
  const actionT = await getI18n("common.action");
  const isIntegration = searchEngine.type === "fromIntegration";
  const previewUrl =
    searchEngine.type === "generic" && searchEngine.urlTemplate !== null
      ? getSafeApplicationUrl(searchEngine.urlTemplate.replace("%s", "test"))
      : undefined;

  return (
    <ManageCollectionItem
      leading={
        <Avatar size={36} src={searchEngine.iconUrl} radius="sm" styles={{ image: { objectFit: "contain" } }} alt="" />
      }
      title={
        <Text component="span" fw={600} lineClamp={1}>
          {searchEngine.name}
        </Text>
      }
      badges={
        <Badge size="sm" variant="light" color={isIntegration ? "blue" : "gray"}>
          {t(`page.list.type.${searchEngine.type}`)}
        </Badge>
      }
      description={
        searchEngine.description ? (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {searchEngine.description}
          </Text>
        ) : undefined
      }
      metadata={
        previewUrl ? (
          <Anchor
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            lineClamp={1}
            size="sm"
            style={{ wordBreak: "break-all" }}
          >
            {searchEngine.urlTemplate}
          </Anchor>
        ) : undefined
      }
      actions={
        canModify || canDelete ? (
          <ActionIconGroup>
            {canModify && (
              <ActionIcon
                component={Link}
                href={`/manage/search-engines/edit/${searchEngine.id}`}
                variant="subtle"
                color="gray"
                size={44}
                aria-label={actionT("editNamed", { name: searchEngine.name })}
              >
                <IconPencil size={18} stroke={1.5} />
              </ActionIcon>
            )}
            {canDelete && <SearchEngineDeleteButton searchEngine={searchEngine} />}
          </ActionIconGroup>
        ) : undefined
      }
    />
  );
};
