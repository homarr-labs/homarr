"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ActionIcon, Button, Group, Select, Stack, Tooltip } from "@mantine/core";
import { IconBuildingStore, IconExternalLink } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import { Link, SearchInput, TablePagination } from "@homarr/ui";
import { useWorkshopQuery } from "@homarr/workshop/backend";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { NoResults } from "~/components/no-results";
import { getWorkshopWebUrl } from "~/components/workshop/workshop-client";
import { WorkshopAccountButton, useWorkshopSession } from "~/components/workshop/workshop-session";
import { WorkshopSubmissionGrid } from "~/components/workshop/workshop-submission-grid";
import { WorkshopVoteControl } from "~/components/workshop/workshop-vote-control";
import { CustomWidgetTabs } from "../_custom-widget-tabs";

export const WORKSHOP_PAGE_SIZE = 12;

interface WorkshopBrowseProps {
  search: string | undefined;
  sort: "top" | "newest";
  page: number;
}

export function WorkshopBrowse({ search, sort, page }: WorkshopBrowseProps) {
  const t = useI18n("workshop");
  const tCommon = useI18n("common.action");
  const session = useWorkshopSession();
  const query = useWorkshopQuery(session.client, {
    page,
    perPage: WORKSHOP_PAGE_SIZE,
    type: "customWidget",
    sort,
    search,
  });
  const totalPages = query.data?.totalPages ?? 1;

  return (
    <ManagePageLayout
      title={t("title")}
      primaryAction={
        <Group gap="xs" wrap="nowrap">
          <WorkshopAccountButton session={session} />
          <Button
            component="a"
            href={getWorkshopWebUrl()}
            target="_blank"
            rel="noopener noreferrer"
            variant="default"
            leftSection={<IconExternalLink size={16} />}
            visibleFrom="sm"
          >
            {t("openCommunity")}
          </Button>
        </Group>
      }
      toolbar={
        <Stack gap="sm">
          <CustomWidgetTabs active="workshop" />
          <Group gap="sm" align="flex-end" wrap="nowrap">
            <SearchInput placeholder={`${t("search")}...`} ariaLabel={t("search")} defaultValue={search} flexExpand />
            <WorkshopSortSelect value={sort} />
          </Group>
        </Stack>
      }
      footer={totalPages > 1 ? <TablePagination total={totalPages} /> : undefined}
    >
      <WorkshopSubmissionGrid
        client={session.client}
        query={query}
        ariaLabel={t("listAriaLabel")}
        emptyState={
          search ? (
            <NoResults
              icon={IconBuildingStore}
              title={t("emptyFilteredTitle")}
              description={t("emptyFilteredDescription", { search })}
              action={{
                label: tCommon("clearSearch"),
                href: "/manage/custom-widgets/workshop",
              }}
            />
          ) : (
            <NoResults icon={IconBuildingStore} title={t("empty")} description={t("emptyDescription")} />
          )
        }
        renderActions={(item) => (
          <>
            <WorkshopVoteControl
              client={session.client}
              submissionId={item.id}
              score={item.score}
              canVote={session.user !== null}
              size="sm"
            />
            <Group gap={4} wrap="nowrap">
              <Tooltip label={t("openCommunity")}>
                <ActionIcon
                  component="a"
                  href={getWorkshopWebUrl(item.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label={t("openOnWorkshop", { title: item.title })}
                >
                  <IconExternalLink size={16} stroke={1.5} />
                </ActionIcon>
              </Tooltip>
              <Button component={Link} href={`/manage/custom-widgets/workshop/${item.id}`} size="sm">
                {t("install")}
              </Button>
            </Group>
          </>
        )}
      />
    </ManagePageLayout>
  );
}

function WorkshopSortSelect({ value }: { value: "top" | "newest" }) {
  const t = useI18n("workshop");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (next: string | null) => {
      const params = new URLSearchParams(searchParams);
      if (next === "newest") params.set("sort", next);
      else params.delete("sort");
      params.delete("page");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return (
    <Select
      aria-label={t("sort")}
      value={value}
      onChange={handleChange}
      allowDeselect={false}
      w={160}
      data={[
        { value: "top", label: t("sortTop") },
        { value: "newest", label: t("sortNewest") },
      ]}
    />
  );
}
