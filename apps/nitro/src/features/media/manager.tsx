import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Alert,
  Button,
  Group,
  NativeSelect,
  Pagination,
  SegmentedControl,
  Skeleton,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import type { QueryKey, UseQueryOptions } from "@tanstack/react-query";

import { MediaManagementView } from "../../source-ui/media";
import type { MediaManagementViewProps } from "../../source-ui/media";

import { getSourceMediaAccess } from "./access";
import type {
  SourceMediaBindings,
  SourceMediaItem,
  SourceMediaPage,
  SourceMediaPrincipal,
  SourceMediaQueryInput,
  SourceMediaSelection,
  SourceMediaView,
} from "./contracts";
import { SourceMediaGallery } from "./gallery";
import { SourceMediaUploadForm } from "./upload-form";

export interface SourceMediaManagerProps<
  TError = Error,
  TQueryKey extends QueryKey = QueryKey,
  TPage extends SourceMediaPage = SourceMediaPage,
> {
  readonly getPaginatedOptions: (input: SourceMediaQueryInput) => UseQueryOptions<TPage, TError, TPage, TQueryKey>;
  readonly principal: SourceMediaPrincipal;
  readonly authorityRevision: string;
  readonly bindings: SourceMediaBindings;
  readonly readOnly?: boolean;
  readonly onSelect?: (selection: SourceMediaSelection) => void;
  readonly byteUnitSystem?: "binary" | "decimal";
  readonly renderCreator?: (creator: NonNullable<SourceMediaItem["creator"]>) => ReactNode;
  readonly initialInput?: SourceMediaQueryInput;
  readonly onInputChange?: (input: SourceMediaQueryInput) => void;
  readonly renderLayout: MediaManagementViewProps["renderLayout"];
}

export function SourceMediaManager<
  TError = Error,
  TQueryKey extends QueryKey = QueryKey,
  TPage extends SourceMediaPage = SourceMediaPage,
>(props: SourceMediaManagerProps<TError, TQueryKey, TPage>) {
  if (props.principal.kind !== "authenticated") {
    return (
      <Alert title="Sign in required" color="yellow">
        Sign in to view your media.
      </Alert>
    );
  }
  const authorityKey = JSON.stringify([
    props.authorityRevision,
    props.principal.user.id,
    props.principal.user.permissions.toSorted(),
    props.readOnly ?? false,
    props.initialInput,
  ]);
  return <AuthenticatedMediaManager key={authorityKey} {...props} principal={props.principal} />;
}

function AuthenticatedMediaManager<
  TError = Error,
  TQueryKey extends QueryKey = QueryKey,
  TPage extends SourceMediaPage = SourceMediaPage,
