import { Suspense, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { Box, Text } from "@mantine/core";
import type { CardProps } from "@mantine/core";
import { hashKey, QueryErrorResetBoundary, useQueryClient, useQueryErrorResetBoundary } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import type { z } from "zod";

import type { WidgetKind } from "@homarr/definitions";
import { getWidgetName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import type { BoardItemAdvancedOptions } from "@homarr/validation/shared";
import { createWidgetRuntimeState, supportsAdvancedFocus } from "@homarr/widgets/definition";
import type {
  WidgetComponentProps,
  WidgetDataStatus,
  WidgetDefinition,
  WidgetOptionsSettings,
  WidgetRuntimeRef,
} from "@homarr/widgets/definition";
import { NoIntegrationSelectedError } from "@homarr/widgets/errors/classes";
import { reduceWidgetOptionsWithDefinition } from "@homarr/widgets/definition-manifest";
import type { WidgetDefinitionManifest } from "@homarr/widgets/definition-manifest";
import { WidgetCardShell, WidgetTitleBadge } from "@homarr/widgets/widget-card-shell";

import { WidgetBoundary } from "./boundary";
import { WidgetQueryScopeContext } from "./context";
import { useGeneratedWidgetScope } from "./generated-context";
import { NativeWidgetError } from "./error";

interface WidgetFrameProps {
  advancedOptions: BoardItemAdvancedOptions;
  opacity: number;
  radius: CardProps["radius"];
  canViewLogs: boolean;
}

export type NativeWidgetHostProps<TKind extends WidgetKind> = WidgetComponentProps<TKind> &
  WidgetFrameProps & {
    kind: TKind;
    Renderer: ComponentType<WidgetComponentProps<TKind>>;
    definitionManifest: WidgetDefinitionManifest;
    optionSettings: WidgetOptionsSettings["server"]["board"];
    optionSchema: z.ZodType<WidgetComponentProps<TKind>["options"]>;
  };

export function NativeWidgetHost<TKind extends WidgetKind>(props: NativeWidgetHostProps<TKind>) {
  const queryScope = useGeneratedWidgetScope();
  const identity = hashKey([
    queryScope.orpc.key(),
    props.boardId,
    props.itemId,
    props.kind,
    props.options,
    props.integrationIds,
  ]);
  const fallback = useCallback(
    (error: unknown, retry: () => void) => (
      <NativeWidgetError error={error} onRetry={retry} canViewLogs={props.canViewLogs} />
    ),
    [props.canViewLogs],
  );
  return (
    <WidgetCardShell
      kind={props.kind}
      advancedOptions={props.advancedOptions}
      opacity={props.opacity}
      radius={props.radius}
      h="100%"
      w="100%"
      p={0}
      data-grid-item-content
    >
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <WidgetBoundary
            key={identity}
            onReset={async () => {
              reset();
            }}
            fallback={fallback}
          >
            <Suspense fallback={<WidgetHostPending kind={props.kind} />}>
              <ResolvedWidgetHost {...props} />
            </Suspense>
          </WidgetBoundary>
        )}
      </QueryErrorResetBoundary>
      {props.displayMode !== "advanced" && (
        <WidgetTitleBadge advancedOptions={props.advancedOptions} opacity={props.opacity} radius={props.radius} />
      )}
    </WidgetCardShell>
  );
}

function WidgetHostPending({ kind }: { kind: WidgetKind }) {
  const t = useI18n();
  return (
    <Text c="dimmed" size="sm" p="sm">
      {getWidgetName(kind, t)}
    </Text>
  );
}

