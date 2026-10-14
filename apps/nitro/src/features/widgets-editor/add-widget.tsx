import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import type { WidgetDefinitionManifest } from "@homarr/widgets/definition-manifest";

import type {
  EditorIntegration,
  EditorPermissions,
  EditorSize,
  EditorState,
  EditorTranslate,
  WidgetDefinition,
  WidgetDraftResult,
  WidgetDraftWriter,
  WidgetEditorBindings,
  WidgetEditorClient,
  WidgetEditorQueryUtils,
  WidgetEditorDomain,
  WidgetEditorChangeOwner,
  WidgetEditorOwnership,
  WidgetKind,
} from "./contracts";
import { WidgetEditor } from "./widget-editor";
import { useWidgetInputActivation } from "./shared-controls";

export interface WidgetDestination {
  sectionId: string;
  label: string;
  columnCount: number;
}

interface CatalogBinding {
  definitionManifest: WidgetDefinitionManifest;
  domain: WidgetEditorDomain;
  boardId: string;
  client: WidgetEditorClient;
  queryUtils: WidgetEditorQueryUtils;
}

interface CatalogLease extends CatalogBinding, WidgetEditorChangeOwner {
  active: boolean;
  phase: "pending" | "ready" | "error";
  attempt: number;
  hostOwner: WidgetEditorChangeOwner;
}

type CatalogState =
  | { status: "idle" }
  | { status: "pending"; lease: CatalogLease }
  | {
      status: "ready";
      lease: CatalogLease;
      data: Awaited<ReturnType<WidgetDefinitionManifest["loadAllWidgetDefinitions"]>>;
    }
  | { status: "error"; lease: CatalogLease; error: unknown };

interface SelectionOwner extends WidgetEditorChangeOwner {
  active: boolean;
  definitionManifest: WidgetDefinitionManifest;
  domain: WidgetEditorDomain;
}

function hasSameCatalogBinding(left: CatalogBinding, right: CatalogBinding) {
  return (
    left.definitionManifest === right.definitionManifest &&
    left.domain === right.domain &&
    left.boardId === right.boardId &&
    left.client === right.client &&
    left.queryUtils === right.queryUtils
  );
}

