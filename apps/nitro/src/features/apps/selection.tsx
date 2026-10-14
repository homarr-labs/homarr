import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Alert, Skeleton, Stack } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useI18n } from "@homarr/translation/standalone/client";

import type { SourceAppFormComponent } from "../../source-ui/apps/contracts";
import { SourceAppSelection } from "../../source-ui/apps/selection";
import { AppForm } from "./app-form";
import { useAppsFeature } from "./context";
import type { SelectableApp } from "./context";
import { AppsAccessNotice, AppsRequestError } from "./feedback";

export interface AppSelectionProps {
  form: SourceAppFormComponent | null;
  onSelect: (apps: readonly SelectableApp[]) => void;
  multiple?: boolean;
  withCreate?: boolean;
}

export function AppSelection({ form, onSelect, multiple = false, withCreate = true }: AppSelectionProps) {
  const feature = useAppsFeature();
  const queryClient = useQueryClient();
  const t = useI18n();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const readOwner = useId();
  const [selectionRead, setSelectionRead] = useState<{ version: number; createdApps: readonly SelectableApp[] }>({
    version: 0,
    createdApps: [],
  });
  const [creating, setCreating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [completion, setCompletion] = useState<{ app: SelectableApp; owner: object } | null>(null);
  const completed = useRef<object | null>(null);
  const mountedOwner = useRef<{ binding: object } | null>(null);
  const scope = JSON.stringify(
    feature.principal.kind === "authenticated"
      ? [feature.principal.userId, feature.principal.authorityRevision]
      : ["anonymous"],
  );
  const selectionOwner = useMemo(
    () => ({ scope, client: feature.client.app, queryClient, multiple, readOnly: feature.readOnly }),
    [scope, feature.client.app, queryClient, multiple, feature.readOnly],
  );
  useLayoutEffect(() => {
    const owner = { binding: selectionOwner };
    mountedOwner.current = owner;
    setIsCreating(false);
    setCompletion(null);
    return () => {
      if (mountedOwner.current === owner) mountedOwner.current = null;
    };
  }, [selectionOwner]);
  const baseKey = useMemo(() => feature.query.app.selectable.queryKey(), [feature.query]);
  const selectionKey = useMemo(
    () => [...baseKey, readOwner, selectionRead.version],
    [baseKey, readOwner, selectionRead.version],
  );
  const apps = useQuery(
    feature.query.app.selectable.queryOptions({
      queryKey: selectionKey,
      enabled: feature.principal.kind === "authenticated",
      retry: false,
      placeholderData: (previous) => previous,
    }),
  );
  const authoritative = apps.isSuccess && !apps.isPlaceholderData && !apps.isFetching;
  if (authoritative && selectionRead.createdApps.length > 0) setSelectionRead({ ...selectionRead, createdApps: [] });
  const createdApps = authoritative ? [] : selectionRead.createdApps;
  const selectable = [
    ...(apps.data ?? []),
    ...createdApps.filter((created) => !apps.data?.some((app) => app.id === created.id)),
  ];
  const query = search.trim().toLowerCase();
  const filtered = selectable
    .filter((app) => app.name.toLowerCase().includes(query) || app.href?.toLowerCase().includes(query))
    .toSorted((left, right) => left.name.localeCompare(right.name));
  const selected = selectable.filter((app) => selectedIds.includes(app.id));
  const readCurrentApps = useCallback(() => {
    if (mountedOwner.current?.binding !== selectionOwner || !authoritative) return undefined;
    const current = queryClient.getQueryState<SelectableApp[]>(selectionKey);
    if (current?.status !== "success" || current.fetchStatus !== "idle" || current.isInvalidated) return undefined;
    return current.data;
  }, [selectionOwner, authoritative, queryClient, selectionKey]);
  useLayoutEffect(() => {
    if (!completion || completion.owner !== mountedOwner.current || completed.current === completion) return;
    const currentApps = readCurrentApps();
    if (!currentApps) return;
    const confirmedApp = currentApps.find((app) => app.id === completion.app.id);
    if (!confirmedApp) return;
    const currentSelected = currentApps.filter((app) => selectedIds.includes(app.id) && app.id !== confirmedApp.id);
    completed.current = completion;
    setCompletion(null);
    if (multiple) onSelect([...currentSelected, confirmedApp]);
    else onSelect([confirmedApp]);
  }, [completion, selectionOwner, readCurrentApps, selectedIds, multiple, onSelect]);
  const confirmedMissing =
    authoritative && completion !== null && !apps.data.some((app) => app.id === completion.app.id);
  const selectionUnavailable =
    apps.isError || apps.isPending || apps.isPlaceholderData || apps.isFetching || confirmedMissing;
  const choose = (app: SelectableApp) => {
    if (selectionUnavailable) return;
    const currentApp = readCurrentApps()?.find((current) => current.id === app.id);
    if (!currentApp) return;
    if (!multiple) {
      setCompletion(null);
      onSelect([currentApp]);
      return;
    }
    setSelectedIds((current) =>
      current.includes(app.id) ? current.filter((id) => id !== app.id) : [...current, app.id],
    );
  };
  if (feature.principal.kind === "anonymous") return <AppsAccessNotice action="select" />;
  let feedback;
  if (apps.isError)
    feedback = (
      <AppsRequestError
        error={apps.error}
        retry={() => {
          void apps.refetch();
        }}
      />
    );
  else if (apps.isPending)
    feedback = (
      <Stack aria-busy="true">
        <Skeleton height={64} />
        <Skeleton height={64} />
      </Stack>
    );
  else if (confirmedMissing) feedback = <Alert>{feature.unavailable.resource}</Alert>;
  let submitAndCreateAnother;
  if (multiple) submitAndCreateAnother = t("app.action.select.createAnother");
  return (
    <SourceAppSelection
      search={search}
      onSearch={setSearch}
      apps={filtered}
      selectedIds={selectedIds}
      selectedCount={selected.length}
      multiple={multiple}
      canCreate={withCreate && feature.canCreate}
      readOnly={feature.readOnly}
      creating={creating}
      pending={isCreating}
      selectionUnavailable={selectionUnavailable}
      feedback={feedback}
      form={
        creating && (
          <AppForm
            key={multiple ? "multiple" : "single"}
            form={form}
            mode="create"
            showBackToOverview={false}
            onPendingChange={setIsCreating}
            buttonLabels={{ submit: t("app.action.select.createAndAdd"), submitAndCreateAnother }}
            onCreated={(app) => {
              if (mountedOwner.current?.binding !== selectionOwner) throw new Error("App selection owner retired");
              setIsCreating(false);
              setSelectionRead((current) => ({
                version: current.version + 1,
                createdApps: [...current.createdApps, app],
              }));
              setSelectedIds((current) => [...current.filter((id) => id !== app.id), app.id]);
            }}
            onSaved={(app) => {
              const owner = mountedOwner.current;
              if (!owner || owner.binding !== selectionOwner) throw new Error("App selection owner retired");
              setCompletion({ app, owner });
              setCreating(false);
            }}
          />
        )
      }
      onCreate={() => {
        if (!feature.readOnly && feature.canCreate) setCreating(true);
      }}
      onBack={() => {
        if (!isCreating) setCreating(false);
      }}
      onSelect={choose}
      onDiscard={() => {
        setSelectedIds([]);
        setCompletion(null);
      }}
      onSubmit={() => {
        if (selectionUnavailable) return;
        const currentSelected = readCurrentApps()?.filter((app) => selectedIds.includes(app.id));
        if (!currentSelected?.length) return;
        setCompletion(null);
        onSelect(currentSelected);
      }}
    />
  );
}

export function BoardAppPlacementUnavailable() {
  const { unavailable } = useAppsFeature();
  return (
    <Alert>
      <output>{unavailable.boardPlacement}</output>
    </Alert>
  );
}