function ResolvedWidgetHost<TKind extends WidgetKind>(props: NativeWidgetHostProps<TKind>) {
  const { Renderer } = props;
  const queryScope = useGeneratedWidgetScope();
  const definition = use(props.definitionManifest.loadWidgetDefinition(props.kind));
  const definitionView: WidgetDefinition = definition;
  const options = props.optionSchema.parse(
    reduceWidgetOptionsWithDefinition(definition, props.optionSettings, props.options),
  );
  const queryClient = useQueryClient();
  const queryErrorBoundary = useQueryErrorResetBoundary();
  const internalRuntimeRef = useRef(createWidgetRuntimeState());
  const internalStateRef = useRef<Record<string, unknown> | null>(null);
  const runtimeRef: WidgetRuntimeRef = props.widgetRuntimeRef ?? internalRuntimeRef;
  const queryKeys = useRef(new Map<string, { key: QueryKey; count: number }>());
  const recoveryKeys = useRef(new Map<string, QueryKey>());
  const rendererBoundaryRef = useRef<WidgetBoundary | null>(null);
  const [polling, setPolling] = useState(true);
  const record = useCallback((key: QueryKey) => {
    recoveryKeys.current.set(hashKey(key), key);
  }, []);
  const register = useCallback((key: QueryKey) => {
    const hash = hashKey(key);
    const entry = queryKeys.current.get(hash) ?? { key, count: 0 };
    entry.count += 1;
    queryKeys.current.set(hash, entry);
    recoveryKeys.current.set(hash, key);
    let registered = true;
    return () => {
      if (!registered) return;
      registered = false;
      if (queryKeys.current.get(hash) !== entry) return;
      entry.count -= 1;
      if (entry.count > 0) return;
      queryKeys.current.delete(hash);
      if (rendererBoundaryRef.current?.state.kind !== "failed") recoveryKeys.current.delete(hash);
    };
  }, []);
  const scope = useMemo(() => ({ polling, record, register }), [polling, record, register]);
  const ownedQuery = useCallback((key: QueryKey) => (queryKeys.current.get(hashKey(key))?.count ?? 0) > 0, []);
  const refresh = useCallback(async () => {
    queryScope.assertCurrent();
    await queryClient.refetchQueries({ predicate: (query) => ownedQuery(query.queryKey), type: "active" });
    queryScope.assertCurrent();
  }, [queryClient, queryScope, ownedQuery]);
  const getDataStatus = useCallback((): WidgetDataStatus => {
    queryScope.assertCurrent();
    const queries = queryClient.getQueryCache().findAll({ predicate: (query) => ownedQuery(query.queryKey) });
    const updatedAt = Math.max(0, ...queries.map(({ state }) => state.dataUpdatedAt));
    return {
      updatedAt: updatedAt || null,
      hasError: queries.some(({ state }) => state.status === "error"),
      isRefreshing: queries.some(({ state }) => state.fetchStatus === "fetching"),
    };
  }, [queryClient, queryScope, ownedQuery]);
  const togglePolling = useCallback(() => setPolling((value) => !value), []);
  useEffect(() => {
    const actions = runtimeRef.current.actions;
    if (!actions.refresh) actions.refresh = refresh;
    if (!actions.getDataStatus) actions.getDataStatus = getDataStatus;
    if (!actions.togglePolling) actions.togglePolling = togglePolling;
    return () => {
      if (actions.refresh === refresh) delete actions.refresh;
      if (actions.getDataStatus === getDataStatus) delete actions.getDataStatus;
      if (actions.togglePolling === togglePolling) delete actions.togglePolling;
    };
  }, [runtimeRef, refresh, getDataStatus, togglePolling]);
  const reset = async () => {
    queryScope.assertCurrent();
    const keys = new Set(recoveryKeys.current.keys());
    const recoveryQuery = (key: QueryKey) => keys.has(hashKey(key));
    queryErrorBoundary.reset();
    await queryClient.cancelQueries({ predicate: (query) => recoveryQuery(query.queryKey) });
    queryScope.assertCurrent();
    await queryClient.resetQueries({ predicate: (query) => recoveryQuery(query.queryKey) });
    queryScope.assertCurrent();
    recoveryKeys.current.clear();
  };
  const fallback = useCallback(
    (error: unknown, retry: () => void) => (
      <Box h="100%" w="100%" inert={props.isEditMode}>
        <NativeWidgetError error={error} definition={definition} onRetry={retry} canViewLogs={props.canViewLogs} />
      </Box>
    ),
    [props.isEditMode, props.canViewLogs, definition],
  );
  return (
    <WidgetBoundary ref={rendererBoundaryRef} onReset={reset} fallback={fallback}>
      <WidgetQueryScopeContext.Provider value={scope}>
        <Box h="100%" w="100%" mih={0} inert={props.isEditMode} data-homarr-widget-ready={props.kind}>
          <WidgetIntegrationGuard
            required={
              definitionView.integrationsRequired !== false && Boolean(definitionView.supportedIntegrations?.length)
            }
            integrationIds={props.integrationIds}
          />
          <Renderer
            {...props}
            options={options}
            setOptions={({ newOptions }) => props.setOptions({ newOptions: { ...options, ...newOptions } })}
            widgetRuntimeRef={runtimeRef}
            widgetStateRef={props.widgetStateRef ?? internalStateRef}
            displayMode={props.displayMode === "advanced" && supportsAdvancedFocus(definition) ? "advanced" : "compact"}
          />
        </Box>
      </WidgetQueryScopeContext.Provider>
    </WidgetBoundary>
  );
}

function WidgetIntegrationGuard({
  required,
  integrationIds,
}: {
  required: boolean;
  integrationIds: readonly string[];
}) {
  if (required && integrationIds.length === 0) throw new NoIntegrationSelectedError();
  return null;
}
