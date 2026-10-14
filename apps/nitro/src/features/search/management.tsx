import {
  Alert,
  Anchor,
  Badge,
  Button,
  Fieldset,
  Group,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { SearchEngineDetail, SearchEngineValues } from "./client";
import type { SearchBinding, SearchDestination, SearchRuntime, SearchSession } from "./contracts";
import { searchEngineDeletionHold, searchManagementQueryKey, searchQueryKey } from "./contracts";

export type SearchEngineManagementView = { kind: "list" } | { kind: "create" } | { kind: "edit"; id: string };

export function SearchEngineManagement({
  binding,
  session,
  view,
}: {
  binding: SearchBinding;
  session: SearchSession;
  view: SearchEngineManagementView;
}) {
  if (!session.authenticated) return <Alert title="Sign in required">Sign in to manage search engines.</Alert>;
  if (binding.kind === "held") return <Alert title="Search engine management is unavailable">{binding.reason}</Alert>;
  if (binding.runtime.authority.searchEngine.kind === "held")
    return (
      <Alert title="Search engine management is unavailable">{binding.runtime.authority.searchEngine.reason}</Alert>
    );
  return (
    <ManagementContent
      key={`${session.scope}:${view.kind}:${view.kind === "edit" ? view.id : ""}`}
      runtime={binding.runtime}
      session={session}
      view={view}
    />
  );
}

function ManagementContent({
  runtime,
  session,
  view,
}: {
  runtime: SearchRuntime;
  session: SearchSession;
  view: SearchEngineManagementView;
}) {
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const byId = useQuery({
    queryKey: searchManagementQueryKey(session.scope, "searchEngine.byId", view.kind === "edit" ? view.id : undefined),
    queryFn: ({ signal }) => {
      if (view.kind !== "edit") throw new Error("Select a search engine to edit");
      return runtime.client.searchEngine.byId({ id: view.id }, { signal });
    },
    enabled: view.kind === "edit" && session.isCurrent(),
    retry: false,
    refetchOnWindowFocus: false,
  });
  function navigate(destination: SearchDestination) {
    if (!session.isCurrent()) return;
    if (runtime.navigation.kind === "held") {
      setNavigationError(runtime.navigation.reason);
      return;
    }
    void Promise.resolve()
      .then(() => {
        if (runtime.navigation.kind === "ready" && session.isCurrent()) return runtime.navigation.go(destination);
      })
      .catch(() => {
        if (session.isCurrent()) setNavigationError("Could not open the requested page.");
      });
  }
  if (view.kind === "list")
    return (
      <SearchEngineList runtime={runtime} session={session} navigate={navigate} navigationError={navigationError} />
    );
  const canWrite = session.permissions.includes(
    view.kind === "create" ? "search-engine-create" : "search-engine-modify-all",
  );
  if (!canWrite)
    return (
      <Alert title="Permission required">
        You do not have permission to {view.kind === "create" ? "create" : "edit"} search engines.
      </Alert>
    );
  if (view.kind === "edit" && byId.isPending) return <Skeleton height={200} />;
  if (view.kind === "edit" && byId.isError)
    return (
      <Alert color="red" title="Could not load search engine">
        <Button
          disabled={!session.isCurrent()}
          onClick={() => {
            if (session.isCurrent()) void byId.refetch();
          }}
        >
          Retry search engine
        </Button>
      </Alert>
    );
  return (
    <Stack>
      {navigationError && <Alert color="red">{navigationError}</Alert>}
      <SearchEngineEditor
        runtime={runtime}
        session={session}
        initial={view.kind === "edit" ? byId.data : undefined}
        onBack={() => navigate({ path: "/manage/search-engines" })}
      />
    </Stack>
  );
}

function SearchEngineList({
  runtime,
  session,
  navigate,
  navigationError,
}: {
  runtime: SearchRuntime;
  session: SearchSession;
  navigate(destination: SearchDestination): void;
  navigationError: string | null;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  const [debouncedSearch] = useDebouncedValue(search.trim(), 160);
  const input = { search: debouncedSearch, page, pageSize: Number(pageSize) };
  const list = useQuery({
    queryKey: searchManagementQueryKey(session.scope, "searchEngine.getPaginated", input),
    queryFn: ({ signal }) => runtime.client.searchEngine.getPaginated(input, { signal }),
    enabled: session.isCurrent() && debouncedSearch === search.trim(),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const totalPages = Math.ceil((list.data?.totalCount ?? 0) / Number(pageSize));
  useEffect(() => {
    if (list.isSuccess && totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [list.isSuccess, totalPages, page]);
  const canCreate = session.permissions.includes("search-engine-create");
  const canEdit = session.permissions.includes("search-engine-modify-all");
  const canDelete = session.permissions.includes("search-engine-full-all");
  return (
    <Stack>
      <Group justify="space-between">
        <Text component="h1" size="xl" fw={600}>
          Search engines
        </Text>
        {canCreate && (
          <Button onClick={() => navigate({ path: "/manage/search-engines/new" })}>Create search engine</Button>
        )}
      </Group>
      <Group align="end">
        <TextInput
          label="Search engines"
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            setPage(1);
          }}
          style={{ flex: 1 }}
        />
        <Select
          label="Page size"
          value={pageSize}
          data={["10", "25", "50", "100"]}
          allowDeselect={false}
          onChange={(value) => {
            if (value) {
              setPageSize(value);
              setPage(1);
            }
          }}
        />
      </Group>
      {navigationError && <Alert color="red">{navigationError}</Alert>}
      {!session.isCurrent() && <Alert title="Session changed">Reopen this page before continuing.</Alert>}
      {list.isLoading && <Skeleton height={120} />}
      {list.isError && (
        <Alert color="red" title="Could not load search engines">
          <Button
            disabled={!session.isCurrent()}
            onClick={() => {
              if (session.isCurrent()) void list.refetch();
            }}
          >
            Retry engines
          </Button>
        </Alert>
      )}
      {session.isCurrent() && debouncedSearch === search.trim() && list.isSuccess && list.data.items.length === 0 && (
        <Stack>
          <Text>{search.trim() ? "No engines match this query." : "No search engines configured."}</Text>
          {search.trim() && (
            <Button
              variant="light"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
            >
              Clear search
            </Button>
          )}
        </Stack>
      )}
      {session.isCurrent() &&
        debouncedSearch === search.trim() &&
        list.data?.items.map((engine) => {
          const preview =
            engine.type === "generic" && engine.urlTemplate
              ? runtime.helpers.getSafeApplicationUrl(runtime.helpers.buildSearchUrl(engine.urlTemplate, "test"))
              : undefined;
          return (
            <Stack
              key={engine.id}
              gap="xs"
              py="sm"
              style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
            >
              <Group justify="space-between">
                <Text fw={600}>{engine.name}</Text>
                <Badge>{engine.type === "generic" ? "Web" : "Integration"}</Badge>
              </Group>
              <Text size="sm">!{engine.short}</Text>
              {engine.description && <Text>{engine.description}</Text>}
              {preview && (
                <Anchor href={preview} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: "anywhere" }}>
                  {engine.urlTemplate}
                </Anchor>
              )}
              <Group>
                {canEdit && (
                  <Button
                    variant="light"
                    onClick={() => navigate({ path: "/manage/search-engines/edit/$id", id: engine.id })}
                  >
                    Edit {engine.name}
                  </Button>
                )}
                {canDelete && (
                  <Button color="red" variant="subtle" disabled aria-describedby="search-engine-delete-hold">
                    Delete {engine.name}
                  </Button>
                )}
              </Group>
            </Stack>
          );
        })}
      {canDelete && (
        <Text id="search-engine-delete-hold" size="sm">
          {searchEngineDeletionHold}
        </Text>
      )}
      {totalPages > 1 && (
        <Pagination aria-label="Search engine pages" value={page} total={totalPages} onChange={setPage} />
      )}
    </Stack>
  );
}

function SearchEngineEditor({
  runtime,
  session,
  initial,
  onBack,
}: {
  runtime: SearchRuntime;
  session: SearchSession;
  initial?: SearchEngineDetail;
  onBack(): void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [short, setShort] = useState(initial?.short ?? "");
  const [iconUrl, setIconUrl] = useState(initial?.iconUrl ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<"generic" | "fromIntegration">(initial?.type ?? "generic");
  const [urlTemplate, setUrlTemplate] = useState(initial?.urlTemplate ?? "");
  const [integrationId, setIntegrationId] = useState<string | null>(initial?.integrationId ?? null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const queryClient = useQueryClient();
  const nativeSearchEngine = runtime.client.searchEngine;
  const nativeIntegration = runtime.client.integration;
  const integrationAuthority = runtime.authority.integrations;
  const integrations = useQuery({
    queryKey: searchManagementQueryKey(session.scope, "integration.allThatSupportSearch"),
    queryFn: ({ signal }) => nativeIntegration.allThatSupportSearch(undefined, { signal }),
    enabled: session.isCurrent() && type === "fromIntegration" && integrationAuthority.kind === "ready",
    retry: false,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  const save = useMutation({
    mutationFn: async (values: SearchEngineValues) => {
      if (
        !session.isCurrent() ||
        runtime.authority.searchEngine.kind !== "ready" ||
        !session.permissions.includes(initial ? "search-engine-modify-all" : "search-engine-create")
      )
        throw new Error("Permission or session changed");
      const active = new AbortController();
      controller.current = active;
      if (initial) {
        const { short: _short, ...update } = values;
        await nativeSearchEngine.update({ id: initial.id, ...update }, { signal: active.signal });
      } else await nativeSearchEngine.create(values, { signal: active.signal });
      if (!mounted.current || !session.isCurrent()) return;
      setSaved(true);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: searchManagementQueryKey(session.scope, "searchEngine.getPaginated"),
        }),
        queryClient.invalidateQueries({ queryKey: searchQueryKey(session.scope, "searchEngine.catalog") }),
        queryClient.invalidateQueries({ queryKey: searchQueryKey(session.scope, "searchEngine.getSelectable") }),
        queryClient.invalidateQueries({
          queryKey: searchQueryKey(session.scope, "searchEngine.getDefaultSearchEngine"),
        }),
        queryClient.invalidateQueries({ queryKey: searchManagementQueryKey(session.scope, "searchEngine.byId") }),
      ]).catch(() => {
        if (mounted.current && session.isCurrent()) setRefreshFailed(true);
      });
      if (mounted.current && session.isCurrent()) onBack();
    },
    retry: false,
  });
  const disabled = save.isPending || saved || !session.isCurrent();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled || save.isError) return;
        const values =
          type === "generic"
            ? { name, short, iconUrl, description, type, urlTemplate }
            : { name, short, iconUrl, description, type, integrationId: integrationId ?? undefined };
        const parsed = runtime.helpers.searchEngineManageSchema.safeParse(values);
        const errors: Record<string, string> = {};
        if (!parsed.success)
          for (const issue of parsed.error.issues) errors[String(issue.path[0] ?? "form")] = issue.message;
        if (
          type === "fromIntegration" &&
          (!integrationId || !integrations.data?.some((entry) => entry.id === integrationId))
        )
          errors.integrationId = "Select an accessible integration that supports search.";
        setValidationErrors(errors);
        if (parsed.success && Object.keys(errors).length === 0) save.mutate(parsed.data);
      }}
    >
      <Stack>
        <Text component="h1" size="xl" fw={600}>
          {initial ? "Edit search engine" : "Create search engine"}
        </Text>
        <Fieldset disabled={disabled}>
          <Stack>
            <TextInput
              required
              label="Name"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              error={validationErrors.name}
            />
            <TextInput
              required
              label="Bang shortcut"
              description="1 to 8 characters. Cannot be changed after creation."
              disabled={Boolean(initial)}
              value={short}
              onChange={(event) => setShort(event.currentTarget.value)}
              error={validationErrors.short}
            />
            <TextInput
              required
              label="Icon URL"
              value={iconUrl}
              onChange={(event) => setIconUrl(event.currentTarget.value)}
              error={validationErrors.iconUrl}
            />
            <Select
              label="Search engine type"
              value={type}
              allowDeselect={false}
              data={[
                { value: "generic", label: "Web search" },
                { value: "fromIntegration", label: "Integration search" },
              ]}
              onChange={(value) => {
                if (value === "generic" || value === "fromIntegration") setType(value);
              }}
            />
            {type === "generic" ? (
              <TextInput
                required
                label="URL template"
                description="Use an HTTP(S) URL containing %s for the query."
                value={urlTemplate}
                onChange={(event) => setUrlTemplate(event.currentTarget.value)}
                error={validationErrors.urlTemplate}
              />
            ) : (
              <Stack gap="xs">
                {integrationAuthority.kind === "held" && <Alert>{integrationAuthority.reason}</Alert>}
                {integrations.isError && (
                  <Alert color="red">
                    <Button
                      variant="subtle"
                      disabled={!session.isCurrent() || integrationAuthority.kind !== "ready"}
                      onClick={() => {
                        if (session.isCurrent() && integrationAuthority.kind === "ready") void integrations.refetch();
                      }}
                    >
                      Retry integration choices
                    </Button>
                  </Alert>
                )}
                <Select
                  required
                  label="Integration"
                  value={integrationId}
                  data={(integrations.data ?? []).map((entry) => ({ value: entry.id, label: entry.name }))}
                  onChange={setIntegrationId}
                  searchable
                  disabled={!integrations.isSuccess || integrationAuthority.kind !== "ready"}
                  error={validationErrors.integrationId}
                />
              </Stack>
            )}
            <Textarea
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
              error={validationErrors.description}
            />
          </Stack>
        </Fieldset>
        {save.isError && (
          <Alert color="red" title="Save outcome could not be confirmed">
            Check the overview before retrying. The server may already have saved this engine.
          </Alert>
        )}
        {saved && (
          <Alert color="green" title="Search engine saved">
            The server confirmed the change.
          </Alert>
        )}
        {refreshFailed && (
          <Alert title="Overview needs refreshing">
            The engine was saved, but cached results could not be refreshed.
          </Alert>
        )}
        <Group justify="end">
          <Button variant="default" disabled={save.isPending} onClick={onBack}>
            {saved || save.isError ? "Back to overview" : "Cancel"}
          </Button>
          <Button
            type="submit"
            loading={save.isPending}
            disabled={
              disabled ||
              save.isError ||
              (type === "fromIntegration" && (!integrations.isSuccess || integrationAuthority.kind !== "ready"))
            }
          >
            {initial ? "Save changes" : "Create engine"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
