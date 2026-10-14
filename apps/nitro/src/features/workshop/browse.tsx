import { useState } from "react";
import { ActionIcon, Alert, Button, Group, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconBuildingStore, IconExternalLink } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { useI18n } from "@homarr/translation/client";
import { WorkshopBrowseScreen, WorkshopSubmissionGrid } from "../../source-ui/workshop";
import type { WorkshopGridState } from "../../source-ui/workshop/contracts";
import { WorkshopVoteControl } from "./community";
import { useWorkshopFeature, WorkshopTransportHold } from "./scope";

export interface WorkshopBrowseProps {
  onSelect(submissionId: string): void;
  onInstalledList?(): void;
  workshopWebUrl?: string;
  search?: string;
  sort?: "top" | "newest";
  page?: number;
  onFiltersChanged?(filters: { search: string; sort: "top" | "newest"; page: number }): void;
}

export function WorkshopBrowse(props: WorkshopBrowseProps) {
  return <BrowseFlow key={JSON.stringify([props.search, props.sort, props.page])} {...props} />;
}

function BrowseFlow({
  onSelect,
  onInstalledList,
  workshopWebUrl,
  search: initialSearch = "",
  sort: initialSort = "top",
  page: initialPage = 1,
  onFiltersChanged,
}: WorkshopBrowseProps) {
  const { client, transport, queryKey } = useWorkshopFeature();
  const t = useI18n("workshop");
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);
  const filters = (next: { search: string; sort: "top" | "newest"; page: number }) => {
    setSearch(next.search);
    setSort(next.sort);
    setPage(next.page);
    onFiltersChanged?.(next);
  };
  const listing = useQuery({
    queryKey: [
      ...queryKey,
      "community",
      transport.kind === "available" ? transport.authorityKey : "held",
      { search, sort, page },
    ],
    enabled: transport.kind === "available",
    queryFn: ({ signal }) => {
      if (transport.kind !== "available") throw new Error("Workshop transport is not joined");
      return transport.client.list({
        type: "customWidget",
        page,
        perPage: 12,
        search: search || undefined,
        sort,
        signal,
      });
    },
  });
  const nativeSearch = useQuery({
    queryKey: [...queryKey, "search", { search, sort }],
    enabled: transport.kind === "held" && search.length > 0,
    queryFn: ({ signal }) => client.customWidget.workshopSearch({ query: search, sort, limit: 20 }, { signal }),
  });
  let state: WorkshopGridState;
  if (transport.kind === "available") {
    if (listing.isPending) state = { status: "loading" };
    else if (listing.isError)
      state = { status: "failed", pending: listing.isFetching, retry: () => void listing.refetch() };
    else state = { status: "loaded", items: listing.data.items };
  } else if (!search) state = { status: "held", content: <WorkshopTransportHold /> };
  else if (nativeSearch.isPending) state = { status: "loading" };
  else if (nativeSearch.isError)
    state = { status: "failed", pending: nativeSearch.isFetching, retry: () => void nativeSearch.refetch() };
  else state = { status: "loaded", items: nativeSearch.data.items.map((item) => ({ ...item, type: "customWidget" })) };
  const emptyState = (
    <Stack align="center" py="xl">
      <IconBuildingStore size={48} stroke={1.5} />
      <Title order={3}>{search ? t("emptyFilteredTitle") : t("empty")}</Title>
      <Text c="dimmed">{search ? t("emptyFilteredDescription", { search }) : t("emptyDescription")}</Text>
      {search && (
        <Button
          variant="default"
          onClick={() => {
            filters({ search: "", sort, page: 1 });
          }}
        >
          Clear search
        </Button>
      )}
    </Stack>
  );
  return (
    <WorkshopBrowseScreen
      search={search}
      sort={sort}
      page={page}
      totalPages={transport.kind === "available" ? listing.data?.totalPages : undefined}
      fetching={listing.isFetching}
      accountName={transport.kind === "available" ? transport.client.currentUser?.name : undefined}
      accountHold="Workshop account lifecycle is not joined in this preview. Voting, reporting and publication are unavailable."
      workshopWebUrl={workshopWebUrl}
      onInstalledList={onInstalledList}
      onFiltersChanged={filters}
      notice={
        <Alert color="yellow">
          Workshop provider votes, reports, account changes and publication are unavailable in this preview. No
          community changes are submitted.
        </Alert>
      }
    >
      {transport.kind === "held" && search && (
        <Text size="sm">
          Native search shows up to 20 compatible first-page matches. Screenshots and full pagination require the
          Workshop connection.
        </Text>
      )}
      <WorkshopSubmissionGrid
        state={state}
        fileUrl={
          transport.kind === "available"
            ? (id, filename, thumb) => transport.client.fileUrl(id, filename, thumb)
            : undefined
        }
        ariaLabel={t("listAriaLabel")}
        emptyState={emptyState}
        renderActions={(item) => (
          <>
            <WorkshopVoteControl submissionId={item.id} score={item.score} size="sm" />
            <Group gap={4} wrap="nowrap">
              {workshopWebUrl && (
                <Tooltip label={t("openCommunity")}>
                  <ActionIcon
                    component="a"
                    href={`${workshopWebUrl.replace(/\/+$/u, "")}/${encodeURIComponent(item.id)}`}
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
              )}
              <Button size="sm" onClick={() => onSelect(item.id)}>
                {t("install")}
              </Button>
            </Group>
          </>
        )}
      />
    </WorkshopBrowseScreen>
  );
}