export function AddWidget(
  props: WidgetEditorOwnership & {
    opened: boolean;
    boardId: string;
    destinations: readonly WidgetDestination[];
    permissions: EditorPermissions;
    client: WidgetEditorClient;
    queryUtils: WidgetEditorQueryUtils;
    domain: WidgetEditorDomain;
    definitionManifest: WidgetDefinitionManifest;
    bindings: WidgetEditorBindings;
    draftWriter?: WidgetDraftWriter;
    byteUnitSystem: "binary" | "decimal";
    t: EditorTranslate;
    onClose(): void;
    onStaged(result: Extract<WidgetDraftResult, { kind: "staged" }>): void;
  },
) {
  const { domain, definitionManifest, boardId, client, queryUtils, isCurrentOwner, captureChangeOwner, t } = props;
  const [catalogState, setCatalogState] = useState<CatalogState>({ status: "idle" });
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const catalogLoad = useRef<CatalogLease | null>(null);
  const catalogFailure = useRef<CatalogLease | null>(null);
  const [search, setSearch] = useState("");
  const [sectionId, setSectionId] = useState<string | null>(props.destinations[0]?.sectionId ?? null);
  const [selection, setSelection] = useState<{
    kind: WidgetKind;
    definition: WidgetDefinition;
    initialValue: EditorState;
    integrationData: EditorIntegration[];
    initialSize: EditorSize;
    sectionId: string;
    maximumSize: EditorSize;
    origin: SelectionOwner;
  } | null>(null);
  const [loadingKind, setLoadingKind] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectionLock = useRef(false);
  const closing = useRef(false);
  const operation = useRef<SelectionOwner | null>(null);
  const current = useRef<{
    props: typeof props;
    sectionId: string | null;
    columnCount: number | null;
    catalogAttempt: number;
  } | null>(null);
  const destination =
    props.destinations.find((candidate) => candidate.sectionId === sectionId) ?? props.destinations[0];
  const catalogEligible = props.opened && props.permissions.canModifyBoard && !closing.current && isCurrentOwner();
  const {
    owner: pickerOwner,
    hostOwner: initiatorOwner,
    retire: retirePickerOwner,
  } = useWidgetInputActivation({
    binding: {
      type: "picker",
      boardId: props.boardId,
      client: props.client,
      queryUtils: props.queryUtils,
      sectionId: destination?.sectionId ?? null,
      columnCount: destination?.columnCount ?? null,
    },
    isCurrentOwner: props.isCurrentOwner,
    captureChangeOwner: props.captureChangeOwner,
    canChange: () =>
      props.opened &&
      props.permissions.canModifyBoard &&
      selection === null &&
      !selectionLock.current &&
      !closing.current,
  });
  useLayoutEffect(() => {
    current.current = {
      props,
      sectionId: destination?.sectionId ?? null,
      columnCount: destination?.columnCount ?? null,
      catalogAttempt,
    };
    if (!props.opened) closing.current = false;
    const previous = catalogLoad.current;
    if (previous && !previous.isCurrent() && catalogLoad.current === previous) {
      previous.active = false;
      catalogLoad.current = null;
      if (
        previous.attempt === catalogAttempt &&
        props.opened &&
        props.permissions.canModifyBoard &&
        !closing.current &&
        props.isCurrentOwner()
      ) {
        const hostOwner = props.captureChangeOwner();
        if (
          hostOwner.isCurrent() &&
          props.opened &&
          props.permissions.canModifyBoard &&
          !closing.current &&
          props.isCurrentOwner()
        ) {
          setCatalogAttempt((attempt) => attempt + 1);
        }
      }
    }
    const failure = catalogFailure.current;
    if (failure && !failure.isCurrent()) failure.active = false;
    if (operation.current && !operation.current.isCurrent()) {
      retirePickerOwner();
      operation.current.active = false;
      operation.current = null;
      selectionLock.current = false;
      if (loadingKind !== null) setLoadingKind(null);
      if (error !== null) setError(null);
      if (selection) setSelection(null);
    }
  });
  useLayoutEffect(
    () => () => {
      retirePickerOwner();
      if (operation.current) operation.current.active = false;
      if (catalogLoad.current) catalogLoad.current.active = false;
      if (catalogFailure.current) catalogFailure.current.active = false;
      catalogLoad.current = null;
      catalogFailure.current = null;
      current.current = null;
    },
    [retirePickerOwner],
  );
  useEffect(() => {
    if (!catalogEligible) return;
    const binding: CatalogBinding = { definitionManifest, domain, boardId, client, queryUtils };
    const attached = catalogLoad.current;
    if (
      attached &&
      (attached.phase === "pending" || attached.phase === "ready") &&
      attached.attempt === catalogAttempt &&
      hasSameCatalogBinding(attached, binding) &&
      attached.isCurrent()
    )
      return;
    const failure = catalogFailure.current;
    if (failure && failure.attempt === catalogAttempt && hasSameCatalogBinding(failure, binding)) return;
    const live = current.current;
    if (
      !live ||
      !hasSameCatalogBinding(live.props, binding) ||
      !live.props.opened ||
      !live.props.permissions.canModifyBoard ||
      closing.current ||
      !live.props.isCurrentOwner()
    )
      return;
    const hostOwner = live.props.captureChangeOwner();
    if (!hostOwner.isCurrent() || !live.props.isCurrentOwner() || closing.current || current.current !== live) return;
    const lease: CatalogLease = {
      ...binding,
      active: true,
      phase: "pending",
      attempt: catalogAttempt,
      hostOwner,
      isCurrent: () => {
        const committed = current.current;
        const admitted =
          lease.active &&
          (catalogLoad.current === lease || catalogFailure.current === lease) &&
          committed !== null &&
          committed.catalogAttempt === lease.attempt &&
          hasSameCatalogBinding(lease, committed.props) &&
          committed.props.opened &&
          committed.props.permissions.canModifyBoard &&
          !closing.current &&
          lease.hostOwner.isCurrent() &&
          committed.props.isCurrentOwner();
        if (!admitted) lease.active = false;
        return admitted;
      },
    };
    catalogLoad.current = lease;
    if (!lease.isCurrent()) {
      catalogLoad.current = null;
      return;
    }
    if (failure) failure.active = false;
    catalogFailure.current = null;
    setCatalogState({ status: "pending", lease });
    const load = async () => {
      try {
        if (!lease.isCurrent()) return;
        if (domain.loadWidgetDefinition !== definitionManifest.loadWidgetDefinition) {
          throw new Error("Widget editor domain does not match its definition manifest");
        }
        const data = await definitionManifest.loadAllWidgetDefinitions();
        if (!lease.isCurrent()) return;
        lease.phase = "ready";
        setCatalogState({ status: "ready", lease, data });
      } catch (error: unknown) {
        if (!lease.isCurrent()) return;
        lease.phase = "error";
        catalogLoad.current = null;
        catalogFailure.current = lease;
        setCatalogState({ status: "error", lease, error });
      }
    };
    void load();
    return () => {
      if (catalogLoad.current !== lease || lease.isCurrent()) return;
      lease.active = false;
      catalogLoad.current = null;
    };
  }, [
    definitionManifest,
    domain,
    boardId,
    client,
    queryUtils,
    isCurrentOwner,
    captureChangeOwner,
    props.opened,
    props.permissions.canModifyBoard,
    catalogEligible,
    catalogAttempt,
  ]);
  const integrations = useQuery(
    props.queryUtils.integration.all.queryOptions({
      input: undefined,
      enabled: props.opened && props.permissions.canModifyBoard,
      retry: false,
    }),
  );
  const settings = useQuery(
    props.queryUtils.widget.options.getWidgetOptionSettings.queryOptions({
      input: undefined,
      enabled: props.opened,
      retry: false,
    }),
  );
  const customWidgets = useQuery(
    props.queryUtils.customWidget.available.queryOptions({
      input: { boardId: props.boardId },
      enabled: props.opened && props.permissions.isAdmin && props.permissions.canModifyBoard,
      retry: false,
    }),
  );
  const availableKinds = new Set(
    (integrations.data ?? []).filter(({ permissions }) => permissions.hasUseAccess).map(({ kind }) => kind),
  );
  const query = search.trim().toLowerCase();
  const catalogVisible =
    catalogState.status !== "idle" &&
    catalogEligible &&
    catalogState.lease.attempt === catalogAttempt &&
    hasSameCatalogBinding(catalogState.lease, props) &&
    catalogState.lease.isCurrent();
  const catalogPending = catalogVisible && catalogState.status === "pending";
  const catalogIsError = catalogVisible && catalogState.status === "error";
  const catalogReady =
    catalogVisible &&
    catalogState.status === "ready" &&
    domain.loadWidgetDefinition === definitionManifest.loadWidgetDefinition;
  let catalogData: Awaited<ReturnType<WidgetDefinitionManifest["loadAllWidgetDefinitions"]>> | undefined;
  let catalogErrorMessage: string | null = null;
  if (catalogReady && catalogState.status === "ready") catalogData = catalogState.data;
  if (catalogIsError && catalogState.status === "error" && catalogState.error instanceof Error)
    catalogErrorMessage = catalogState.error.message;
  const catalogHeld = !catalogReady && !catalogPending && !catalogIsError;
  const activeSelection =
    selection &&
    catalogReady &&
    selection.origin.definitionManifest === definitionManifest &&
    selection.origin.domain === domain &&
    selection.origin.isCurrent()
      ? selection
      : null;
  let activeLoadingKind: string | null = null;
  let activeError: string | null = null;
  if (catalogReady && operation.current?.isCurrent()) {
    activeLoadingKind = loadingKind;
    activeError = error;
  }
  const filteredKinds = domain.widgetKinds
    .filter((kind) => kind !== "customApi")
    .filter((kind) => {
      const definitionView: WidgetDefinition | undefined = catalogData?.get(kind);
      return (
        domain.widgetName(kind).toLowerCase().includes(query) ||
        (definitionView?.supportedIntegrations ?? []).some((integration) =>
          domain.integrationName(integration).toLowerCase().includes(query),
        )
      );
    })
    .toSorted((left, right) =>
      left === "app" ? -1 : right === "app" ? 1 : domain.widgetName(left).localeCompare(domain.widgetName(right)),
    );
  const choose = async (kind: WidgetKind, customId?: string) => {
    if (!catalogReady || catalogState.status !== "ready" || !catalogState.lease.isCurrent()) return;
    const catalogOwner = catalogState.lease;
    if (!pickerOwner.isCurrent() || !initiatorOwner.isCurrent() || !destination || !settings.data) return;
    if (kind === "customApi" && !props.permissions.isAdmin) return;
    if (operation.current) operation.current.active = false;
    const origin: SelectionOwner = {
      active: true,
      definitionManifest,
      domain,
      isCurrent: () => {
        const live = current.current;
        const admitted =
          origin.active &&
          operation.current === origin &&
          live !== null &&
          live.props.opened &&
          !closing.current &&
          live.props.permissions.canModifyBoard &&
          (kind !== "customApi" || live.props.permissions.isAdmin) &&
          live.props.boardId === props.boardId &&
          live.props.client === props.client &&
          live.props.queryUtils === props.queryUtils &&
          live.props.definitionManifest === origin.definitionManifest &&
          live.props.domain === origin.domain &&
          live.props.domain.loadWidgetDefinition === origin.definitionManifest.loadWidgetDefinition &&
          live.sectionId === destination.sectionId &&
          live.columnCount === destination.columnCount &&
          initiatorOwner.isCurrent() &&
          catalogOwner.isCurrent() &&
          live.props.isCurrentOwner();
        if (!admitted) origin.active = false;
        return admitted;
      },
    };
    operation.current = origin;
    if (!origin.isCurrent()) return;
    retirePickerOwner();
    selectionLock.current = true;
    setLoadingKind(customId ?? kind);
    setError(null);
    try {
      const definition = await origin.definitionManifest.loadWidgetDefinition(kind);
      if (!origin.isCurrent()) return;
      const definitionView: WidgetDefinition = definition;
      const supported = definitionView.supportedIntegrations ?? [];
      const current =
        "supportedIntegrations" in definition ? (integrations.data ?? (await integrations.refetch()).data) : [];
      if (!origin.isCurrent()) return;
      if (!current) {
        setError(t("common.notification.update.error"));
        return;
      }
      let matching: EditorIntegration[] = current.filter(
        (integration) => supported.includes(integration.kind) && integration.permissions.hasUseAccess,
      );
      const maximum = definitionView.maxIntegrations ?? Infinity;
      if (
        "supportedIntegrations" in definition &&
        definitionView.integrationsRequired !== false &&
        matching.length === 0
      ) {
        if (!props.permissions.canCreateIntegration || !props.bindings.onCreateIntegration) {
          setError(t("item.create.missingIntegration.noPermission"));
          return;
        }
        retirePickerOwner();
        const created = await props.bindings.onCreateIntegration(
          supported.filter((integration) => integration !== "mock"),
        );
        if (!origin.isCurrent()) return;
        if (!created) return;
        if (!supported.includes(created.kind) || !created.permissions?.hasUseAccess) {
          setError(t("item.create.missingIntegration.noPermission"));
          return;
        }
        matching = [created];
      }
      const options = domain.reduceWidgetOptionsWithDefinition(definition, settings.data.server.board);
      if (customId) {
        const custom = customWidgets.data?.find(({ id }) => id === customId);
        if (!custom || custom.migrationRequired) {
          setError(t("widget.customApi.picker.migrationRequired"));
          return;
        }
        options.definitionId = custom.id;
        options.configuration = custom.defaultOptions;
        options.configurationVersion = custom.updatedAt.getTime();
      }
      const initialSize = domain.widgetDefaultSizes[kind] ?? { width: 1, height: 1 };
      if (!origin.isCurrent()) return;
      retirePickerOwner();
      setSelection({
        kind,
        definition,
        initialValue: {
          options,
          integrationIds: matching.slice(0, maximum).map(({ id }) => id),
          advancedOptions: domain.itemAdvancedOptionsSchema.parse({}),
        },
        integrationData: matching,
        initialSize,
        sectionId: destination.sectionId,
        maximumSize: { width: Math.max(1, destination.columnCount), height: 64 },
        origin,
      });
    } catch {
      if (origin.isCurrent()) setError(t("common.notification.update.error"));
    } finally {
      if (operation.current === origin && origin.isCurrent()) {
        selectionLock.current = false;
        setLoadingKind(null);
      }
    }
  };
  return (
    <>
      <Modal
        opened={props.opened && activeSelection === null}
        onClose={() => {
          if (selectionLock.current || !pickerOwner.isCurrent()) return;
          retirePickerOwner();
          if (operation.current) operation.current.active = false;
          closing.current = true;
          props.onClose();
        }}
        title={t("item.create.title")}
        size="75rem"
        closeOnClickOutside={false}
        closeButtonProps={{ disabled: activeLoadingKind !== null }}
      >
        <Stack gap="md">
          <Group align="flex-end">
            <TextInput
              style={{ flex: "1 1 240px" }}
              label={t("item.create.search")}
              value={search}
              onChange={(event) => {
                if (pickerOwner.isCurrent()) setSearch(event.currentTarget.value);
              }}
              data-autofocus
            />
            <Select
              label={t("item.create.destination.label")}
              value={destination?.sectionId ?? null}
              data={props.destinations.map((entry) => ({ value: entry.sectionId, label: entry.label }))}
              onChange={(next) => {
                if (!pickerOwner.isCurrent()) return;
                if (next === sectionId) return;
                retirePickerOwner();
                if (operation.current) operation.current.active = false;
                setSectionId(next);
              }}
              disabled={activeLoadingKind !== null}
            />
          </Group>
          {!props.permissions.canModifyBoard && (
            <Alert color="yellow">{t("nitro.widgetEditor.modifyPermissionRequired")}</Alert>
          )}
          {!props.draftWriter && <Alert color="yellow">{t("nitro.widgetEditor.draftWriterUnavailable")}</Alert>}
          {activeError && (
            <Alert color="red" role="alert">
              {activeError}
            </Alert>
          )}
          {(catalogIsError || catalogHeld || settings.isError || integrations.isError) && (
            <Alert color="red" role="alert">
              <Stack gap="xs">
                <Text>{t("common.notification.update.error")}</Text>
                {catalogErrorMessage && <Text size="sm">{catalogErrorMessage}</Text>}
                {catalogHeld && <Text size="sm">Widget definition catalog owner unavailable</Text>}
                <Button
                  variant="subtle"
                  onClick={() => {
                    if (!pickerOwner.isCurrent()) return;
                    const live = current.current;
                    if (
                      !live ||
                      !catalogEligible ||
                      !hasSameCatalogBinding(live.props, props) ||
                      !live.props.opened ||
                      !live.props.permissions.canModifyBoard ||
                      closing.current ||
                      !live.props.isCurrentOwner()
                    )
                      return;
                    const hostOwner = live.props.captureChangeOwner();
                    if (!hostOwner.isCurrent() || !live.props.isCurrentOwner() || closing.current) return;
                    const pending = catalogLoad.current;
                    const pendingCurrent = pending?.phase === "pending" && pending.isCurrent();
                    if ((catalogIsError || catalogHeld) && !pendingCurrent) {
                      if (catalogLoad.current) catalogLoad.current.active = false;
                      if (catalogFailure.current) catalogFailure.current.active = false;
                      catalogLoad.current = null;
                      setCatalogAttempt((attempt) => attempt + 1);
                    }
                    if (hostOwner.isCurrent() && live.props.isCurrentOwner()) void settings.refetch();
                    if (hostOwner.isCurrent() && live.props.isCurrentOwner()) void integrations.refetch();
                  }}
                >
                  {t("common.action.tryAgain")}
                </Button>
              </Stack>
            </Alert>
          )}
          {(catalogPending || (catalogReady && settings.isPending)) && (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
              {domain.widgetKinds.slice(0, 6).map((kind) => (
                <Skeleton key={kind} h={140} />
              ))}
            </SimpleGrid>
          )}
          {catalogReady && !settings.isPending && (
            <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }}>
              {filteredKinds.map((kind) => {
                const definitionView: WidgetDefinition | undefined = catalogData?.get(kind);
                const supported = (definitionView?.supportedIntegrations ?? []).filter(
                  (integration) => integration !== "mock",
                );
                const connected = supported.some((integration) => availableKinds.has(integration));
                return (
                  <Button
                    key={kind}
                    variant="default"
                    h="auto"
                    p="md"
                    styles={{ label: { whiteSpace: "normal", width: "100%" } }}
                    disabled={
                      !props.permissions.canModifyBoard || activeLoadingKind !== null || !destination || !settings.data
                    }
                    loading={activeLoadingKind === kind}
                    onClick={() => void choose(kind)}
                  >
                    <Stack gap="xs" w="100%">
                      <Group justify="space-between">
                        {props.bindings.widgetIcon?.(kind)}
                        <Text fw={600}>{domain.widgetName(kind)}</Text>
                      </Group>
                      <Text size="sm" c="dimmed" ta="start">
                        {domain.widgetDescription(kind)}
                      </Text>
                      {supported.length > 0 && (
                        <Group gap={4}>
                          {supported.map((integration) => (
                            <Badge
                              key={integration}
                              size="xs"
                              variant="light"
                              color={connected && availableKinds.has(integration) ? "green" : "gray"}
                            >
                              {domain.integrationName(integration)}
                            </Badge>
                          ))}
                        </Group>
                      )}
                    </Stack>
                  </Button>
                );
              })}
            </SimpleGrid>
          )}
          {props.permissions.isAdmin && (
            <Box>
              <Text fw={600} mb="sm">
                {t("widget.customApi.picker.group")}
              </Text>
              {customWidgets.isPending && <Skeleton h={100} />}
              {customWidgets.isError && (
                <Alert color="red" role="alert">
                  <Text>{t("common.notification.update.error")}</Text>
                  <Button
                    variant="subtle"
                    onClick={() => {
                      if (pickerOwner.isCurrent()) void customWidgets.refetch();
                    }}
                  >
                    {t("common.action.tryAgain")}
                  </Button>
                </Alert>
              )}
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                {customWidgets.data
                  ?.filter((custom) => custom.name.toLowerCase().includes(query))
                  .map((custom) => (
                    <Button
                      key={custom.id}
                      variant="default"
                      h="auto"
                      p="md"
                      loading={activeLoadingKind === custom.id}
                      disabled={
                        custom.migrationRequired ||
                        !catalogReady ||
                        activeLoadingKind !== null ||
                        !props.permissions.canModifyBoard ||
                        !destination ||
                        !settings.data
                      }
                      onClick={() => void choose("customApi", custom.id)}
                    >
                      <Stack gap={4}>
                        <Text fw={600}>{custom.name}</Text>
                        <Text size="xs" c="dimmed" style={{ whiteSpace: "normal" }}>
                          {custom.description}
                        </Text>
                        {custom.migrationRequired && (
                          <Badge color="yellow">{t("widget.customApi.picker.migrationRequired")}</Badge>
                        )}
                      </Stack>
                    </Button>
                  ))}
              </SimpleGrid>
            </Box>
          )}
        </Stack>
      </Modal>
      {activeSelection && settings.data && (
        <WidgetEditor
          key={`${activeSelection.kind}:${activeSelection.initialValue.options.definitionId ?? "new"}`}
          {...activeSelection}
          targetSectionId={activeSelection.sectionId}
          opened={props.opened}
          boardId={props.boardId}
          settings={settings.data.server.board}
          client={client}
          queryUtils={props.queryUtils}
          permissions={props.permissions}
          domain={domain}
          bindings={props.bindings}
          draftWriter={props.draftWriter}
          byteUnitSystem={props.byteUnitSystem}
          t={t}
          isCurrentOwner={activeSelection.origin.isCurrent}
          captureChangeOwner={() => activeSelection.origin}
          onClose={() => {
            if (operation.current !== activeSelection.origin || !activeSelection.origin.isCurrent()) return;
            retirePickerOwner();
            operation.current.active = false;
            closing.current = true;
            setSelection(null);
            props.onClose();
          }}
          onStaged={props.onStaged}
        />
      )}
    </>
  );
}