>({
  getPaginatedOptions,
  principal,
  bindings,
  readOnly = false,
  onSelect,
  byteUnitSystem,
  renderCreator,
  initialInput,
  onInputChange,
  renderLayout,
}: Omit<SourceMediaManagerProps<TError, TQueryKey, TPage>, "principal"> & {
  readonly principal: Extract<SourceMediaPrincipal, { kind: "authenticated" }>;
}) {
  const [draftSearch, setDraftSearch] = useState(initialInput?.search ?? "");
  const [search, setSearch] = useState(initialInput?.search ?? "");
  const [page, setPage] = useState(initialInput?.page ?? 1);
  const [pageSize, setPageSize] = useState(initialInput?.pageSize ?? 10);
  const [includeFromAllUsers, setIncludeFromAllUsers] = useState(initialInput?.includeFromAllUsers ?? false);
  const [view, setView] = useState<SourceMediaView>("list");
  const [selectedId, setSelectedId] = useState<string>();
  const access = getSourceMediaAccess(principal, readOnly);
  const input = {
    search,
    page,
    pageSize,
    includeFromAllUsers: access.canViewAll && includeFromAllUsers,
  } satisfies SourceMediaQueryInput;
  const query = useQuery({
    ...getPaginatedOptions(input),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const totalPages = Math.max(1, Math.ceil((query.data?.totalCount ?? 0) / pageSize));

  useEffect(() => {
    if (query.data && page > totalPages) {
      setPage(totalPages);
      setSelectedId(undefined);
      onInputChange?.({
        search,
        page: totalPages,
        pageSize,
        includeFromAllUsers: access.canViewAll && includeFromAllUsers,
      });
    }
  }, [page, totalPages, query.data, onInputChange, search, pageSize, access.canViewAll, includeFromAllUsers]);

  function changeInput(patch: Partial<SourceMediaQueryInput>) {
    const next = { ...input, ...patch };
    next.includeFromAllUsers = access.canViewAll && next.includeFromAllUsers;
    setSearch(next.search);
    setPage(next.page);
    setPageSize(next.pageSize);
    setIncludeFromAllUsers(next.includeFromAllUsers);
    setSelectedId(undefined);
    onInputChange?.(next);
  }

  return (
    <MediaManagementView
      renderLayout={renderLayout}
      notice={
        <Alert color="yellow" title="Media changes unavailable">
          Upload and delete are held until the native media transaction is admitted. Local previews do not upload files.
        </Alert>
      }
      primaryAction={
        <SegmentedControl
          aria-label="Media display"
          value={view}
          transitionDuration={0}
          onChange={(value) => {
            if (value === "gallery" || value === "list") setView(value);
          }}
          data={[
            { value: "gallery", label: "Gallery" },
            { value: "list", label: "List" },
          ]}
        />
      }
      toolbar={
        <Stack gap="sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              changeInput({ search: draftSearch.trim(), page: 1 });
            }}
          >
            <Group align="flex-end">
              <TextInput
                label="Search media"
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.currentTarget.value)}
                flex={1}
                miw={180}
              />
              <Button type="submit">Search media</Button>
              {(draftSearch || search) && (
                <Button
                  variant="default"
                  onClick={() => {
                    setDraftSearch("");
                    changeInput({ search: "", page: 1 });
                  }}
                >
                  Clear search
                </Button>
              )}
            </Group>
          </form>
          <Group justify="space-between">
            {access.canViewAll ? (
              <Switch
                label="Include media from all users"
                checked={includeFromAllUsers}
                onChange={(event) => {
                  changeInput({ includeFromAllUsers: event.currentTarget.checked, page: 1 });
                }}
              />
            ) : (
              <Text size="sm">Showing your media only.</Text>
            )}
            <NativeSelect
              label="Images per page"
              value={String(pageSize)}
              data={[...new Set(["10", "20", "50", "100", String(pageSize)])]}
              onChange={(event) => {
                const value = Number(event.currentTarget.value);
                if (![10, 20, 50, 100].includes(value)) return;
                changeInput({ pageSize: value, page: 1 });
              }}
            />
          </Group>
        </Stack>
      }
      footer={
        query.isSuccess &&
        page <= totalPages && (
          <Group justify="space-between">
            <Text component="output" size="sm" aria-live="polite">
              {query.data.totalCount} image(s)
            </Text>
            {totalPages > 1 && (
              <Pagination
                total={totalPages}
                value={page}
                onChange={(next) => {
                  changeInput({ page: next });
                }}
                getControlProps={(control) => ({ "aria-label": `${control} page` })}
              />
            )}
          </Group>
        )
      }
    >
      {access.canUpload && <SourceMediaUploadForm bindings={bindings} />}
      {query.isPending ? (
        <Stack aria-label="Loading media" aria-busy="true">
          <Skeleton height={160} animate={false} />
          <Skeleton height={40} animate={false} />
        </Stack>
      ) : query.isError ? (
        <Alert title="Could not load media" color="red">
          <Stack gap="sm">
            <Text size="sm">Your media could not be loaded. Check your session and try again.</Text>
            <Button variant="default" onClick={() => void query.refetch()} loading={query.isFetching}>
              Retry loading media
            </Button>
          </Stack>
        </Alert>
      ) : page > totalPages ? (
        <Text component="output">Updating the current page.</Text>
      ) : query.data.items.length === 0 ? (
        <Stack align="center" py="lg">
          <Title order={2} size="h4">
            {search ? "No matching media" : "No media found"}
          </Title>
          <Text ta="center">
            {search
              ? "Try another filename or clear the search."
              : "Uploaded images will appear here when media upload is available."}
          </Text>
        </Stack>
      ) : (
        <SourceMediaGallery
          items={query.data.items}
          principal={principal}
          bindings={bindings}
          readOnly={readOnly}
          includeFromAllUsers={input.includeFromAllUsers}
          view={view}
          selectedId={selectedId}
          byteUnitSystem={byteUnitSystem}
          renderCreator={renderCreator}
          onSelect={
            onSelect
              ? (selection) => {
                  setSelectedId(selection.id);
                  onSelect(selection);
                }
              : undefined
          }
        />
      )}
    </MediaManagementView>
  );
}
